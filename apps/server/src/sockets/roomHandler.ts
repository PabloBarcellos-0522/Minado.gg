import type { Server, Socket } from 'socket.io'
import type { RoomManager } from '../rooms/RoomManager.js'
import type { GameManager } from '../game/GameManager.js'
import { DIFFICULTY_CONFIG } from '@minado/shared'

export function setupRoomHandlers(io: Server, socket: Socket, roomManager: RoomManager, gameManager: GameManager): void {
  const getUserId = (sock: Socket): string => (sock as any).userId || sock.id
  const getUsername = (sock: Socket): string => (sock as any).username || 'Jogador'

  socket.on('room:create', (data: {
    name: string
    mode: string
    difficulty: string
    isPrivate: boolean
    password?: string
    maxPlayers: number
    boardConfig?: { rows: number; cols: number; mines: number }
  }) => {
    const config = data.boardConfig || DIFFICULTY_CONFIG[data.difficulty as keyof typeof DIFFICULTY_CONFIG] || DIFFICULTY_CONFIG.medium
    const userId = getUserId(socket)
    console.log(`[room:create] socket=${socket.id} userId=${userId} difficulty=${data.difficulty} name=${data.name}`)

    const room = roomManager.createRoom({
      name: data.name,
      hostId: userId,
      hostSocketId: socket.id,
      hostUsername: getUsername(socket),
      mode: data.mode as any,
      difficulty: data.difficulty as any,
      isPrivate: data.isPrivate,
      password: data.password,
      maxPlayers: data.maxPlayers,
      boardConfig: config,
    })
    console.log(`[room:create] room.id=${room.id} totalRooms=${roomManager.getRoomCount()} socketToRoom size=${(roomManager as any).socketToRoom?.size}`)

    socket.join(room.id)
    socket.emit('room:created', {
      id: room.id,
      name: room.name,
      mode: room.mode,
      difficulty: room.difficulty,
      isPrivate: room.isPrivate,
      maxPlayers: room.maxPlayers,
      boardConfig: room.boardConfig,
      players: room.players,
      status: room.status,
    })

    io.emit('room:list', roomManager.getPublicRooms())
  })

  socket.on('room:join', (data: { roomId: string; username?: string }) => {
    console.log(`[room:join] socket=${socket.id} roomId=${data.roomId} totalRooms=${roomManager.getRoomCount()}`)

    const userId = getUserId(socket)

    // If player is already in a DIFFERENT room, leave it first
    const currentRoom = roomManager.getRoomBySocket(socket.id)
    if (currentRoom && currentRoom.id !== data.roomId) {
      console.log(`[room:join] player ${userId} leaving room ${currentRoom.id} to join ${data.roomId}`)
      socket.leave(currentRoom.id)
      roomManager.removePlayer(currentRoom.id, userId)
      gameManager.removePlayerBoard(currentRoom.id, userId)
      const updatedOld = roomManager.getRoom(currentRoom.id)
      if (updatedOld) {
        io.to(currentRoom.id).emit('room:state', updatedOld)
      }
      io.emit('room:list', roomManager.getPublicRooms())
    }

    const room = roomManager.getRoom(data.roomId)
    if (!room) {
      console.warn(`[room:join] ROOM NOT FOUND: roomId=${data.roomId} socket=${socket.id} userId=${userId} totalRooms=${roomManager.getRoomCount()}`)
      socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Sala não encontrada' })
      return
    }
    console.log(`[room:join] FOUND room.id=${room.id} players=${room.players.length} hostId=${room.hostId}`)

    const username = data.username || getUsername(socket)

    const isAlreadyInRoom = room.players.some((p) => p.id === userId)
    if (isAlreadyInRoom) {
      console.log(`[room:join] player ${userId} already in room ${data.roomId}, re-joining socket room`)
      roomManager.rejoinRoom(data.roomId, userId, socket.id)
      socket.join(data.roomId)

      // If game is active, send game:started BEFORE room:state so the client
      // has the board data ready when it receives the status update.
      if (room.status === 'playing') {
        const gameState = gameManager.getGame(room.id)
        if (gameState) {
          const board = gameManager.getPlayerBoard(room.id, userId)
          socket.emit('game:started', {
            board,
            boardMeta: {
              rows: room.boardConfig.rows,
              cols: room.boardConfig.cols,
              mines: room.boardConfig.mines,
              mode: room.mode,
            },
            gameMode: room.mode,
            players: room.players.map((p) => ({
              id: p.id,
              username: p.username,
              avatarUrl: p.avatarUrl,
              isEligible: true,
              score: gameState.scores.get(p.id)?.score ?? 0,
            })),
          })
        }
      }

      io.to(data.roomId).emit('room:state', room)
      io.emit('room:list', roomManager.getPublicRooms())
      return
    }

    if (room.status !== 'waiting') {
      const removed = roomManager.getRemovedPlayer(userId)
      if (removed) {
        socket.emit('game:removedForInactivity', { reason: 'Você foi removido da partida por inatividade' })
        roomManager.removeRemovedPlayer(userId)
        return
      }
      socket.emit('error', { code: 'ROOM_STARTED', message: 'A partida já começou' })
      return
    }
    if (room.players.length >= room.maxPlayers) {
      socket.emit('error', { code: 'ROOM_FULL', message: 'Sala cheia' })
      return
    }

    const updated = roomManager.addPlayer(data.roomId, { id: userId, username }, socket.id)
    if (!updated) {
      socket.emit('error', { code: 'JOIN_FAILED', message: 'Não foi possível entrar na sala' })
      return
    }

    socket.join(data.roomId)
    io.to(data.roomId).emit('room:state', updated)
    io.to(data.roomId).emit('room:playerJoined', {
      id: userId,
      username,
      score: 0,
      isReady: false,
      isHost: false,
    })
    io.emit('room:list', roomManager.getPublicRooms())
  })

  socket.on('room:leave', () => {
    console.log(`[room:leave] socket=${socket.id}`)
    const room = roomManager.getRoomBySocket(socket.id)
    if (!room) {
      console.log(`[room:leave] no room found for socket ${socket.id}`)
      return
    }

    const userId = getUserId(socket)
    const player = room.players.find((p) => p.id === userId)
    if (!player) return

    // Don't leave if you're the host and the only player — the room would be deleted.
    // Only actual disconnect should clean up a single-player room.
    if (room.hostId === userId && room.players.length <= 1) {
      console.log(`[room:leave] host is alone, ignoring leave (only disconnect should clean up)`)
      return
    }

    const updated = roomManager.removePlayer(room.id, player.id)
    socket.leave(room.id)

    if (updated) {
      io.to(room.id).emit('room:state', updated)
    }
    io.emit('room:list', roomManager.getPublicRooms())
  })

  socket.on('room:ready', (data: { ready: boolean }) => {
    const room = roomManager.getRoomBySocket(socket.id)
    if (!room) return

    const userId = getUserId(socket)
    const player = room.players.find((p) => p.id === userId)
    if (!player) return

    const updated = roomManager.toggleReady(room.id, player.id)
    if (updated) {
      io.to(room.id).emit('room:state', updated)
    }
  })

  socket.on('room:start', async () => {
    const room = roomManager.getRoomBySocket(socket.id)
    if (!room) return

    const userId = getUserId(socket)
    if (room.hostId !== userId) {
      socket.emit('error', { code: 'NOT_HOST', message: 'Apenas o host pode iniciar' })
      return
    }

    const allReady = room.players.length >= 2 && room.players.every((p) => p.isReady)
    if (!allReady) {
      socket.emit('error', { code: 'NOT_ALL_READY', message: 'Aguardando todos ficarem prontos' })
      return
    }

    gameManager.startGame(room.id, room.boardConfig, room.players, room.mode)
    roomManager.startGame(room.id)

    if (room.mode === 'cooperative') {
      const board = gameManager.getBoard(room.id)
      io.to(room.id).emit('game:started', {
        board,
        boardMeta: {
          rows: room.boardConfig.rows,
          cols: room.boardConfig.cols,
          mines: room.boardConfig.mines,
          mode: room.mode,
        },
        players: room.players,
      })
    } else {
      const sockets = await io.in(room.id).fetchSockets()
      for (const s of sockets) {
        const playerId = (s as any).userId || (s as any).id
        const board = gameManager.getPlayerBoard(room.id, playerId)
        if (board) {
          s.emit('game:started', {
            board,
            boardMeta: {
              rows: room.boardConfig.rows,
              cols: room.boardConfig.cols,
              mines: room.boardConfig.mines,
              mode: room.mode,
            },
            players: room.players,
          })
        }
      }
    }
    io.emit('room:list', roomManager.getPublicRooms())
  })

  socket.on('room:list', () => {
    socket.emit('room:list', roomManager.getPublicRooms())
  })

  socket.on('chat:message', (data: { text: string }) => {
    const room = roomManager.getRoomBySocket(socket.id)
    if (!room) return

    io.to(room.id).emit('chat:message', {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        fromId: getUserId(socket),
        from: getUsername(socket),
        text: data.text,
        ts: new Date().toISOString(),
    })
  })
}

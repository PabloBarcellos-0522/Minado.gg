import type { Server, Socket } from 'socket.io'
import type { RoomManager } from '../rooms/RoomManager.js'
import { DIFFICULTY_CONFIG } from '@minado/shared'

export function setupRoomHandlers(io: Server, socket: Socket, roomManager: RoomManager): void {
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

    const room = roomManager.createRoom({
      name: data.name,
      hostId: userId,
      hostSocketId: socket.id,
      mode: data.mode as any,
      difficulty: data.difficulty as any,
      isPrivate: data.isPrivate,
      password: data.password,
      maxPlayers: data.maxPlayers,
      boardConfig: config,
    })

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
    const room = roomManager.getRoom(data.roomId)
    if (!room) {
      socket.emit('error', { code: 'ROOM_NOT_FOUND', message: 'Sala não encontrada' })
      return
    }
    if (room.status !== 'waiting') {
      socket.emit('error', { code: 'ROOM_STARTED', message: 'A partida já começou' })
      return
    }
    if (room.players.length >= room.maxPlayers) {
      socket.emit('error', { code: 'ROOM_FULL', message: 'Sala cheia' })
      return
    }

    const userId = getUserId(socket)
    const username = data.username || getUsername(socket)

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
    const room = roomManager.getRoomBySocket(socket.id)
    if (!room) return

    const userId = getUserId(socket)
    const player = room.players.find((p) => p.id === userId)
    if (!player) return

    const updated = roomManager.removePlayer(room.id, player.id)
    socket.leave(room.id)

    if (updated) {
      io.to(room.id).emit('room:state', updated)
      io.to(room.id).emit('room:playerLeft', { playerId: player.id })
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

  socket.on('room:start', () => {
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

    roomManager.startGame(room.id)
    io.to(room.id).emit('game:started', {
      boardMeta: {
        rows: room.boardConfig.rows,
        cols: room.boardConfig.cols,
        mines: room.boardConfig.mines,
        mode: room.mode,
      },
      players: room.players,
    })
    io.emit('room:list', roomManager.getPublicRooms())
  })

  socket.on('room:list', () => {
    socket.emit('room:list', roomManager.getPublicRooms())
  })
}

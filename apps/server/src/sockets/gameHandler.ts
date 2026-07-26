import type { Server, Socket } from 'socket.io'
import type { RoomManager } from '../rooms/RoomManager.js'
import type { GameManager } from '../game/GameManager.js'
import type { Room } from '@minado/shared'

type RoomWithId = Room & { id: string; mode: string }

function emitToTarget(io: Server, socket: Socket, room: RoomWithId, event: string, data: any) {
  if (room.mode === 'cooperative') {
    io.to(room.id).emit(event, data)
  } else {
    socket.emit(event, data)
  }
}

export function setupGameHandlers(io: Server, socket: Socket, roomManager: RoomManager, gameManager: GameManager): void {
  socket.on('game:reveal', (data: { cellId: string }) => {
    const room = roomManager.getRoomBySocket(socket.id)
    if (!room || room.status !== 'playing') return

    const [rowStr, colStr] = data.cellId.split('-')
    const row = parseInt(rowStr, 10)
    const col = parseInt(colStr, 10)

    let gameState = gameManager.getGame(room.id)
    if (!gameState) {
      gameManager.startGame(room.id, room.boardConfig, room.players, room.mode, room.timeLimit || 0)
      gameState = gameManager.getGame(room.id)!
    }

    const playerId = (socket as any).userId || socket.id
    const result = gameManager.revealCell(room.id, playerId, row, col)

    if (!result.success) {
      socket.emit('error', { code: 'REVEAL_FAILED', message: result.error })
      return
    }

    const emit = (event: string, data: any) => emitToTarget(io, socket, room, event, data)

    if (result.exploded) {
      emit('game:cellRevealed', {
        cellId: data.cellId,
        value: 'mine',
        revealedBy: playerId,
        exploded: true,
      })
      io.to(room.id).emit('game:scoreUpdate', {
        playerId,
        delta: result.delta,
        total: (gameState.scores.get(playerId)?.score || 0),
      })
      return
    }

    if (result.cells.length === 1) {
      emit('game:cellRevealed', {
        cellId: result.cells[0].cellId,
        value: result.cells[0].value,
        revealedBy: playerId,
      })
    } else {
      emit('game:cellRevealed', { batch: result.cells })
    }

    io.to(room.id).emit('game:scoreUpdate', {
      playerId,
      delta: result.delta,
      total: (gameState.scores.get(playerId)?.score || 0),
    })

    if (result.gameEnded) {
      gameManager.removeGame(room.id)
    }
  })

  socket.on('game:flag', (data: { cellId: string }) => {
    const room = roomManager.getRoomBySocket(socket.id)
    if (!room || room.status !== 'playing') return

    if (!gameManager.getGame(room.id)) return

    const [rowStr, colStr] = data.cellId.split('-')
    const row = parseInt(rowStr, 10)
    const col = parseInt(colStr, 10)
    const playerId = (socket as any).userId || socket.id

    const result = gameManager.flagCell(room.id, playerId, row, col)
    if (!result.success) return

    const emit = (event: string, data: any) => emitToTarget(io, socket, room, event, data)

    emit('game:cellFlagged', {
      cellId: result.cellId,
      playerId,
      flagged: result.flagged,
    })
  })

  socket.on('game:ping', (data: { type: string }) => {
    const room = roomManager.getRoomBySocket(socket.id)
    if (!room) return

    io.to(room.id).emit('game:ping', {
      playerId: socket.id,
      type: data.type,
    })
  })

  // chat:message is handled in roomHandler.ts — do not duplicate
}

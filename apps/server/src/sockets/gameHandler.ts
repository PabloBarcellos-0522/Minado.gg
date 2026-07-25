import type { Server, Socket } from 'socket.io'
import type { RoomManager } from '../rooms/RoomManager.js'
import { GameManager } from '../game/GameManager.js'

const gameManager = new GameManager()

export function setupGameHandlers(io: Server, socket: Socket, roomManager: RoomManager): void {
  socket.on('game:reveal', (data: { cellId: string }) => {
    const room = roomManager.getRoomBySocket(socket.id)
    if (!room || room.status !== 'playing') return

    const [rowStr, colStr] = data.cellId.split('-')
    const row = parseInt(rowStr, 10)
    const col = parseInt(colStr, 10)

    let gameState = gameManager.getGame(room.id)
    if (!gameState) {
      gameManager.startGame(room.id, room.boardConfig, room.players)
      gameState = gameManager.getGame(room.id)!
    }

    const playerId = (socket as any).userId || socket.id
    const result = gameManager.revealCell(room.id, playerId, row, col)

    if (!result.success) {
      socket.emit('error', { code: 'REVEAL_FAILED', message: result.error })
      return
    }

    if (result.exploded) {
      io.to(room.id).emit('game:cellRevealed', {
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
      io.to(room.id).emit('game:cellRevealed', {
        cellId: result.cells[0].cellId,
        value: result.cells[0].value,
        revealedBy: playerId,
      })
    } else {
      io.to(room.id).emit('game:cellRevealed', { batch: result.cells })
    }

    io.to(room.id).emit('game:scoreUpdate', {
      playerId,
      delta: result.delta,
      total: (gameState.scores.get(playerId)?.score || 0),
    })

    if (result.gameEnded) {
      const scoreboard = gameManager.getScoreboard(room.id)
      io.to(room.id).emit('game:ended', {
        result: 'win',
        scoreboard: scoreboard.map((entry, i) => ({
          playerId: entry.playerId,
          score: entry.score,
          rank: i + 1,
        })),
      })
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

    io.to(room.id).emit('game:cellFlagged', {
      cellId: result.cellId,
      playerId,
      flagged: result.flagged,
    })

    if (result.delta !== 0) {
      io.to(room.id).emit('game:scoreUpdate', {
        playerId,
        delta: result.delta,
        total: (gameManager.getGame(room.id)?.scores.get(playerId)?.score || 0),
      })
    }
  })

  socket.on('game:ping', (data: { type: string }) => {
    const room = roomManager.getRoomBySocket(socket.id)
    if (!room) return

    io.to(room.id).emit('game:ping', {
      playerId: socket.id,
      type: data.type,
    })
  })
}

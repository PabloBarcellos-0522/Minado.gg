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

function getPlayerId(socket: Socket): string {
  return (socket as any).userId || socket.id
}

export function setupGameHandlers(io: Server, socket: Socket, roomManager: RoomManager, gameManager: GameManager): void {
  socket.on('game:reveal', (data: { cellId: string }) => {
    const room = roomManager.getRoomBySocket(socket.id)
    if (!room || room.status !== 'playing') return

    const [rowStr, colStr] = data.cellId.split('-')
    const row = parseInt(rowStr, 10)
    const col = parseInt(colStr, 10)

    if (!gameManager.getGame(room.id)) {
      socket.emit('error', { code: 'GAME_NOT_FOUND', message: 'Partida não encontrada' })
      return
    }

    const playerId = getPlayerId(socket)
    const result = gameManager.revealCell(room.id, playerId, row, col)

    if (!result.success) {
      socket.emit('error', { code: 'REVEAL_FAILED', message: result.error })
      return
    }

    const emit = (event: string, data: any) => emitToTarget(io, socket, room, event, data)

    if (result.exploded) {
      const cellRevealedData = {
        cellId: data.cellId,
        value: 'mine',
        revealedBy: playerId,
        exploded: true,
        teamLives: room.mode === 'cooperative' ? result.teamLives : undefined,
      }
      emit('game:cellRevealed', cellRevealedData)
      io.to(room.id).emit('game:scoreUpdate', {
        playerId,
        delta: result.delta,
        total: (gameManager.getGame(room.id)?.scores.get(playerId)?.score || 0),
      })

      // Cooperative: no individual elimination, only team lives
      if (room.mode === 'cooperative') {
        if (result.gameEnded) {
          // Game ended (win or lose) — onGameEnded broadcasts to room
        } else if (result.boardComplete) {
          io.to(room.id).emit('game:playerBoardComplete', { playerId })
        }
        // No game:playerEliminated emitted in cooperative mode
        return
      }

      // Battle-royale/multi-board: individual elimination
      if (result.eliminated) {
        if (result.gameEnded) {
          // Game ended (last_standing) — onGameEnded broadcasts to room
          io.to(room.id).emit('game:playerEliminated', { playerId })
        } else {
          // Only this player is out; game continues for others
          io.to(room.id).emit('game:playerEliminated', { playerId })
          socket.emit('game:ended', {
            result: 'eliminated',
            scoreboard: gameManager.getScoreboard(room.id).map((entry, i) => ({
              playerId: entry.playerId,
              score: entry.score,
              rank: i + 1,
            })),
          })
        }
      } else if (result.boardComplete) {
        io.to(room.id).emit('game:playerBoardComplete', { playerId })
      }

      // Game state is removed in endGame, no need to call removeGame here
      return
    }

    // Safe reveal
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
      total: (gameManager.getGame(room.id)?.scores.get(playerId)?.score || 0),
    })

    if (result.boardComplete) {
      io.to(room.id).emit('game:playerBoardComplete', { playerId })
    }

    // Game state is removed in endGame, no need to call removeGame here
  })

  socket.on('game:flag', (data: { cellId: string }) => {
    const room = roomManager.getRoomBySocket(socket.id)
    if (!room || room.status !== 'playing') return

    if (!gameManager.getGame(room.id)) return

    const [rowStr, colStr] = data.cellId.split('-')
    const row = parseInt(rowStr, 10)
    const col = parseInt(colStr, 10)
    const playerId = getPlayerId(socket)

    const result = gameManager.flagCell(room.id, playerId, row, col)
    if (!result.success) {
      socket.emit('error', { code: 'FLAG_FAILED', message: result.error })
      return
    }

    const emit = (event: string, data: any) => emitToTarget(io, socket, room, event, data)

    emit('game:cellFlagged', {
      cellId: result.cellId,
      playerId,
      flagged: result.flagged,
    })

    // Emit score update for flag action
    io.to(room.id).emit('game:scoreUpdate', {
      playerId,
      delta: result.delta,
      total: (gameManager.getGame(room.id)?.scores.get(playerId)?.score || 0),
    })

    if (result.boardComplete) {
      io.to(room.id).emit('game:playerBoardComplete', { playerId })
    }

    // Game state is removed in endGame, no need to call removeGame here
  })

  // game:ping handler removed - pings work via chat:message
}
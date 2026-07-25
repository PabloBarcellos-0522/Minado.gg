import type { Board, Player } from '@minado/shared'
import { generateBoard, floodFill, checkWin, calculateScore } from '@minado/shared'

export interface GameScoreEntry {
  playerId: string
  score: number
  exploded: boolean
}

export interface GameState {
  roomId: string
  board: Board
  config: { rows: number; cols: number; mines: number }
  scores: Map<string, GameScoreEntry>
  startedAt: number
  endedAt?: number
  minePositions: Set<string>
}

export class GameManager {
  private games: Map<string, GameState> = new Map()

  startGame(roomId: string, config: { rows: number; cols: number; mines: number }, players: Player[]): GameState {
    const board = generateBoard(config.rows, config.cols, config.mines)

    const minePositions = new Set<string>()
    for (let r = 0; r < config.rows; r++) {
      for (let c = 0; c < config.cols; c++) {
        if (board[r][c].hasMine) minePositions.add(`${r}-${c}`)
      }
    }

    const scores = new Map<string, GameScoreEntry>()
    for (const p of players) {
      scores.set(p.id, { playerId: p.id, score: 0, exploded: false })
    }

    const state: GameState = {
      roomId,
      board,
      config,
      scores,
      startedAt: Date.now(),
      minePositions,
    }

    this.games.set(roomId, state)
    return state
  }

  getGame(roomId: string): GameState | undefined {
    return this.games.get(roomId)
  }

  revealCell(roomId: string, playerId: string, row: number, col: number):
    { success: true; cells: Array<{ cellId: string; value: number | 'mine'; revealedBy: string }>; delta: number; exploded?: boolean; gameEnded?: true }
    | { success: false; error: string } {
    const state = this.games.get(roomId)
    if (!state) return { success: false, error: 'Partida não encontrada' }

    const entry = state.scores.get(playerId)
    if (!entry) return { success: false, error: 'Jogador não encontrado' }
    if (entry.exploded) return { success: false, error: 'Jogador já explodiu' }

    const cell = state.board[row]?.[col]
    if (!cell) return { success: false, error: 'Célula inválida' }
    if (cell.isRevealed) return { success: false, error: 'Célula já revelada' }

    if (cell.hasMine) {
      cell.isRevealed = true
      entry.exploded = true
      entry.score += calculateScore('explode')

      return {
        success: true,
        cells: [{ cellId: `${row}-${col}`, value: 'mine', revealedBy: playerId }],
        delta: calculateScore('explode'),
        exploded: true,
      }
    }

    let cells: Array<{ cellId: string; value: number | 'mine'; revealedBy: string }>
    let delta: number

    if (cell.adjacentMines === 0) {
      const revealed = floodFill(state.board, row, col)
      cells = revealed.map(({ row: r, col: c }) => ({
        cellId: `${r}-${c}`,
        value: state.board[r][c].adjacentMines,
        revealedBy: playerId,
      }))
      delta = revealed.length > 5 ? calculateScore('flood-fill') : calculateScore('reveal')
    } else {
      cell.isRevealed = true
      cells = [{ cellId: `${row}-${col}`, value: cell.adjacentMines, revealedBy: playerId }]
      delta = calculateScore('reveal')
    }

    entry.score += delta

    if (checkWin(state.board)) {
      entry.score += calculateScore('win')
      state.endedAt = Date.now()

      return {
        success: true,
        cells,
        delta,
        gameEnded: true,
      }
    }

    return { success: true, cells, delta }
  }

  flagCell(roomId: string, playerId: string, row: number, col: number):
    { success: true; cellId: string; flagged: boolean; delta: number }
    | { success: false; error: string } {
    const state = this.games.get(roomId)
    if (!state) return { success: false, error: 'Partida não encontrada' }

    const entry = state.scores.get(playerId)
    if (!entry) return { success: false, error: 'Jogador não encontrado' }

    const cell = state.board[row]?.[col]
    if (!cell) return { success: false, error: 'Célula inválida' }
    if (cell.isRevealed) return { success: false, error: 'Célula já revelada' }

    cell.isFlagged = !cell.isFlagged
    const isPlacing = cell.isFlagged

    let delta = 0
    if (isPlacing && cell.hasMine) delta = calculateScore('flag-correct')
    else if (!isPlacing && cell.hasMine) delta = calculateScore('flag-wrong')
    else if (isPlacing && !cell.hasMine) delta = calculateScore('flag-wrong')

    entry.score += delta

    return {
      success: true,
      cellId: `${row}-${col}`,
      flagged: cell.isFlagged,
      delta,
    }
  }

  getScoreboard(roomId: string): GameScoreEntry[] {
    const state = this.games.get(roomId)
    if (!state) return []

    return Array.from(state.scores.values())
      .sort((a, b) => b.score - a.score)
      .map((entry, i) => ({ ...entry, rank: i + 1 })) as any
  }

  removeGame(roomId: string): void {
    this.games.delete(roomId)
  }
}

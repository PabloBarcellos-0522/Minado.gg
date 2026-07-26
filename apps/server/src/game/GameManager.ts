import type { Board, BoardConfig, Player, GameMode } from '@minado/shared'
import { generateBoard, cloneBoard, floodFill, checkWin, calculateScore } from '@minado/shared'

const CORRECT_FLAG_POINTS = 50
const REVEALED_CELL_POINTS = 5
const WRONG_FLAG_PENALTY = 25

const COOP_TIME_BONUS_MAX = 600

export interface GameScoreEntry {
  playerId: string
  score: number
}

export interface EndGameBonus {
  total: number
  correctFlags: number
  wrongFlags: number
  revealedSafe: number
  totalSafe: number
}

export interface PlayerBoardData {
  board: Board
  minePositions: Set<string>
}

export interface GameState {
  roomId: string
  config: BoardConfig
  scores: Map<string, GameScoreEntry>
  startedAt: number
  endedAt?: number
  mode: GameMode
  playerBoards: Map<string, PlayerBoardData>
  sharedBoardId?: string
  timeLimit: number
  timerHandle?: NodeJS.Timeout
  endedByTimer?: boolean
}

function extractMinePositions(board: Board): Set<string> {
  const pos = new Set<string>()
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      if (board[r][c].hasMine) pos.add(`${r}-${c}`)
    }
  }
  return pos
}

function calculateEndGameBonus(board: Board): EndGameBonus {
  let correctFlags = 0
  let wrongFlags = 0
  let revealedSafe = 0
  let totalSafe = 0

  for (const row of board) {
    for (const cell of row) {
      if (cell.hasMine) {
        if (cell.isFlagged) correctFlags++
      } else {
        totalSafe++
        if (cell.isRevealed) revealedSafe++
        if (cell.isFlagged) wrongFlags++
      }
    }
  }

  const total = correctFlags * CORRECT_FLAG_POINTS + revealedSafe * REVEALED_CELL_POINTS - wrongFlags * WRONG_FLAG_PENALTY
  return { total, correctFlags, wrongFlags, revealedSafe, totalSafe }
}

export class GameManager {
  private games: Map<string, GameState> = new Map()

  onGameEnded?: (roomId: string, scoreboard: GameScoreEntry[], reason: 'win' | 'timeout') => void

  startGame(roomId: string, config: BoardConfig, players: Player[], mode: GameMode, timeLimit: number): GameState {
    const scores = new Map<string, GameScoreEntry>()
    for (const p of players) {
      scores.set(p.id, { playerId: p.id, score: 0 })
    }

    const playerBoards = new Map<string, PlayerBoardData>()

    if (mode === 'multi-board') {
      for (const p of players) {
        const board = generateBoard(config.rows, config.cols, config.mines)
        playerBoards.set(p.id, { board, minePositions: extractMinePositions(board) })
      }
    } else if (mode === 'cooperative') {
      const board = generateBoard(config.rows, config.cols, config.mines)
      const sharedId = 'shared'
      playerBoards.set(sharedId, { board, minePositions: extractMinePositions(board) })
      for (const p of players) {
        playerBoards.set(p.id, { board, minePositions: extractMinePositions(board) })
      }
    } else {
      const template = generateBoard(config.rows, config.cols, config.mines)
      const minePos = extractMinePositions(template)
      for (const p of players) {
        playerBoards.set(p.id, { board: cloneBoard(template), minePositions: minePos })
      }
    }

    const state: GameState = {
      roomId,
      config,
      scores,
      startedAt: Date.now(),
      mode,
      playerBoards,
      sharedBoardId: mode === 'cooperative' ? 'shared' : undefined,
      timeLimit,
    }

    if (timeLimit > 0) {
      state.timerHandle = setTimeout(() => this.endByTimer(roomId), timeLimit * 1000)
    }

    this.games.set(roomId, state)
    return state
  }

  getGame(roomId: string): GameState | undefined {
    return this.games.get(roomId)
  }

  getTimeLimit(roomId: string): number {
    const state = this.games.get(roomId)
    return state?.timeLimit || 0
  }

  isEndedByTimer(roomId: string): boolean {
    const state = this.games.get(roomId)
    return state?.endedByTimer || false
  }

  getPlayerBoard(roomId: string, playerId: string): Board | null {
    const state = this.games.get(roomId)
    if (!state) return null
    const bid = state.mode === 'cooperative' ? state.sharedBoardId! : playerId
    return state.playerBoards.get(bid)?.board || null
  }

  getBoard(roomId: string): Board | null {
    const state = this.games.get(roomId)
    if (!state) return null
    if (state.mode === 'cooperative') {
      return state.playerBoards.get(state.sharedBoardId!)?.board || null
    }
    return null
  }

  removePlayerBoard(roomId: string, playerId: string): void {
    const state = this.games.get(roomId)
    if (!state) return
    if (state.mode !== 'cooperative') {
      state.playerBoards.delete(playerId)
    }
    state.scores.delete(playerId)
    if (state.scores.size === 0) {
      this.games.delete(roomId)
    }
  }

  endByTimer(roomId: string): GameScoreEntry[] {
    const state = this.games.get(roomId)
    if (!state) return []

    state.endedByTimer = true
    state.endedAt = Date.now()

    for (const [playerId, entry] of state.scores) {
      const board = this.getPlayerBoard(roomId, playerId)
      if (board) {
        const bonus = calculateEndGameBonus(board)
        entry.score += bonus.total
      }
    }

    const scoreboard = this.getScoreboard(roomId)
    this.onGameEnded?.(roomId, scoreboard, 'timeout')
    return scoreboard
  }

  revealCell(roomId: string, playerId: string, row: number, col: number):
    { success: true; cells: Array<{ cellId: string; value: number | 'mine'; revealedBy: string }>; delta: number; exploded?: boolean; gameEnded?: true }
    | { success: false; error: string } {
    const state = this.games.get(roomId)
    if (!state) return { success: false, error: 'Partida não encontrada' }

    const entry = state.scores.get(playerId)
    if (!entry) return { success: false, error: 'Jogador não encontrado' }

    const boardId = state.mode === 'cooperative' ? state.sharedBoardId! : playerId
    const board = state.playerBoards.get(boardId)?.board
    if (!board) return { success: false, error: 'Tabuleiro não encontrado' }

    const cell = board[row]?.[col]
    if (!cell) return { success: false, error: 'Célula inválida' }
    if (cell.isRevealed) return { success: false, error: 'Célula já revelada' }

    if (cell.hasMine) {
      cell.isRevealed = true
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
      const revealed = floodFill(board, row, col)
      cells = revealed.map(({ row: r, col: c }) => ({
        cellId: `${r}-${c}`,
        value: board[r][c].adjacentMines,
        revealedBy: playerId,
      }))
      delta = revealed.length > 5 ? calculateScore('flood-fill') : calculateScore('reveal')
    } else {
      cell.isRevealed = true
      cells = [{ cellId: `${row}-${col}`, value: cell.adjacentMines, revealedBy: playerId }]
      delta = calculateScore('reveal')
    }

    entry.score += delta

    if (state.mode === 'cooperative' && checkWin(board)) {
      entry.score += calculateScore('win')

      const elapsed = (Date.now() - state.startedAt) / 1000
      const timeBonus = Math.max(0, Math.round(COOP_TIME_BONUS_MAX * ((180 - elapsed) / 60)))
      entry.score += timeBonus

      const bonus = calculateEndGameBonus(board)
      entry.score += bonus.total

      state.endedAt = Date.now()

      if (state.timerHandle) {
        clearTimeout(state.timerHandle)
        delete state.timerHandle
      }

      this.onGameEnded?.(roomId, this.getScoreboard(roomId), 'win')

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

    const boardId = state.mode === 'cooperative' ? state.sharedBoardId! : playerId
    const board = state.playerBoards.get(boardId)?.board
    if (!board) return { success: false, error: 'Tabuleiro não encontrado' }

    const cell = board[row]?.[col]
    if (!cell) return { success: false, error: 'Célula inválida' }
    if (cell.isRevealed) return { success: false, error: 'Célula já revelada' }

    cell.isFlagged = !cell.isFlagged

    return {
      success: true,
      cellId: `${row}-${col}`,
      flagged: cell.isFlagged,
      delta: 0,
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
    const state = this.games.get(roomId)
    if (state?.timerHandle) {
      clearTimeout(state.timerHandle)
    }
    this.games.delete(roomId)
  }
}

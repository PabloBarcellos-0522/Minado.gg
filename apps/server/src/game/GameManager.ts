import { generateBoard, cloneBoard, floodFill, isBoardComplete, calculateScore } from '@minado/shared'
import type { Board, BoardConfig, Player, GameMode, Cell } from '@minado/shared'

const CORRECT_FLAG_POINTS = 50
const REVEALED_CELL_POINTS = 5
const WRONG_FLAG_PENALTY = 25

const COOP_TIME_BONUS_MAX = 600

function sanitizeBoardForClient(board: Board): Board {
  return board.map((row) =>
    row.map((cell: Cell) => ({
      ...cell,
      hasMine: cell.isRevealed && cell.hasMine,
    }))
  )
}

export type PlayerStatus = 'playing' | 'boardComplete' | 'eliminated'

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
  playerStatus: Map<string, PlayerStatus>
}

export type GameEndReason = 'win' | 'timeout' | 'complete' | 'eliminated' | 'last_standing'

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

  onGameEnded?: (roomId: string, scoreboard: GameScoreEntry[], reason: GameEndReason) => void
  onPlayerEliminated?: (roomId: string, playerId: string) => void
  onPlayerBoardComplete?: (roomId: string, playerId: string) => void

  startGame(roomId: string, config: BoardConfig, players: Player[], mode: GameMode, timeLimit: number): GameState {
    const scores = new Map<string, GameScoreEntry>()
    const playerStatus = new Map<string, PlayerStatus>()
    for (const p of players) {
      scores.set(p.id, { playerId: p.id, score: 0 })
      playerStatus.set(p.id, 'playing')
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
      playerStatus,
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

  getPlayerStatus(roomId: string, playerId: string): PlayerStatus {
    const state = this.games.get(roomId)
    return state?.playerStatus.get(playerId) || 'playing'
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

  getSanitizedBoardForPlayer(roomId: string, playerId: string): Board | null {
    const board = this.getPlayerBoard(roomId, playerId)
    return board ? sanitizeBoardForClient(board) : null
  }

  getSanitizedSharedBoard(roomId: string): Board | null {
    const board = this.getBoard(roomId)
    return board ? sanitizeBoardForClient(board) : null
  }

  removePlayerBoard(roomId: string, playerId: string): void {
    const state = this.games.get(roomId)
    if (!state) return
    if (state.mode !== 'cooperative') {
      state.playerBoards.delete(playerId)
    }
    state.scores.delete(playerId)
    state.playerStatus.delete(playerId)
    if (state.scores.size === 0) {
      this.games.delete(roomId)
    }
  }

  private checkAllPlayersDone(state: GameState): boolean {
    for (const status of state.playerStatus.values()) {
      if (status === 'playing') return false
    }
    return true
  }

  private endGame(roomId: string, reason: GameEndReason): void {
    const state = this.games.get(roomId)
    if (!state) return
    if (state.endedAt) return

    state.endedAt = Date.now()

    if (state.timerHandle) {
      clearTimeout(state.timerHandle)
      delete state.timerHandle
    }

    this.onGameEnded?.(roomId, this.getScoreboard(roomId), reason)
  }

  endByTimer(roomId: string): GameScoreEntry[] {
    const state = this.games.get(roomId)
    if (!state) return []
    if (state.endedAt) return []

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
    { success: true; cells: Array<{ cellId: string; value: number | 'mine'; revealedBy: string }>; delta: number; exploded?: boolean; gameEnded?: true; eliminated?: boolean; boardComplete?: boolean }
    | { success: false; error: string } {
    const state = this.games.get(roomId)
    if (!state) return { success: false, error: 'Partida não encontrada' }
    if (state.endedAt) return { success: false, error: 'Partida já encerrada' }

    const status = state.playerStatus.get(playerId)
    if (!status) return { success: false, error: 'Jogador não encontrado' }
    if (status !== 'playing') return { success: false, error: 'Você não pode mais interagir' }

    const entry = state.scores.get(playerId)
    if (!entry) return { success: false, error: 'Jogador não encontrado' }

    const boardId = state.mode === 'cooperative' ? state.sharedBoardId! : playerId
    const board = state.playerBoards.get(boardId)?.board
    if (!board) return { success: false, error: 'Tabuleiro não encontrado' }

    const cell = board[row]?.[col]
    if (!cell) return { success: false, error: 'Célula inválida' }
    if (cell.isRevealed) return { success: false, error: 'Célula já revelada' }

    // ---- MINE EXPLOSION ----
    if (cell.hasMine) {
      cell.isRevealed = true
      entry.score += calculateScore('explode')

      const result = {
        success: true as const,
        cells: [{ cellId: `${row}-${col}`, value: 'mine' as const, revealedBy: playerId }],
        delta: calculateScore('explode'),
        exploded: true,
      }

      // Battle-royale: death is definitive
      if (state.mode === 'battle-royale') {
        state.playerStatus.set(playerId, 'eliminated')
        this.onPlayerEliminated?.(roomId, playerId)

        const aliveCount = this.countAlivePlayers(state)
        if (aliveCount <= 1) {
          this.endGame(roomId, 'last_standing')
          return { ...result, eliminated: true, gameEnded: true }
        }

        return { ...result, eliminated: true }
      }

      // Other modes: check if board is now complete (all mines exploded/flagged)
      if (isBoardComplete(board)) {
        state.playerStatus.set(playerId, 'boardComplete')
        this.onPlayerBoardComplete?.(roomId, playerId)

        if (state.mode === 'cooperative') {
          this.endGame(roomId, 'win')
          return { ...result, boardComplete: true, gameEnded: true }
        }

        if (this.checkAllPlayersDone(state)) {
          this.endGame(roomId, 'complete')
          return { ...result, boardComplete: true, gameEnded: true }
        }

        return { ...result, boardComplete: true }
      }

      return result
    }

    // ---- SAFE REVEAL ----
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

    // ---- COOPERATIVE WIN ----
    if (state.mode === 'cooperative' && isBoardComplete(board)) {
      entry.score += calculateScore('win')

      const elapsed = (Date.now() - state.startedAt) / 1000
      const timeBonus = Math.max(0, Math.round(COOP_TIME_BONUS_MAX * ((180 - elapsed) / 60)))
      entry.score += timeBonus

      this.endGame(roomId, 'win')

      return {
        success: true,
        cells,
        delta,
        gameEnded: true,
      }
    }

    // ---- BOARD COMPLETE CHECK (non-cooperative) ----
    if (isBoardComplete(board)) {
      state.playerStatus.set(playerId, 'boardComplete')
      this.onPlayerBoardComplete?.(roomId, playerId)

      if (this.checkAllPlayersDone(state)) {
        this.endGame(roomId, 'complete')
        return { success: true, cells, delta, boardComplete: true, gameEnded: true }
      }

      return { success: true, cells, delta, boardComplete: true }
    }

    return { success: true, cells, delta }
  }

  flagCell(roomId: string, playerId: string, row: number, col: number):
    { success: true; cellId: string; flagged: boolean; delta: number; boardComplete?: boolean; gameEnded?: true }
    | { success: false; error: string } {
    const state = this.games.get(roomId)
    if (!state) return { success: false, error: 'Partida não encontrada' }
    if (state.endedAt) return { success: false, error: 'Partida já encerrada' }

    const status = state.playerStatus.get(playerId)
    if (!status) return { success: false, error: 'Jogador não encontrado' }
    if (status !== 'playing') return { success: false, error: 'Você não pode mais interagir' }

    const entry = state.scores.get(playerId)
    if (!entry) return { success: false, error: 'Jogador não encontrado' }

    const boardId = state.mode === 'cooperative' ? state.sharedBoardId! : playerId
    const board = state.playerBoards.get(boardId)?.board
    if (!board) return { success: false, error: 'Tabuleiro não encontrado' }

    const cell = board[row]?.[col]
    if (!cell) return { success: false, error: 'Célula inválida' }
    if (cell.isRevealed) return { success: false, error: 'Célula já revelada' }

    cell.isFlagged = !cell.isFlagged

    const result = {
      success: true as const,
      cellId: `${row}-${col}`,
      flagged: cell.isFlagged,
      delta: 0,
    }

    // Check if this completed the board
    if (isBoardComplete(board)) {
      state.playerStatus.set(playerId, 'boardComplete')
      this.onPlayerBoardComplete?.(roomId, playerId)

      if (state.mode === 'cooperative') {
        this.endGame(roomId, 'win')
        return { ...result, boardComplete: true, gameEnded: true }
      }

      if (this.checkAllPlayersDone(state)) {
        this.endGame(roomId, 'complete')
        return { ...result, boardComplete: true, gameEnded: true }
      }

      return { ...result, boardComplete: true }
    }

    return result
  }

  countAlivePlayers(state: GameState): number {
    let alive = 0
    for (const status of state.playerStatus.values()) {
      if (status === 'playing') alive++
    }
    return alive
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

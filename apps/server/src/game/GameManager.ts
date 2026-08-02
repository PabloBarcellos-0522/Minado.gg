import { generateBoard, cloneBoard, floodFill, isBoardComplete, calculateScore, relocateMine } from '@minado/shared'
import type { Board, BoardConfig, Player, GameMode, Cell } from '@minado/shared'

const COOP_TEAM_LIVES = 3
const COOP_TIME_BONUS_MAX = 600
const COOP_IDEAL_TIME_SECONDS = 300

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
  rank: number
}

export interface PlayerBoardData {
  board: Board
  minePositions: Set<string>
}

export interface GameAction {
  playerId: string
  type: 'reveal' | 'flood-fill' | 'flag-correct' | 'flag-wrong' | 'explode' | 'win'
  cellId?: string
  points: number
  timestamp: string
}

export type PlayerAction =
  | { type: 'reveal'; row: number; col: number; ts: number }
  | { type: 'flood-fill'; row: number; col: number; ts: number }
  | { type: 'flag'; row: number; col: number; ts: number }
  | { type: 'explode'; row: number; col: number; ts: number }

export const MAX_ACTIONS_PER_PLAYER = 500

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
  firstRevealDone: Map<string, boolean>
  template?: Board
  teamLives?: number
  actions: Map<string, PlayerAction[]>
  explodedPlayers: Set<string>
}

export type GameEndReason = 'win' | 'timeout' | 'complete' | 'eliminated' | 'last_standing' | 'lose'

function extractMinePositions(board: Board): Set<string> {
  const pos = new Set<string>()
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      if (board[r][c].hasMine) pos.add(`${r}-${c}`)
    }
  }
  return pos
}

export class GameManager {
  private games: Map<string, GameState> = new Map()

  onGameEnded?: (roomId: string, scoreboard: GameScoreEntry[], reason: GameEndReason, game: GameState) => void
  onPlayerEliminated?: (roomId: string, playerId: string) => void
  onPlayerBoardComplete?: (roomId: string, playerId: string) => void

  startGame(roomId: string, config: BoardConfig, players: Player[], mode: GameMode, timeLimit: number): GameState {
    const scores = new Map<string, GameScoreEntry>()
    const playerStatus = new Map<string, PlayerStatus>()
    for (const p of players) {
      scores.set(p.id, { playerId: p.id, score: 0, rank: 0 })
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
      // Store template for first-click safety propagation
      playerBoards.set('template', { board: template, minePositions: minePos })
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
      firstRevealDone: new Map(),
      template: mode === 'competitive' ? playerBoards.get(players[0].id)?.board ?? undefined : undefined,
      teamLives: mode === 'cooperative' ? COOP_TEAM_LIVES : undefined,
      actions: new Map(),
      explodedPlayers: new Set(),
    }

    if (timeLimit > 0) {
      state.timerHandle = setTimeout(() => this.endByTimer(roomId), timeLimit * 1000)
    }

    this.games.set(roomId, state)
    return state
  }

  private recordAction(state: GameState, playerId: string, action: PlayerAction) {
    const arr = state.actions.get(playerId) ?? []
    arr.push(action)
    if (arr.length > MAX_ACTIONS_PER_PLAYER) arr.shift()
    state.actions.set(playerId, arr)
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

  private awardCoopWin(state: GameState, playerId: string, entry: GameScoreEntry, roomId: string): void {
    entry.score += calculateScore('win')

    // Record win action for cooperative completion (not part of PlayerAction for persistence)
    // Note: 'win' type not in PlayerAction - it's for internal GameAction only

    const elapsed = (Date.now() - state.startedAt) / 1000
    const timeBonus = Math.round(COOP_TIME_BONUS_MAX * Math.max(0, Math.min(1, (COOP_IDEAL_TIME_SECONDS - elapsed) / COOP_IDEAL_TIME_SECONDS)))
    entry.score += timeBonus

    this.endGame(roomId, 'win')
  }

  private endGame(roomId: string, reason: GameEndReason, priorityPlayerId?: string): GameScoreEntry[] {
    const state = this.games.get(roomId)
    if (!state) return []
    if (state.endedAt) return []

    state.endedAt = Date.now()

    if (state.timerHandle) {
      clearTimeout(state.timerHandle)
      delete state.timerHandle
    }

    const scoreboard = this.getScoreboard(roomId, priorityPlayerId)
    this.onGameEnded?.(roomId, scoreboard, reason, state)
    this.games.delete(roomId)
    return scoreboard
  }

  endByTimer(roomId: string): GameScoreEntry[] {
    const state = this.games.get(roomId)
    if (!state) return []
    if (state.endedAt) return []

    state.endedByTimer = true
    return this.endGame(roomId, 'timeout')
  }

  revealCell(roomId: string, playerId: string, row: number, col: number):
    { success: true; cells: Array<{ cellId: string; value: number | 'mine'; revealedBy: string }>; delta: number; exploded?: boolean; gameEnded?: true; eliminated?: boolean; boardComplete?: boolean; teamLives?: number }
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
    if (cell.isFlagged) return { success: false, error: 'Remova a bandeira antes de revelar' }
    if (cell.isRevealed) return { success: false, error: 'Célula já revelada' }

    // ---- FIRST-CLICK SAFETY ----
    const firstRevealKey = state.mode === 'cooperative' ? 'shared' : playerId
    if (!state.firstRevealDone.get(firstRevealKey)) {
      state.firstRevealDone.set(firstRevealKey, true)
      if (cell.hasMine) {
        // Relocate mine from the first-click cell
        let relocationBoard: Board
        if (state.mode === 'competitive') {
          // Use template for relocation, then propagate FULL layout to all player boards
          relocationBoard = state.template!
          relocateMine(relocationBoard, row, col)
          // Propagate the ENTIRE layout (hasMine + adjacentMines) to all player boards,
          // preserving each player's game state (isRevealed, isFlagged, revealedBy)
          for (const [pid, boardData] of state.playerBoards) {
            if (pid !== 'template') {
              for (let r = 0; r < state.config.rows; r++) {
                for (let c = 0; c < state.config.cols; c++) {
                  const playerCell = boardData.board[r][c]
                  const templateCell = relocationBoard[r][c]
                  boardData.board[r][c] = {
                    ...playerCell,           // preserves isRevealed, isFlagged, revealedBy
                    hasMine: templateCell.hasMine,
                    adjacentMines: templateCell.adjacentMines,
                  }
                }
              }
            }
          }
        } else {
          // multi-board or cooperative: just this board
          relocationBoard = board
          relocateMine(relocationBoard, row, col)
        }
        // Continue as safe reveal (cell no longer has mine)
      }
    }

    // Re-read cell from board after first-click safety propagation
    // In competitive mode, the board was updated with the new layout
    const updatedCell = board[row]?.[col]

    // ---- MINE EXPLOSION ----
    if (updatedCell.hasMine) {
      updatedCell.isRevealed = true
      entry.score += calculateScore('explode')

      // Cooperative: manage team lives
      if (state.mode === 'cooperative') {
        state.teamLives!--
        const currentTeamLives = state.teamLives!

        // Record explode action and track exploded player
        this.recordAction(state, playerId, { type: 'explode', row, col, ts: Date.now() })
        state.explodedPlayers.add(playerId)

        const coopResult = {
          success: true as const,
          cells: [{ cellId: `${row}-${col}`, value: 'mine' as const, revealedBy: playerId }],
          delta: calculateScore('explode'),
          exploded: true,
        }

        // Check if explosion completes the board (victory)
        if (isBoardComplete(board)) {
          state.playerStatus.set(playerId, 'boardComplete')
          this.onPlayerBoardComplete?.(roomId, playerId)
          this.awardCoopWin(state, playerId, entry, roomId)
          return {
            ...coopResult,
            boardComplete: true,
            gameEnded: true,
            teamLives: currentTeamLives,
          }
        }

        // Board not complete: check if team lives exhausted
        if (currentTeamLives <= 0) {
          this.endGame(roomId, 'lose')
          return {
            ...coopResult,
            gameEnded: true,
            teamLives: 0,
          }
        }

        // Still have lives, continue
        return {
          ...coopResult,
          teamLives: currentTeamLives,
        }
      }

      const result = {
        success: true as const,
        cells: [{ cellId: `${row}-${col}`, value: 'mine' as const, revealedBy: playerId }],
        delta: calculateScore('explode'),
        exploded: true,
      }

      // Record explode action and track exploded player
      this.recordAction(state, playerId, { type: 'explode', row, col, ts: Date.now() })
      state.explodedPlayers.add(playerId)

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

        // Multi-board (Race): first to complete wins immediately
        if (state.mode === 'multi-board') {
          this.endGame(roomId, 'complete', playerId)
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

    if (updatedCell.adjacentMines === 0) {
      const revealed = floodFill(board, row, col)
      cells = revealed.map(({ row: r, col: c }) => ({
        cellId: `${r}-${c}`,
        value: board[r][c].adjacentMines,
        revealedBy: playerId,
      }))
      delta = revealed.length > 5 ? calculateScore('flood-fill') : calculateScore('reveal')
    } else {
      updatedCell.isRevealed = true
      cells = [{ cellId: `${row}-${col}`, value: updatedCell.adjacentMines, revealedBy: playerId }]
      delta = calculateScore('reveal')
    }

    entry.score += delta

    // Record action for safe reveal
    if (updatedCell.adjacentMines === 0) {
      this.recordAction(state, playerId, { type: 'flood-fill', row, col, ts: Date.now() })
    } else {
      this.recordAction(state, playerId, { type: 'reveal', row, col, ts: Date.now() })
    }

    // ---- COOPERATIVE WIN ----
    if (state.mode === 'cooperative' && isBoardComplete(board)) {
      this.awardCoopWin(state, playerId, entry, roomId)

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

      // Multi-board (Race): first to complete wins immediately
      if (state.mode === 'multi-board') {
        this.endGame(roomId, 'complete', playerId)
        return { success: true, cells, delta, boardComplete: true, gameEnded: true }
      }

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

    // Score flags live: +25 for correct flag, -15 for wrong flag
    // Symmetric: removing a flag reverses the delta
    let delta = 0
    if (cell.isFlagged) {
      // Placing flag
      delta = cell.hasMine ? calculateScore('flag-correct') : calculateScore('flag-wrong')
    } else {
      // Removing flag - reverse the delta
      delta = cell.hasMine ? -calculateScore('flag-correct') : -calculateScore('flag-wrong')
    }
    entry.score += delta

    // Record flag action
    this.recordAction(state, playerId, { type: 'flag', row, col, ts: Date.now() })

    const result = {
      success: true as const,
      cellId: `${row}-${col}`,
      flagged: cell.isFlagged,
      delta,
    }

    // Check if this completed the board
    if (isBoardComplete(board)) {
      state.playerStatus.set(playerId, 'boardComplete')
      this.onPlayerBoardComplete?.(roomId, playerId)

      if (state.mode === 'cooperative') {
        this.awardCoopWin(state, playerId, entry, roomId)
        return { ...result, boardComplete: true, gameEnded: true }
      }

      // Multi-board (Race): first to complete wins immediately
      if (state.mode === 'multi-board') {
        this.endGame(roomId, 'complete', playerId)
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

  getScoreboard(roomId: string, priorityPlayerId?: string): GameScoreEntry[] {
    const state = this.games.get(roomId)
    if (!state) return []

    const sorted = Array.from(state.scores.values())
      .sort((a, b) => b.score - a.score)
      .map((entry, i) => ({ ...entry, rank: i + 1 }))

    // If priorityPlayerId is provided, move that player to rank 1
    if (priorityPlayerId) {
      const priorityIndex = sorted.findIndex(e => e.playerId === priorityPlayerId)
      if (priorityIndex > 0) {
        const [priorityEntry] = sorted.splice(priorityIndex, 1)
        sorted.unshift({ ...priorityEntry, rank: 1 })
        // Renumber ranks
        sorted.forEach((entry, i) => { entry.rank = i + 1 })
      }
    }

    return sorted
  }

  removeGame(roomId: string): void {
    const state = this.games.get(roomId)
    if (state?.timerHandle) {
      clearTimeout(state.timerHandle)
    }
    this.games.delete(roomId)
  }
}

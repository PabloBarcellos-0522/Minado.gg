import type { Board, BoardConfig, Player, GameMode } from '@minado/shared'
import { generateBoard, cloneBoard, floodFill, checkWin, calculateScore } from '@minado/shared'

export interface GameScoreEntry {
  playerId: string
  score: number
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
  // cooperative mode: all players share this board id
  sharedBoardId?: string
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

export class GameManager {
  private games: Map<string, GameState> = new Map()

  startGame(roomId: string, config: BoardConfig, players: Player[], mode: GameMode): GameState {
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
      // competitive / others: same mine layout, independent per-player boards
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
    }

    this.games.set(roomId, state)
    return state
  }

  getGame(roomId: string): GameState | undefined {
    return this.games.get(roomId)
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

    if (checkWin(board)) {
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

    const boardId = state.mode === 'cooperative' ? state.sharedBoardId! : playerId
    const board = state.playerBoards.get(boardId)?.board
    if (!board) return { success: false, error: 'Tabuleiro não encontrado' }

    const cell = board[row]?.[col]
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

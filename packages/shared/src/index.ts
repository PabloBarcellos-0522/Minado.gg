// Shared types and constants for Minado.gg
// Used by both frontend (apps/web) and backend (apps/server)

export type GameMode = 'competitive' | 'multi-board' | 'cooperative' | 'battle-royale' | 'fog-of-war'
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

export interface BoardConfig {
  rows: number
  cols: number
  mines: number
}

export interface Cell {
  id: string
  row: number
  col: number
  hasMine: boolean
  isRevealed: boolean
  isFlagged: boolean
  adjacentMines: number
  revealedBy?: string
}

export type Board = Cell[][]

export interface Player {
  id: string
  username: string
  avatarUrl?: string
  score: number
  isReady: boolean
  isHost: boolean
}

export interface Room {
  id: string
  hostId: string
  mode: GameMode
  isPrivate: boolean
  maxPlayers: number
  status: 'waiting' | 'playing' | 'finished'
  players: Player[]
  boardConfig: BoardConfig
  difficulty: Difficulty
}

export interface MatchResult {
  matchId: string
  mode: GameMode
  winner?: string
  scoreboard: Array<{ playerId: string; score: number; rank: number }>
  startedAt: string
  endedAt: string
}

// Scoring
export function calculateScore(action: 'reveal' | 'flood-fill' | 'flag-correct' | 'flag-wrong' | 'explode' | 'win'): number {
  const scores = {
    'reveal': 10,
    'flood-fill': 30,
    'flag-correct': 25,
    'flag-wrong': -15,
    'explode': -50,
    'win': 200,
  }
  return scores[action]
}

// Board generation
export function generateBoard(rows: number, cols: number, mineCount: number, safeRow?: number, safeCol?: number): Board {
  const board: Board = []

  // Initialize cells
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = []
    for (let c = 0; c < cols; c++) {
      row.push({
        id: `${r}-${c}`,
        row: r,
        col: c,
        hasMine: false,
        isRevealed: false,
        isFlagged: false,
        adjacentMines: 0,
      })
    }
    board.push(row)
  }

  // Place mines (avoiding safe zone)
  let placed = 0
  while (placed < mineCount) {
    const r = Math.floor(Math.random() * rows)
    const c = Math.floor(Math.random() * cols)

    if (board[r][c].hasMine) continue
    if (safeRow !== undefined && safeCol !== undefined) {
      const isSafe = Math.abs(r - safeRow) <= 1 && Math.abs(c - safeCol) <= 1
      if (isSafe) continue
    }

    board[r][c].hasMine = true
    placed++
  }

  // Calculate adjacent mines
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c].hasMine) continue
      let count = 0
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr
          const nc = c + dc
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].hasMine) {
            count++
          }
        }
      }
      board[r][c].adjacentMines = count
    }
  }

  return board
}

// Flood fill
export function floodFill(board: Board, row: number, col: number): Array<{ row: number; col: number }> {
  const revealed: Array<{ row: number; col: number }> = []
  const rows = board.length
  const cols = board[0].length

  const dfs = (r: number, c: number) => {
    if (r < 0 || r >= rows || c < 0 || c >= cols) return
    if (board[r][c].isRevealed || board[r][c].hasMine || board[r][c].isFlagged) return

    board[r][c].isRevealed = true
    revealed.push({ row: r, col: c })

    if (board[r][c].adjacentMines === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr !== 0 || dc !== 0) {
            dfs(r + dr, c + dc)
          }
        }
      }
    }
  }

  dfs(row, col)
  return revealed
}

// Difficulty presets
export const DIFFICULTY_CONFIG: Record<Difficulty, { rows: number; cols: number; mines: number }> = {
  easy: { rows: 9, cols: 9, mines: 10 },
  medium: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 30, mines: 99 },
  expert: { rows: 24, cols: 30, mines: 150 },
}

// Check win condition
export function checkWin(board: Board): boolean {
  for (const row of board) {
    for (const cell of row) {
      if (!cell.hasMine && !cell.isRevealed) return false
    }
  }
  return true
}

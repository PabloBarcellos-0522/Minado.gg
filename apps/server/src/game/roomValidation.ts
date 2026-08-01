import type { GameMode, BoardConfig } from '@minado/shared'

export const BOARD_MIN = 5
export const BOARD_MAX = 50
export const SAFE_AREA_CELLS = 9

export const TIME_LIMITS = new Set([0, 60, 120, 180, 300, 600, 900])

export const MAX_PLAYERS: Record<GameMode, { min: number; max: number }> = {
  'battle-royale': { min: 10, max: 50 },
  competitive: { min: 2, max: 16 },
  'multi-board': { min: 2, max: 16 },
  cooperative: { min: 2, max: 16 },
  'fog-of-war': { min: 2, max: 16 },
}

export interface RoomCreateData {
  name: string
  mode: string
  difficulty: string
  isPrivate: boolean
  password?: string
  maxPlayers: number
  boardConfig?: BoardConfig
  timeLimit: number
}

export type ValidationResult =
  | { ok: true; timeLimit: number }
  | { ok: false; code: string; message: string }

export function validateRoomCreate(data: RoomCreateData): ValidationResult {
  const validModes: GameMode[] = ['competitive', 'multi-board', 'cooperative', 'battle-royale', 'fog-of-war']
  if (!validModes.includes(data.mode as GameMode)) {
    return { ok: false, code: 'INVALID_MODE', message: 'Modo de jogo inválido' }
  }

  const config = data.boardConfig
  if (!config) {
    return { ok: false, code: 'INVALID_BOARD_CONFIG', message: 'Configuração do tabuleiro obrigatória' }
  }

  if (!Number.isInteger(config.rows) || config.rows < BOARD_MIN || config.rows > BOARD_MAX) {
    return { ok: false, code: 'INVALID_BOARD_CONFIG', message: `Linhas devem ser inteiro entre ${BOARD_MIN} e ${BOARD_MAX}` }
  }

  if (!Number.isInteger(config.cols) || config.cols < BOARD_MIN || config.cols > BOARD_MAX) {
    return { ok: false, code: 'INVALID_BOARD_CONFIG', message: `Colunas devem ser inteiro entre ${BOARD_MIN} e ${BOARD_MAX}` }
  }

  const maxMines = config.rows * config.cols - SAFE_AREA_CELLS
  if (!Number.isInteger(config.mines) || config.mines < 1 || config.mines > maxMines) {
    return { ok: false, code: 'INVALID_BOARD_CONFIG', message: `Minas devem ser entre 1 e ${maxMines} (área segura 3×3)` }
  }

  const mode = data.mode as GameMode
  const { min, max } = MAX_PLAYERS[mode]
  if (!Number.isInteger(data.maxPlayers) || data.maxPlayers < min || data.maxPlayers > max) {
    return { ok: false, code: 'INVALID_MAX_PLAYERS', message: `Max players para ${mode} deve ser entre ${min} e ${max}` }
  }

  let timeLimit = data.timeLimit
  if (!TIME_LIMITS.has(timeLimit)) {
    return { ok: false, code: 'INVALID_TIME_LIMIT', message: 'Time limit inválido' }
  }

  if (mode === 'cooperative') {
    timeLimit = 0
  }

  return { ok: true, timeLimit }
}
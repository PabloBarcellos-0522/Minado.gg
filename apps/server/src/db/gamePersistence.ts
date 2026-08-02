import { prisma } from './prisma.js'
import {
  GameMode,
  BoardConfig,
  XP_BASE_BY_MODE,
  XP_WIN_BONUS,
  XP_PER_SCORE_UNIT,
  levelForXp,
} from '@minado/shared'
import type { GameEndReason, PlayerAction } from '../game/GameManager.js'

export interface GamePersistenceInput {
  roomId: string
  mode: GameMode
  config: BoardConfig
  startedAt: Date
  endedAt: Date
  reason: GameEndReason
  scoreboard: Array<{ playerId: string; score: number; rank: number }>
  actions: Record<string, PlayerAction[]>
  explodedPlayers: string[]
}

const persistedKeys = new Set<string>()

function isAlreadyPersisted(input: GamePersistenceInput): boolean {
  const key = `${input.roomId}:${input.startedAt.getTime()}`
  return persistedKeys.has(key)
}

export function computeIsVictory(mode: GameMode, reason: GameEndReason, rank: number): boolean {
  if (mode === 'cooperative') {
    return reason === 'win'
  }
  return rank === 1
}

export function computeXp(mode: GameMode, score: number, isVictory: boolean): number {
  const base = XP_BASE_BY_MODE[mode] ?? 100
  const winBonus = isVictory ? XP_WIN_BONUS : 0
  const fromScore = Math.floor(score / XP_PER_SCORE_UNIT)
  return base + winBonus + fromScore
}

export function computeStreak(currentStreak: number, maxStreak: number, isVictory: boolean) {
  if (isVictory) {
    return {
      currentStreak: currentStreak + 1,
      maxStreak: Math.max(maxStreak, currentStreak + 1),
    }
  }
  return {
    currentStreak: 0,
    maxStreak,
  }
}

export async function persistMatch(input: GamePersistenceInput): Promise<string | null> {
  if (input.scoreboard.length === 0) {
    console.warn('[persistMatch] empty scoreboard, nothing to persist')
    return null
  }

  if (isAlreadyPersisted(input)) {
    return null
  }

  // Guard no banco
  const existing = await prisma.match.findFirst({
    where: { roomId: input.roomId, startedAt: input.startedAt },
  })
  if (existing) {
    const key = `${input.roomId}:${input.startedAt.getTime()}`
    persistedKeys.add(key)
    return null
  }

  const matchId = await prisma.$transaction(async (tx) => {
    // 1. Create Match
    const match = await tx.match.create({
      data: {
        mode: input.mode,
        boardRows: input.config.rows,
        boardCols: input.config.cols,
        mineCount: input.config.mines,
        status: 'finished',
        startedAt: input.startedAt,
        endedAt: input.endedAt,
        roomId: input.roomId,
        players: {
          create: input.scoreboard.map((entry) => ({
            userId: entry.playerId,
            score: entry.score,
            rank: entry.rank,
            exploded: input.explodedPlayers.includes(entry.playerId),
            actions: input.actions[entry.playerId] ?? [],
          })),
        },
      },
    })

    // 2-3. Update Stats + User XP/Level for each player
    for (const entry of input.scoreboard) {
      const isVictory = computeIsVictory(input.mode, input.reason, entry.rank)
      const xpGain = computeXp(input.mode, entry.score, isVictory)

      // Stats upsert
      const currentStats = await tx.stats.findUnique({ where: { userId: entry.playerId } })
      const curStreak = currentStats?.currentStreak ?? 0
      const maxStreak = currentStats?.maxStreak ?? 0
      const curRank = currentStats?.rank ?? 0
      const newStreak = computeStreak(curStreak, maxStreak, isVictory)
      const newRank = curRank === 0 ? entry.rank : Math.min(curRank, entry.rank)

      await tx.stats.upsert({
        where: { userId: entry.playerId },
        create: {
          userId: entry.playerId,
          victories: isVictory ? 1 : 0,
          defeats: isVictory ? 0 : 1,
          matchesPlayed: 1,
          currentStreak: newStreak.currentStreak,
          maxStreak: newStreak.maxStreak,
          rank: newRank,
        },
        update: {
          victories: { increment: isVictory ? 1 : 0 },
          defeats: { increment: isVictory ? 0 : 1 },
          matchesPlayed: { increment: 1 },
          currentStreak: { set: newStreak.currentStreak },
          maxStreak: { set: newStreak.maxStreak },
          rank: { set: newRank },
        },
      })

      // User XP + Level
      const user = await tx.user.findUnique({ where: { id: entry.playerId } })
      if (user) {
        const newXp = user.xp + xpGain
        await tx.user.update({
          where: { id: entry.playerId },
          data: { xp: newXp, level: levelForXp(newXp) },
        })
      }
    }

    return match.id
  })

  const key = `${input.roomId}:${input.startedAt.getTime()}`
  persistedKeys.add(key)
  return matchId
}
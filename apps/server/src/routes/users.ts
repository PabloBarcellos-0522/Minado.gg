import { Router, type Request, type Response } from 'express'
import { prisma } from '../db/prisma.js'

const router = Router()

router.get('/ranking', async (req: Request, res: Response) => {
  const period = (req.query.period as string) ?? 'global'
  const validPeriods = ['global', 'weekly', 'monthly']
  const p = validPeriods.includes(period) ? period : 'global'

  if (p === 'global') {
    // Existing behavior: top 100 by xp desc
    const users = await prisma.user.findMany({
      take: 100,
      orderBy: { xp: 'desc' },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        xp: true,
        level: true,
        stats: { select: { victories: true, matchesPlayed: true } },
      },
    })
    return res.json(users.map((u, i) => ({ rank: i + 1, ...u })))
  }

  // Weekly / Monthly: aggregate MatchPlayer.score by user over period
  const days = p === 'weekly' ? 7 : 30
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const agg = await prisma.matchPlayer.groupBy({
    by: ['userId'],
    where: { match: { startedAt: { gte: since } } },
    _sum: { score: true },
  })

  const ids = agg.map((a) => a.userId)
  const users = await prisma.user.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      xp: true,
      level: true,
      stats: { select: { victories: true, matchesPlayed: true } },
    },
  })

  const scored = users.map((u) => ({
    ...u,
    periodScore: agg.find((a) => a.userId === u.id)?._sum.score ?? 0,
  }))

  scored.sort(
    (a, b) =>
      b.periodScore - a.periodScore ||
      b.xp - a.xp ||
      (b.stats?.victories ?? 0) - (a.stats?.victories ?? 0)
  )

  res.json(scored.slice(0, 100).map((u, i) => ({ rank: i + 1, ...u })))
})

router.get('/:username', async (req: Request, res: Response) => {
  const username = String(req.params.username)
  const user = await prisma.user.findUnique({
    where: { username },
    include: { stats: true },
  })
  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado' })
    return
  }

  const achievements = await prisma.userAchievement.findMany({
    where: { userId: user.id },
    include: { achievement: true },
    orderBy: { unlockedAt: 'desc' },
  })

  res.json({
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    xp: user.xp,
    level: user.level,
    stats: user.stats,
    achievements: achievements.map((ua) => ({
      id: ua.achievement.id,
      title: ua.achievement.title,
      description: ua.achievement.description,
      condition: ua.achievement.condition,
      unlockedAt: ua.unlockedAt,
    })),
    createdAt: user.createdAt,
  })
})

export default router

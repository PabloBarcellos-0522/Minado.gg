import { Router, type Request, type Response } from 'express'
import { prisma } from '../db/prisma.js'

const router = Router()

router.get('/ranking', async (_req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    orderBy: { xp: 'desc' },
    take: 100,
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      xp: true,
      level: true,
      stats: { select: { victories: true, matchesPlayed: true } },
    },
  })
  res.json(users.map((u, i) => ({ rank: i + 1, ...u })))
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

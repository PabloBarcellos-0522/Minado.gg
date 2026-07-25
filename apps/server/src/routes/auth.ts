import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../db/prisma.js'
import { signToken, authMiddleware } from '../middleware/auth.js'

const router = Router()

router.post('/register', async (req: Request, res: Response) => {
  const { username, email, password } = req.body as { username: string; email: string; password: string }

  if (!username || !email || !password) {
    res.status(400).json({ error: 'Campos obrigatórios: username, email, password' })
    return
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  })
  if (existing) {
    res.status(409).json({ error: 'Email ou username já cadastrado' })
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: { username, email, password: passwordHash },
  })

  await prisma.stats.create({
    data: { userId: user.id },
  })

  const token = signToken({ userId: user.id, username: user.username })
  res.status(201).json({
    token,
    user: { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl },
  })
})

router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string }

  if (!email || !password) {
    res.status(400).json({ error: 'Campos obrigatórios: email, password' })
    return
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.password) {
    res.status(401).json({ error: 'Credenciais inválidas' })
    return
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    res.status(401).json({ error: 'Credenciais inválidas' })
    return
  }

  const token = signToken({ userId: user.id, username: user.username })
  res.json({
    token,
    user: { id: user.id, username: user.username, email: user.email, avatarUrl: user.avatarUrl },
  })
})

router.get('/me', authMiddleware, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    include: { stats: true },
  })
  if (!user) {
    res.status(404).json({ error: 'Usuário não encontrado' })
    return
  }

  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    xp: user.xp,
    level: user.level,
    stats: user.stats,
  })
})

export default router

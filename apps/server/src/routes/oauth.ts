import { Router, type Request, type Response } from 'express'
import axios from 'axios'
import { prisma } from '../db/prisma.js'
import { signToken } from '../middleware/auth.js'

const router = Router()

interface OAuthProfile {
  provider: string
  providerId: string
  email: string
  username: string
  avatarUrl?: string
}

async function findOrCreateUser(profile: OAuthProfile) {
  const existingAccount = await prisma.account.findUnique({
    where: { provider_providerId: { provider: profile.provider, providerId: profile.providerId } },
    include: { user: { include: { stats: true } } },
  })
  if (existingAccount) {
    const token = signToken({ userId: existingAccount.user.id, username: existingAccount.user.username })
    return { token, user: existingAccount.user }
  }

  const existingUser = await prisma.user.findUnique({ where: { email: profile.email } })
  if (existingUser) {
    await prisma.account.create({
      data: {
        userId: existingUser.id,
        provider: profile.provider,
        providerId: profile.providerId,
      },
    })
    const token = signToken({ userId: existingUser.id, username: existingUser.username })
    return { token, user: existingUser }
  }

  const user = await prisma.user.create({
    data: {
      username: profile.username,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
    },
  })

  await prisma.stats.create({ data: { userId: user.id } })
  await prisma.account.create({
    data: {
      userId: user.id,
      provider: profile.provider,
      providerId: profile.providerId,
    },
  })

  const token = signToken({ userId: user.id, username: user.username })
  return { token, user }
}

router.post('/oauth/google', async (req: Request, res: Response) => {
  const { accessToken } = req.body as { accessToken: string }
  const { data } = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  const result = await findOrCreateUser({
    provider: 'google',
    providerId: data.id,
    email: data.email,
    username: data.name || data.email.split('@')[0],
    avatarUrl: data.picture,
  })

  res.json(result)
})

router.post('/oauth/discord', async (req: Request, res: Response) => {
  const { accessToken } = req.body as { accessToken: string }
  const { data } = await axios.get('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  const result = await findOrCreateUser({
    provider: 'discord',
    providerId: data.id,
    email: data.email,
    username: data.username,
    avatarUrl: data.avatar
      ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
      : undefined,
  })

  res.json(result)
})

router.post('/oauth/github', async (req: Request, res: Response) => {
  const { accessToken } = req.body as { accessToken: string }
  const { data } = await axios.get('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  const emails = await axios.get('https://api.github.com/user/emails', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const primaryEmail = emails.data.find((e: any) => e.primary)?.email || emails.data[0]?.email

  const result = await findOrCreateUser({
    provider: 'github',
    providerId: String(data.id),
    email: primaryEmail || `${data.login}@github.local`,
    username: data.login,
    avatarUrl: data.avatar_url,
  })

  res.json(result)
})

export default router

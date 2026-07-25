import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { setupRoomHandlers } from './sockets/roomHandler.js'
import { setupGameHandlers } from './sockets/gameHandler.js'
import { RoomManager } from './rooms/RoomManager.js'
import authRoutes from './routes/auth.js'
import oauthRoutes from './routes/oauth.js'
import { verifyToken } from './middleware/auth.js'
import type { Socket } from 'socket.io'

const PORT = parseInt(process.env.PORT || '3001', 10)
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
  },
})

const roomManager = new RoomManager()

app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/auth', oauthRoutes)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', rooms: roomManager.getRoomCount() })
})

io.use((socket: Socket, next) => {
  const token = socket.handshake.auth?.token
  if (!token) {
    return next(new Error('Token não fornecido'))
  }
  try {
    const payload = verifyToken(token)
    ;(socket as any).user = payload
    ;(socket as any).userId = payload.userId
    ;(socket as any).username = payload.username
    next()
  } catch {
    next(new Error('Token inválido ou expirado'))
  }
})

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id} (${(socket as any).username})`)

  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id}`)
    roomManager.handleDisconnect(socket.id)
  })

  setupRoomHandlers(io, socket, roomManager)
  setupGameHandlers(io, socket, roomManager)
})

httpServer.listen(PORT, () => {
  console.log(`[server] running on http://localhost:${PORT}`)
})

import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { setupRoomHandlers } from './sockets/roomHandler.js'
import { setupGameHandlers } from './sockets/gameHandler.js'
import { GameManager } from './game/GameManager.js'
import { RoomManager } from './rooms/RoomManager.js'
import authRoutes from './routes/auth.js'
import oauthRoutes from './routes/oauth.js'
import usersRoutes from './routes/users.js'
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

const gameManager = new GameManager()
const roomManager = new RoomManager()

gameManager.onGameEnded = (roomId, scoreboard, reason) => {
  if (reason === 'eliminated') return
  const state = gameManager['games'].get(roomId)
  io.to(roomId).emit('game:ended', {
    result: reason,
    scoreboard: scoreboard.map((entry, i) => ({
      playerId: entry.playerId,
      score: entry.score,
      rank: i + 1,
    })),
    actions: state?.actions ?? [],
  })
  const room = roomManager.getRoom(roomId)
  if (room) {
    room.status = 'finished'
    io.to(roomId).emit('room:state', room)
  }
}

roomManager.onPlayerRemoved = (roomId, playerId, playerUsername) => {
  gameManager.removePlayerBoard(roomId, playerId)
  io.to(roomId).emit('room:playerLeft', { playerId })
  const room = roomManager.getRoom(roomId)
  if (room && room.status === 'playing') {
    io.to(roomId).emit('game:playerRemoved', { playerId, username: playerUsername })
  }
}

app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }))
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/auth', oauthRoutes)
app.use('/api/users', usersRoutes)

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

  socket.on('disconnect', (reason) => {
    console.log(`[disconnect] socket=${socket.id} user=${(socket as any).username} reason=${reason}`)
    const result = roomManager.markPlayerDisconnected(socket.id)
    if (result) {
      const { roomId } = result
      const room = roomManager.getRoom(roomId)
      if (room) {
        io.to(room.id).emit('room:state', room)
      }
      io.emit('room:list', roomManager.getPublicRooms())
    }
  })

  setupRoomHandlers(io, socket, roomManager, gameManager)
  setupGameHandlers(io, socket, roomManager, gameManager)
})

httpServer.listen(PORT, () => {
  console.log(`[server] running on http://localhost:${PORT}`)
})

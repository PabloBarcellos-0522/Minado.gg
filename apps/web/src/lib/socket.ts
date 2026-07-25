import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

function getStoredToken(): string | null {
  try {
    const raw = localStorage.getItem('minado-auth')
    if (!raw) return null
    return JSON.parse(raw).state?.token || null
  } catch {
    return null
  }
}

export function getSocket(): Socket {
  if (!socket) {
    const token = getStoredToken()
    socket = io(SERVER_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
      auth: { token },
    })

    socket.on('connect', () => {
      console.log('[socket] connected:', socket?.id)
    })

    socket.on('disconnect', (reason) => {
      console.log('[socket] disconnected:', reason)
    })

    socket.on('connect_error', (err) => {
      console.warn('[socket] connection error:', err.message)
    })
  }
  return socket
}

export function connectSocket(): void {
  const s = getSocket()
  if (!s.connected) {
    const token = getStoredToken()
    s.auth = { token }
    s.connect()
  }
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect()
  }
}

export function onSocketEvent<T = unknown>(event: string, handler: (data: T) => void): () => void {
  const s = getSocket()
  s.on(event, handler)
  return () => {
    s.off(event, handler)
  }
}

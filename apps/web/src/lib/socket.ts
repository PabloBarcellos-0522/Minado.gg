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
    socket = io(SERVER_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    })

    socket.on('connect', () => {
      console.log('[socket] connected:', socket?.id)
    })

    socket.on('disconnect', (reason) => {
      console.log('[socket] disconnected:', reason)
    })

    socket.on('connect_error', (err) => {
      console.warn('[socket] connection error:', err.message)
      const freshToken = getStoredToken()
      if (freshToken && err.message === 'Token não fornecido') {
        socket!.auth = { token: freshToken }
        socket!.connect()
      }
    })
  }
  return socket
}

export function connectSocket(): void {
  const s = getSocket()
  if (s.connected) return
  const token = getStoredToken()
  if (!token) {
    console.warn('[socket] no token found, skipping connection')
    return
  }
  s.auth = { token }
  s.connect()
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect()
  }
}

export function waitForConnection(timeout = 5000): Promise<void> {
  const s = getSocket()
  if (s.connected) return Promise.resolve()
  if (!s.connected) {
    connectSocket()
  }
  return new Promise((resolve, reject) => {
    const onConnect = () => {
      s.off('connect', onConnect)
      s.off('connect_error', onError)
      resolve()
    }
    const onError = (err: Error) => {
      s.off('connect', onConnect)
      s.off('connect_error', onError)
      reject(err)
    }
    s.on('connect', onConnect)
    s.on('connect_error', onError)
    setTimeout(() => {
      s.off('connect', onConnect)
      s.off('connect_error', onError)
      reject(new Error('Timeout aguardando conexão'))
    }, timeout)
  })
}

export function onSocketEvent<T = unknown>(event: string, handler: (data: T) => void): () => void {
  const s = getSocket()
  s.on(event, handler)
  return () => {
    s.off(event, handler)
  }
}

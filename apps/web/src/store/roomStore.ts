import { create } from 'zustand'
import type { Room, GameMode, Difficulty, BoardConfig, Board } from '@minado/shared'
import { getSocket, onSocketEvent, waitForConnection } from '@/lib/socket'
import { useAuthStore } from './authStore'

export interface RoomWithName extends Room {
  name: string
}

interface RoomState {
  rooms: RoomWithName[]
  currentRoom: RoomWithName | null
  isLoading: boolean
  error: string | null
  isConnected: boolean

  fetchRooms: () => Promise<void>
  createRoom: (name: string, mode: GameMode, difficulty: Difficulty, isPrivate: boolean, password: string, maxPlayers: number, boardConfig?: BoardConfig, timeLimit?: number) => Promise<string>
  joinRoom: (roomId: string) => Promise<void>
  leaveRoom: () => void
  toggleReady: () => void
  startGame: () => Promise<void>
  setCurrentRoom: (room: RoomWithName | null) => void
  addPlayer: (player: RoomWithName['players'][0]) => void
  removePlayer: (playerId: string) => void
  updatePlayerReady: (playerId: string, isReady: boolean) => void
  updateRoomStatus: (status: Room['status']) => void
  initSocketListeners: () => () => void
}

export const useRoomStore = create<RoomState>()((set, get) => ({
  rooms: [],
  currentRoom: null,
  isLoading: false,
  error: null,
  isConnected: false,

  initSocketListeners: () => {
    const socket = getSocket()
    if (socket.connected) set({ isConnected: true })

    const unsubs = [
      onSocketEvent('connect', () => {
        set({ isConnected: true })
        get().fetchRooms()
        const roomId = get().currentRoom?.id
        if (roomId) getSocket().emit('room:join', { roomId })
      }),
      onSocketEvent('disconnect', () => set({ isConnected: false })),
      onSocketEvent('room:list', (rooms: unknown) => {
        set({ rooms: rooms as RoomWithName[] })
      }),
      onSocketEvent('room:state', (room: unknown) => {
        set({ currentRoom: room as RoomWithName })
      }),
      onSocketEvent('room:playerJoined', (player: unknown) => {
        const p = player as RoomWithName['players'][0]
        const { currentRoom } = get()
        if (currentRoom && !currentRoom.players.find((x) => x.id === p.id)) {
          set({ currentRoom: { ...currentRoom, players: [...currentRoom.players, p] } })
        }
      }),
      onSocketEvent('room:playerLeft', (data: unknown) => {
        const { playerId } = data as { playerId: string }
        const { currentRoom } = get()
        if (currentRoom) {
          set({
            currentRoom: {
              ...currentRoom,
              players: currentRoom.players.filter((p) => p.id !== playerId),
            },
          })
        }
      }),
      onSocketEvent('game:started', (data: unknown) => {
        const ev = data as {
          board?: Board
          boardMeta: { rows: number; cols: number; mines: number; mode: string }
          players: RoomWithName['players']
        }
        const { currentRoom } = get()
        if (currentRoom) {
          set({
            currentRoom: {
              ...currentRoom,
              status: 'playing',
              players: ev.players,
              boardConfig: { rows: ev.boardMeta.rows, cols: ev.boardMeta.cols, mines: ev.boardMeta.mines },
            },
          })
        }
      }),
      onSocketEvent('error', (err: unknown) => {
        const { message } = err as { code: string; message: string }
        set({ error: message })
      }),
    ]

    return () => unsubs.forEach((fn) => fn())
  },

  fetchRooms: async () => {
    const socket = getSocket()
    if (!socket.connected) {
      set({ rooms: [], isLoading: false })
      return
    }
    socket.emit('room:list')
  },

  createRoom: async (name, mode, difficulty, isPrivate, password, maxPlayers, boardConfig, timeLimit) => {
    set({ isLoading: true, error: null })
    try {
      await waitForConnection()
    } catch {
      set({ error: 'Sem conexão com o servidor', isLoading: false })
      throw new Error('Sem conexão com o servidor')
    }
    const socket = getSocket()

    return new Promise((resolve, reject) => {
      const onCreated = (room: RoomWithName) => {
        socket.off('room:created', onCreated)
        socket.off('error', onError)
        set({ currentRoom: room, isLoading: false })
        resolve(room.id)
      }
      const onError = (err: { message: string }) => {
        socket.off('room:created', onCreated)
        socket.off('error', onError)
        set({ error: err.message, isLoading: false })
        reject(new Error(err.message))
      }
      socket.on('room:created', onCreated)
      socket.on('error', onError)
      socket.emit('room:create', { name, mode, difficulty, isPrivate, password, maxPlayers, boardConfig, timeLimit })
    })
  },

  joinRoom: async (roomId: string) => {
    set({ isLoading: true, error: null })
    try {
      await waitForConnection()
    } catch {
      set({ error: 'Sem conexão com o servidor', isLoading: false })
      return
    }
    const socket = getSocket()
    const user = useAuthStore.getState().user
    socket.emit('room:join', { roomId, username: user?.username || 'Jogador' })
    set({ isLoading: false })
  },

  leaveRoom: () => {
    const { currentRoom } = get()
    if (!currentRoom) return
    const socket = getSocket()
    if (socket.connected) {
      socket.emit('room:leave')
    }
    set({ currentRoom: null })
  },

  toggleReady: () => {
    const { currentRoom } = get()
    if (!currentRoom) return
    const userId = useAuthStore.getState().user?.id
    if (!userId) return

    const playerAtual = currentRoom.players.find((p) => p.id === userId)
    if (!playerAtual) return

    const nextReady = !playerAtual.isReady

    const socket = getSocket()
    if (socket.connected) {
      socket.emit('room:ready', { ready: nextReady })
    }

    set({
      currentRoom: {
        ...currentRoom,
        players: currentRoom.players.map((p) =>
          p.id === userId ? { ...p, isReady: nextReady } : p
        ),
      },
    })
  },

  startGame: (): Promise<void> => {
    const socket = getSocket()
    if (!socket.connected) return Promise.reject(new Error('Sem conexão com o servidor'))

    return new Promise<void>((resolve, reject) => {
      const onStarted = () => {
        socket.off('room:started', onStarted)
        socket.off('error', onError)
        resolve()
      }
      const onError = (err: { message: string }) => {
        socket.off('room:started', onStarted)
        socket.off('error', onError)
        set({ error: err.message })
        reject(new Error(err.message))
      }
      socket.on('room:started', onStarted)
      socket.on('error', onError)
      socket.emit('room:start')
    })
  },

  setCurrentRoom: (room) => set({ currentRoom: room }),

  addPlayer: (player) => {
    const { currentRoom } = get()
    if (!currentRoom) return
    set({
      currentRoom: { ...currentRoom, players: [...currentRoom.players, player] },
    })
  },

  removePlayer: (playerId) => {
    const { currentRoom } = get()
    if (!currentRoom) return
    set({
      currentRoom: {
        ...currentRoom,
        players: currentRoom.players.filter((p) => p.id !== playerId),
      },
    })
  },

  updatePlayerReady: (playerId, isReady) => {
    const { currentRoom } = get()
    if (!currentRoom) return
    set({
      currentRoom: {
        ...currentRoom,
        players: currentRoom.players.map((p) =>
          p.id === playerId ? { ...p, isReady } : p
        ),
      },
    })
  },

  updateRoomStatus: (status) => {
    const { currentRoom } = get()
    if (!currentRoom) return
    set({ currentRoom: { ...currentRoom, status } })
  },
}))

import { create } from 'zustand'
import type { Room, GameMode, Difficulty, BoardConfig } from '@minado/shared'
import { getSocket, onSocketEvent } from '@/lib/socket'
import { useAuthStore } from './authStore'
import { useGameStore } from './gameStore'

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
  createRoom: (name: string, mode: GameMode, difficulty: Difficulty, isPrivate: boolean, password: string, maxPlayers: number, boardConfig?: BoardConfig) => Promise<string>
  joinRoom: (roomId: string) => Promise<void>
  leaveRoom: () => void
  toggleReady: () => void
  startGame: () => void
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
      onSocketEvent('connect', () => set({ isConnected: true })),
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
        const { boardMeta, players } = data as {
          boardMeta: { rows: number; cols: number; mines: number; mode: string }
          players: RoomWithName['players']
        }
        const { currentRoom } = get()
        if (currentRoom) {
          set({
            currentRoom: {
              ...currentRoom,
              status: 'playing',
              players,
              boardConfig: { rows: boardMeta.rows, cols: boardMeta.cols, mines: boardMeta.mines },
            },
          })
        }
        useGameStore.getState().initBoard(
          { rows: boardMeta.rows, cols: boardMeta.cols, mines: boardMeta.mines },
          boardMeta.mode as any
        )
        useGameStore.getState().setPlayers(
          players.map((p: any) => ({ id: p.id, username: p.username, score: p.score || 0, color: '' }))
        )
      }),
      onSocketEvent('error', (err: unknown) => {
        const { message } = err as { code: string; message: string }
        set({ error: message })
      }),
    ]

    return () => unsubs.forEach((fn) => fn())
  },

  fetchRooms: async () => {
    set({ isLoading: true, error: null })
    const socket = getSocket()

    if (socket.connected) {
      socket.emit('room:list')
      set({ isLoading: false })
      return
    }

    try {
      await new Promise((r) => setTimeout(r, 300))
      const mockRooms: RoomWithName[] = [
        { id: 'ABC123', name: 'Turbinados', hostId: '1', mode: 'competitive', isPrivate: false, maxPlayers: 6, status: 'waiting', players: [], boardConfig: { rows: 16, cols: 16, mines: 40 }, difficulty: 'medium' },
        { id: 'DEF456', name: 'Amigos Only', hostId: '2', mode: 'cooperative', isPrivate: true, maxPlayers: 4, status: 'waiting', players: [], boardConfig: { rows: 9, cols: 9, mines: 10 }, difficulty: 'easy' },
        { id: 'GHI789', name: 'Ranked BR', hostId: '3', mode: 'battle-royale', isPrivate: false, maxPlayers: 20, status: 'waiting', players: [], boardConfig: { rows: 9, cols: 9, mines: 10 }, difficulty: 'hard' },
      ]
      set({ rooms: mockRooms, isLoading: false })
    } catch {
      set({ error: 'Falha ao carregar salas', isLoading: false })
    }
  },

  createRoom: async (name, mode, difficulty, isPrivate, password, maxPlayers, boardConfig) => {
    set({ isLoading: true, error: null })
    const socket = getSocket()

    if (socket.connected) {
      return new Promise((resolve) => {
        const onCreated = (room: RoomWithName) => {
          socket.off('room:created', onCreated)
          set({ currentRoom: room, isLoading: false })
          resolve(room.id)
        }
        socket.on('room:created', onCreated)
        socket.emit('room:create', { name, mode, difficulty, isPrivate, password, maxPlayers, boardConfig })
      })
    }

    await new Promise((r) => setTimeout(r, 500))
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()
    const config = boardConfig || { rows: 16, cols: 16, mines: 40 }
    const userId = useAuthStore.getState().user?.id || '1'
    const username = useAuthStore.getState().user?.username || 'Você'
    const newRoom: RoomWithName = {
      id: roomId, name, hostId: userId, mode, isPrivate, maxPlayers,
      status: 'waiting', players: [
        { id: userId, username, score: 0, isReady: false, isHost: true },
      ],
      boardConfig: config, difficulty,
    }
    set({ currentRoom: newRoom, isLoading: false })
    return roomId
  },

  joinRoom: async (roomId: string) => {
    set({ isLoading: true, error: null })
    const socket = getSocket()
    const user = useAuthStore.getState().user

    if (socket.connected) {
      socket.emit('room:join', { roomId, username: user?.username || 'Jogador' })
      set({ isLoading: false })
      return
    }

    await new Promise((r) => setTimeout(r, 300))
    const userId = useAuthStore.getState().user?.id || '1'
    const username = useAuthStore.getState().user?.username || 'Você'
    const mockRoom: RoomWithName = {
      id: roomId, name: 'Sala ' + roomId, hostId: 'mock-host', mode: 'competitive',
      isPrivate: false, maxPlayers: 6, status: 'waiting',
      players: [
        { id: 'mock-host', username: 'Anfitrião', score: 0, isReady: true, isHost: true },
        { id: userId, username, score: 0, isReady: false, isHost: false },
        { id: 'mock-3', username: 'Carlos', score: 0, isReady: false, isHost: false },
      ],
      boardConfig: { rows: 16, cols: 16, mines: 40 }, difficulty: 'medium',
    }
    set({ currentRoom: mockRoom, isLoading: false })
  },

  leaveRoom: () => {
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

    const socket = getSocket()
    if (socket.connected) {
      socket.emit('room:ready', { ready: true })
    }

    set({
      currentRoom: {
        ...currentRoom,
        players: currentRoom.players.map((p) =>
          p.id === userId ? { ...p, isReady: !p.isReady } : p
        ),
      },
    })
  },

  startGame: () => {
    const socket = getSocket()
    if (socket.connected) {
      socket.emit('room:start')
      return
    }
    const { currentRoom } = get()
    if (currentRoom) {
      set({ currentRoom: { ...currentRoom, status: 'playing' } })
    }
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

import type { Room, GameMode, Difficulty, BoardConfig, Player } from '@minado/shared'

interface RoomData extends Room {
  name: string
  password?: string
  playerSockets: Map<string, string>
  createdAt: number
}

const DISCONNECT_TIMEOUT_MS = 60_000 // 1 minute
const REMOVED_PLAYER_TTL_MS = 300_000 // 5 minutes cleanup

export class RoomManager {
  private rooms: Map<string, RoomData> = new Map()
  private socketToRoom: Map<string, string> = new Map()
  private playerTimers: Map<string, NodeJS.Timeout> = new Map() // playerId -> cleanup timer
  private disconnectedPlayers: Map<string, { roomId: string; username: string; timestamp: number }> = new Map()

  onPlayerRemoved?: (roomId: string, playerId: string, playerUsername: string) => void

  createRoom(data: {
    name: string
    hostId: string
    hostSocketId: string
    hostUsername: string
    mode: GameMode
    difficulty: Difficulty
    isPrivate: boolean
    password?: string
    maxPlayers: number
    boardConfig: BoardConfig
    timeLimit: number
  }): RoomData {
    const id = this.generateRoomId()
    const room: RoomData = {
      id,
      name: data.name,
      hostId: data.hostId,
      mode: data.mode,
      difficulty: data.difficulty,
      isPrivate: data.isPrivate,
      password: data.password,
      maxPlayers: data.maxPlayers,
      timeLimit: data.timeLimit,
      status: 'waiting',
      players: [{
        id: data.hostId,
        username: data.hostUsername,
        score: 0,
        isReady: false,
        isHost: true,
        isConnected: true,
      }],
      boardConfig: data.boardConfig,
      playerSockets: new Map([[data.hostId, data.hostSocketId]]),
      createdAt: Date.now(),
    }
    this.rooms.set(id, room)
    this.socketToRoom.set(data.hostSocketId, id)
    return room
  }

  getRoom(roomId: string): RoomData | undefined {
    return this.rooms.get(roomId)
  }

  getRoomBySocket(socketId: string): RoomData | undefined {
    const roomId = this.socketToRoom.get(socketId)
    if (!roomId) return undefined
    return this.rooms.get(roomId)
  }

  getPublicRooms(): Array<Omit<RoomData, 'playerSockets' | 'password' | 'createdAt'>> {
    const result: Array<Omit<RoomData, 'playerSockets' | 'password' | 'createdAt'>> = []
    for (const room of this.rooms.values()) {
      if (!room.isPrivate && room.status === 'waiting') {
        const { playerSockets, password, createdAt, ...safe } = room
        result.push({ ...safe })
      }
    }
    return result
  }

  rejoinRoom(roomId: string, playerId: string, socketId: string): RoomData | null {
    const room = this.rooms.get(roomId)
    if (!room) return null
    room.playerSockets.set(playerId, socketId)
    this.socketToRoom.set(socketId, roomId)
    this.cancelDisconnectTimer(playerId)
    // Restore connected status
    room.players = room.players.map((p) =>
      p.id === playerId ? { ...p, isConnected: true } : p
    )
    return room
  }

  addPlayer(roomId: string, player: { id: string; username: string }, socketId: string): RoomData | null {
    const room = this.rooms.get(roomId)
    if (!room) return null
    if (room.players.length >= room.maxPlayers) return null
    if (room.status !== 'waiting') return null
    if (room.players.some((p) => p.id === player.id)) return null

    room.players.push({
      id: player.id,
      username: player.username,
      score: 0,
      isReady: false,
      isHost: false,
      isConnected: true,
    })
    room.playerSockets.set(player.id, socketId)
    this.socketToRoom.set(socketId, roomId)
    return room
  }

  removePlayer(roomId: string, playerId: string): RoomData | null {
    const room = this.rooms.get(roomId)
    if (!room) return null
    const removedPlayer = room.players.find((p) => p.id === playerId)
    console.log(`[removePlayer] roomId=${roomId} playerId=${playerId} username=${removedPlayer?.username} playerCount=${room.players.length}`)

    this.cancelDisconnectTimer(playerId)

    const socketId = room.playerSockets.get(playerId)
    if (socketId) {
      this.socketToRoom.delete(socketId)
      room.playerSockets.delete(playerId)
    }

    room.players = room.players.filter((p) => p.id !== playerId)

    if (removedPlayer) {
      this.disconnectedPlayers.set(playerId, {
        roomId,
        username: removedPlayer.username,
        timestamp: Date.now(),
      })
    }

    this.onPlayerRemoved?.(roomId, playerId, removedPlayer?.username || '')

    if (room.players.length === 0) {
      console.log(`[removePlayer] DELETING room ${roomId} (no players left)`)
      this.rooms.delete(roomId)
      return null
    }

    if (room.hostId === playerId) {
      const newHost = room.players[0]
      room.hostId = newHost.id
      room.players = room.players.map((p) => ({
        ...p,
        isHost: p.id === newHost.id,
      }))
    }

    return room
  }

  markPlayerDisconnected(socketId: string): { roomId: string; playerId: string } | null {
    const roomId = this.socketToRoom.get(socketId)
    if (!roomId) return null

    const room = this.rooms.get(roomId)
    if (!room) return null

    let playerId: string | undefined
    for (const [pid, sid] of room.playerSockets) {
      if (sid === socketId) {
        playerId = pid
        break
      }
    }
    if (!playerId) return roomId ? { roomId, playerId: '' } : null

    this.socketToRoom.delete(socketId)
    room.playerSockets.delete(playerId)

    // Mark as disconnected in the player list
    room.players = room.players.map((p) =>
      p.id === playerId ? { ...p, isConnected: false } : p
    )

    // Start cleanup timer
    this.playerTimers.set(playerId, setTimeout(() => {
      console.log(`[disconnect timeout] removing player ${playerId} from room ${roomId}`)
      this.removePlayer(roomId, playerId)
    }, DISCONNECT_TIMEOUT_MS))

    return { roomId, playerId }
  }

  private cancelDisconnectTimer(playerId: string): void {
    const timer = this.playerTimers.get(playerId)
    if (timer) {
      clearTimeout(timer)
      this.playerTimers.delete(playerId)
    }
  }

  toggleReady(roomId: string, playerId: string): RoomData | null {
    const room = this.rooms.get(roomId)
    if (!room) return null

    room.players = room.players.map((p) =>
      p.id === playerId ? { ...p, isReady: !p.isReady } : p
    )
    return room
  }

  startGame(roomId: string): RoomData | null {
    const room = this.rooms.get(roomId)
    if (!room) return null
    room.status = 'playing'
    return room
  }

  handleDisconnect(socketId: string): void {
    this.markPlayerDisconnected(socketId)
  }

  getRemovedPlayer(playerId: string): { roomId: string; username: string } | null {
    const entry = this.disconnectedPlayers.get(playerId)
    if (!entry) return null
    if (Date.now() - entry.timestamp > REMOVED_PLAYER_TTL_MS) {
      this.disconnectedPlayers.delete(playerId)
      return null
    }
    return { roomId: entry.roomId, username: entry.username }
  }

  removeRemovedPlayer(playerId: string): void {
    this.disconnectedPlayers.delete(playerId)
  }

  getRoomCount(): number {
    return this.rooms.size
  }

  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }
}

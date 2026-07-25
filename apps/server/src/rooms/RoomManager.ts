import type { Room, GameMode, Difficulty, BoardConfig } from '@minado/shared'

interface RoomData extends Room {
  name: string
  password?: string
  playerSockets: Map<string, string>
  createdAt: number
}

export class RoomManager {
  private rooms: Map<string, RoomData> = new Map()
  private socketToRoom: Map<string, string> = new Map()

  createRoom(data: {
    name: string
    hostId: string
    hostSocketId: string
    mode: GameMode
    difficulty: Difficulty
    isPrivate: boolean
    password?: string
    maxPlayers: number
    boardConfig: BoardConfig
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
      status: 'waiting',
      players: [{
        id: data.hostId,
        username: 'Host',
        score: 0,
        isReady: false,
        isHost: true,
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

  addPlayer(roomId: string, player: { id: string; username: string }, socketId: string): RoomData | null {
    const room = this.rooms.get(roomId)
    if (!room) return null
    if (room.players.length >= room.maxPlayers) return null
    if (room.status !== 'waiting') return null

    room.players.push({
      id: player.id,
      username: player.username,
      score: 0,
      isReady: false,
      isHost: false,
    })
    room.playerSockets.set(player.id, socketId)
    this.socketToRoom.set(socketId, roomId)
    return room
  }

  removePlayer(roomId: string, playerId: string): RoomData | null {
    const room = this.rooms.get(roomId)
    if (!room) return null

    const socketId = room.playerSockets.get(playerId)
    if (socketId) {
      this.socketToRoom.delete(socketId)
      room.playerSockets.delete(playerId)
    }

    room.players = room.players.filter((p) => p.id !== playerId)

    if (room.players.length === 0) {
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
    const roomId = this.socketToRoom.get(socketId)
    if (!roomId) return

    const room = this.rooms.get(roomId)
    if (!room) return

    let playerId: string | undefined
    for (const [pid, sid] of room.playerSockets) {
      if (sid === socketId) {
        playerId = pid
        break
      }
    }

    if (playerId) {
      this.removePlayer(roomId, playerId)
    }
  }

  getRoomCount(): number {
    return this.rooms.size
  }

  private generateRoomId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }
}

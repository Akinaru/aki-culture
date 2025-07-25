export type Room = {
  code: string
  name: string
  isPrivate: boolean
  createdAt: string
  players: { id: string; role: string }[]
  hostId: string
  playerIds: string[]
  maxPlayers?: number
  host?: {
    pseudo?: string | null
    email?: string | null
    role?: string
    [key: string]: any
  }
}
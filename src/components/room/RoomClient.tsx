"use client"

import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useEffect, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getSocket } from "@/lib/socket"
import { getCurrentRoomCode, setCurrentRoomCode } from "@/lib/roomState"
import type { Socket } from "socket.io-client"
import { Trash2 } from "lucide-react"
import { UserBadge } from "@/lib/user-badge"

type Room = {
  code: string
  name: string
  isPrivate: boolean
  host: { email: string; pseudo?: string }
  players: { id: string; pseudo: string, role: string }[]
}

export default function RoomClient({ code }: { code: string }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    const fetchRoom = async () => {
      const res = await fetch(`/api/room/${code}`)
      if (!res.ok) {
        router.push("/")
        return
      }
      const data = await res.json()
      setRoom(data)
      setLoading(false)
    }

    fetchRoom()
  }, [code, router])

  useEffect(() => {
    const socket = getSocket()
    socketRef.current = socket

    socket.on("room_update", (data: Room) => {
      const isSame =
        room &&
        room.code === data.code &&
        room.players.length === data.players.length &&
        room.players.every((p, i) => p.id === data.players[i]?.id)

      if (!isSame) {
        setRoom(data)
      }
    })

    socket.on("room_deleted", () => {
      setCurrentRoomCode(null)
      router.push("/")
    })

    return () => {
      socket.off("room_update")
      socket.off("room_deleted")
    }
  }, [router, room])

  useEffect(() => {
    if (!session?.user || !socketRef.current) return

    const socket = socketRef.current

    if (getCurrentRoomCode() !== code) {
      socket.emit("join_room", code, session.user.id, session.user.pseudo || "")
      setCurrentRoomCode(code)
    }
  }, [code, session])

  const handleDelete = async () => {
    if (!room || loading) return

    const res = await fetch(`/api/room/${room.code}`, { method: "DELETE" })
    if (res.ok) {
      socketRef.current?.emit("room_deleted", room.code)
      setCurrentRoomCode(null)
      router.push("/")
    } else {
      alert("Erreur lors de la suppression de la room.")
    }
  }

  const handleLeave = () => {
    if (!room || !session?.user || !socketRef.current) return
    socketRef.current.emit("leave_room", room.code, session.user.id)
    setCurrentRoomCode(null)
    setRoom(null)
    router.push("/")
  }

  const handleKick = (playerId: string) => {
    if (!room || !socketRef.current) return
    socketRef.current.emit("kick_player", room.code, playerId)
  }

  if (loading) return <div className="p-4">Chargement...</div>
  if (!session || !room) return null

  const isHost = session.user.email === room.host.email

  return (
    <main className="max-w-4xl mx-auto py-10 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{room.name}</h1>
        {room.isPrivate && <Badge variant="destructive">Privée</Badge>}
      </div>

      <div className="space-y-1 text-muted-foreground text-sm">
        <p>
          Code : <span className="font-mono">{room.code}</span>
        </p>
        <p>
          Hôte : <strong>{room.host?.pseudo || room.host?.email}{isHost && " (vous)"}</strong>
        </p>
        <p>
          Joueurs : <strong>{room.players.length}</strong>
        </p>

        <section className="mt-4">
          <h2 className="font-semibold mb-2 text-sm text-muted-foreground">Liste des joueurs :</h2>
          <ul className="text-sm space-y-1">
            {room.players.map((player) => {
              const isMe = player.id === session.user.id
              return (
                <li key={player.id} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <UserBadge role={player.role as "ADMIN" | "MOD" | "GUEST"} size="sm" />
                    <span>
                      {player.pseudo}
                      {isMe && " (vous)"}
                    </span>
                  </div>
                  {isHost && !isMe && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleKick(player.id)}
                      className="text-red-500"
                      title="Exclure ce joueur"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>

      </div>

      <div className="flex gap-4">
        {isHost && (
          <Button variant="destructive" onClick={handleDelete}>
            Supprimer la room
          </Button>
        )}

        <Button onClick={handleLeave}>Quitter la room</Button>
      </div>

      <section className="space-y-4 mt-8">
        <h2 className="text-xl font-semibold">Chat</h2>
        <div className="border rounded-lg h-64 p-4 overflow-y-auto bg-muted">
          <div className="text-sm text-muted-foreground italic">Aucun message pour le moment</div>
        </div>
        <form className="flex gap-2">
          <Input placeholder="Votre message..." className="flex-1" />
          <Button type="submit">Envoyer</Button>
        </form>
      </section>
    </main>
  )
}

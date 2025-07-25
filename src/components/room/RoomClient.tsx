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
import { toast } from "sonner"
import { format } from "date-fns"
import { fr } from "date-fns/locale"

type Room = {
  code: string
  name: string
  isPrivate: boolean
  host: { email: string; pseudo?: string }
  players: { id: string; pseudo: string; role: string }[]
  messages?: {
    id: string
    content: string
    createdAt: string
    user?: {
      id: string
      pseudo?: string | null
      role: string
    } | null
  }[]
}

export default function RoomClient({ code }: { code: string }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Room["messages"]>([])
  const socketRef = useRef<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const CHAT_COOLDOWN_MS = 1500
  const lastMessageTimestampRef = { current: 0 }

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

      const msgRes = await fetch(`/api/room/${code}/messages`)
      if (msgRes.ok) {
        const msgs = await msgRes.json()
        setMessages(msgs)
      }
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

    socket.on("new_message", (msg) => {
      setMessages((prev) => [...(prev || []), msg])
    })

    return () => {
      socket.off("room_update")
      socket.off("room_deleted")
      socket.off("new_message")
    }
  }, [router, room])

  useEffect(() => {
    if (!session?.user || !socketRef.current) return

    const socket = socketRef.current

    if (getCurrentRoomCode() !== code) {
      socket.emit("join_room", code, session.user.id, session.user.pseudo || "")
      socket.emit("send_message", {
        roomCode: code,
        userId: null,
        content: `${session.user.pseudo || "Un joueur"} a rejoint la room.`,
      })
      setCurrentRoomCode(code)
    }
  }, [code, session])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

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
    socketRef.current.emit("send_message", {
      roomCode: room.code,
      userId: null,
      content: `${session.user.pseudo || "Un joueur"} a quitté la room.`,
    })
    socketRef.current.emit("leave_room", room.code, session.user.id)
    setCurrentRoomCode(null)
    setRoom(null)
    router.push("/")
  }

  const handleKick = (playerId: string) => {
    if (!room || !socketRef.current) return
    socketRef.current.emit("kick_player", room.code, playerId)
  }

  const handleSubmitMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = message.trim()
    if (!trimmed || !session?.user || !socketRef.current) return

    const now = Date.now()
    if (now - lastMessageTimestampRef.current < CHAT_COOLDOWN_MS) {
      toast.warning("Veuillez patienter avant d'envoyer un nouveau message.")
      return
    }
    lastMessageTimestampRef.current = now

    socketRef.current.emit("send_message", {
      roomCode: code,
      userId: session.user.id,
      content: trimmed,
    })

    setMessage("")
  }

  if (loading)
    return (
      <div className="p-8 text-center text-muted-foreground italic animate-pulse">
        Chargement de la room...
      </div>
    )
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
        {isHost ? (
          <Button variant="destructive" onClick={handleDelete}>
            Supprimer la room
          </Button>
        ) : (
          <Button onClick={handleLeave}>Quitter la room</Button>
        )}
      </div>

     <section className="space-y-4 mt-8">
        <h2 className="text-xl font-semibold">Chat</h2>
        <div className="border rounded-lg h-64 p-4 overflow-y-auto bg-muted text-sm space-y-2 scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent">
          {messages && messages.length > 0 ? (
            messages.map((msg) => (
              <div key={msg.id} className="pl-2">
                <span className="text-muted-foreground mr-2">
                  {format(new Date(msg.createdAt), "HH:mm", { locale: fr })}
                </span>
                {msg.user ? (
                  <>
                    {msg.user.role !== "GUEST" && (
                      <UserBadge role={msg.user.role as "MOD" | "ADMIN"} size="sm" />
                    )}
                    <span className="font-semibold ml-1">
                      {msg.user.pseudo || "Inconnu"}
                    </span>
                    : {msg.content}
                  </>
                ) : (
                  <span className="text-xs italic text-muted-foreground">
                    {msg.content}
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="text-muted-foreground italic">Aucun message pour le moment</div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <form className="flex gap-2" onSubmit={handleSubmitMessage}>
          <Input
            placeholder="Votre message..."
            className="flex-1"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button type="submit">Envoyer</Button>
        </form>
      </section>
    </main>
  )
}
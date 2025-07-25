"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { getSocket } from "@/lib/socket"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import type { Room } from "@/types/room"

export default function HomePage() {
  const { data: session } = useSession()
  const router = useRouter()

  const [rooms, setRooms] = useState<Room[]>([])
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [password, setPassword] = useState("")
  const [isConnected, setIsConnected] = useState(false)
  const [activeRoomCode, setActiveRoomCode] = useState<string | null>(null)

  const userId = session?.user?.id || "inconnu"

  useEffect(() => {
    const socket = getSocket()
    setIsConnected(socket.connected)

    socket.on("connect", () => setIsConnected(true))
    socket.on("disconnect", () => setIsConnected(false))
    socket.on("rooms_update", (data: Room[]) => {
      setRooms(data || [])

      const foundRoom = data.find((room) =>
        room.hostId === session?.user?.id ||
        room.players?.some((p) => p.id === session?.user?.id)
      )

      setActiveRoomCode(foundRoom?.code ?? null)
    })

    socket.emit("get_rooms")

    return () => {
      socket.off("connect")
      socket.off("disconnect")
      socket.off("rooms_update")
    }
  }, [session])

  async function handleCreateRoom() {
    if (!name || name.trim().length < 3) {
      toast.error("Le nom de la room doit contenir au moins 3 caractères.")
      return
    }

    setCreating(true)

    const res = await fetch("/api/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        isPrivate,
        password,
        maxPlayers: 10,
        params: {},
      }),
    })

    const data = await res.json()
    setCreating(false)

    if (res.ok) {
      getSocket().emit("get_rooms")
      router.push(`/room/${data.code}`)
    } else {
      toast.error(data.error || "Erreur inconnue")
    }
  }

  function handleLeaveRoom() {
    if (!userRoom || !session?.user) return
    getSocket().emit("leave_room", userRoom.code, session.user.id)
    setActiveRoomCode(null)
  }

  async function handleDeleteRoom(code?: string) {
    const roomCode = code || userRoom?.code
    if (!roomCode) return
    await fetch(`/api/room/${roomCode}`, { method: "DELETE" })
    getSocket().emit("room_deleted", roomCode)
    if (roomCode === userRoom?.code) {
      setActiveRoomCode(null)
    }
  }

  const userRoom = rooms.find((r) => r.code === activeRoomCode)
  const isHost = userRoom && session?.user?.id === userRoom.hostId

  return (
    <main className="max-w-4xl mx-auto py-10 space-y-10">
      <div className="text-sm text-muted-foreground text-center">
        Statut connexion serveur :
        {isConnected ? (
          <span className="ml-2 text-green-600 font-semibold">🟢 Connecté</span>
        ) : (
          <span className="ml-2 text-red-500 font-semibold">🔴 Déconnecté</span>
        )}
      </div>

      <div className="text-sm text-center text-muted-foreground">
        Ton ID utilisateur : <code className="font-mono">{userId}</code>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Créer une room</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {userRoom && (
            <Alert>
              <AlertTitle className="text-base font-semibold">
                🎮 Tu es actuellement dans une room
              </AlertTitle>
              <AlertDescription className="mt-2 space-y-1 text-sm">
                <p>Voici les détails de ta room :</p>
                <ul className="list-disc list-inside">
                  <li><strong>Nom :</strong> {userRoom.name}</li>
                  <li><strong>Code :</strong> <code className="font-mono">{userRoom.code}</code></li>
                  <li>
                    <strong>Hôte :</strong>{" "}
                    <span className="font-medium">
                      {(userRoom.host?.pseudo || userRoom.host?.email || "Inconnu") as string}
                    </span>
                    {isHost && " (vous)"}
                  </li>
                  <li><strong>Joueurs :</strong> {userRoom.players.length} / {userRoom.maxPlayers ?? 10}</li>
                  {userRoom.isPrivate && (
                    <li><strong>Accès :</strong> <span className="text-destructive font-medium">Privée</span></li>
                  )}
                </ul>
                <div className="flex gap-2 pt-3 flex-wrap">
                  <Button onClick={() => router.push(`/room/${userRoom.code}`)}>
                    Rejoindre la room
                  </Button>
                  <Button variant="secondary" onClick={handleLeaveRoom}>
                    Quitter
                  </Button>
                  {isHost && (
                    <Button variant="destructive" onClick={() => handleDeleteRoom()}>
                      🗑
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div>
            <Label>Nom de la room</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={!!userRoom}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Room privée ?</Label>
            <Switch
              checked={isPrivate}
              onCheckedChange={setIsPrivate}
              disabled={!!userRoom}
            />
          </div>
          {isPrivate && (
            <div>
              <Label>Mot de passe</Label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!!userRoom}
              />
            </div>
          )}
          <Button onClick={handleCreateRoom} disabled={creating || !!userRoom}>
            {creating ? "Création..." : "Créer la room"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rooms disponibles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rooms.length === 0 ? (
            <p>Aucune room pour l’instant.</p>
          ) : (
            rooms.map((room) => (
              <div key={room.code} className="border-b py-2">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <strong>{room.name}</strong>
                      {room.isPrivate && <Badge variant="destructive">Privée</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Hôte :{" "}
                      <span className="font-medium">
                        {(room.host?.pseudo || room.host?.email || "Inconnu") as string}
                      </span>{" "}
                      · {room.players?.length ?? 0} / {room.maxPlayers ?? 10} joueurs
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => router.push(`/room/${room.code}`)}
                    >
                      {room.isPrivate ? "🔒 Rejoindre" : "Rejoindre"}
                    </Button>
                    {session?.user?.id === room.hostId && (
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={() => handleDeleteRoom(room.code)}
                        title="Supprimer"
                      >
                        🗑
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </main>
  )
}

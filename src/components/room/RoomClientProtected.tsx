"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import RoomClient from "./RoomClient"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

type Props = {
  code: string
}

export default function RoomClientProtected({ code }: Props) {
  const { data: session } = useSession()
  const [roomIsPrivate, setRoomIsPrivate] = useState<boolean | null>(null)
  const [authorized, setAuthorized] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [hostId, setHostId] = useState<string | null>(null)

  const user = session?.user as { id: string; role: "GUEST" | "MOD" | "ADMIN" }

  useEffect(() => {
    fetch(`/api/room/${code}/meta`)
      .then((res) => res.json())
      .then((data) => {
        setRoomIsPrivate(data?.isPrivate ?? false)
        setHostId(data?.hostId ?? null)

        const isModerator = user?.role === "MOD" || user?.role === "ADMIN"
        const isHost = user?.id === data?.hostId

        if (!data?.isPrivate || isModerator || isHost) {
          setAuthorized(true)
        }
      })
      .catch(() => setRoomIsPrivate(false))
  }, [code, user?.id, user?.role])

  async function handleSubmit() {
    const res = await fetch(`/api/room/${code}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      setAuthorized(true)
    } else {
      setError("Mot de passe incorrect")
    }
  }

  if (roomIsPrivate === null) return <div className="p-4">Chargement...</div>

  if (!authorized && roomIsPrivate)
    return (
      <Dialog open>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cette room est privée</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Mot de passe</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <DialogFooter>
            <Button onClick={handleSubmit}>Valider</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )

  return <RoomClient code={code} />
}

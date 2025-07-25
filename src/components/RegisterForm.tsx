"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

type Props = {
  callbackUrl?: string
}

export default function RegisterForm({ callbackUrl = "/" }: Props) {
  const [email, setEmail] = useState("")
  const [pseudo, setPseudo] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const res = await fetch("/api/register", {
      method: "POST",
      body: JSON.stringify({ email, pseudo, password }),
      headers: { "Content-Type": "application/json" },
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || "Erreur inconnue")
      return
    }

    router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  }

  return (
    <Card className="max-w-sm w-full mx-auto mt-12">
      <CardHeader>
        <CardTitle>Créer un compte</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label>Pseudo</Label>
            <Input type="text" value={pseudo} onChange={(e) => setPseudo(e.target.value)} required />
          </div>
          <div>
            <Label>Mot de passe</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <Button type="submit" className="w-full">S'inscrire</Button>
        </form>
      </CardContent>
    </Card>
  )
}

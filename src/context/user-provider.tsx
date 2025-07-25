'use client'

import { createContext, useContext, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import type { Session } from "next-auth"

type UserContextType = {
  user: Session["user"] | null
  setUser: (user: Session["user"] | null) => void
  updateUser: () => Promise<void>
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: React.ReactNode }) {
  const { data: session, update } = useSession()
  const [user, setUser] = useState<Session["user"] | null>(session?.user || null)

  useEffect(() => {
    if (session?.user) {
      setUser(session.user)
    }
  }, [session])

  const updateUser = async () => {
    const newSession = await update()
    if (newSession?.user) {
      setUser(newSession.user)
    }
  }

  return (
    <UserContext.Provider value={{ user, setUser, updateUser }}>
      {children}
    </UserContext.Provider>
  )
}

export const useUser = () => {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider")
  }
  return context
}
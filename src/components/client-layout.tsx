'use client'

import { SessionProvider } from "next-auth/react"
import { UserProvider } from "@/context/user-provider"
import { Toaster } from "@/components/ui/sonner"

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <UserProvider>
        {children}
        <Toaster />
      </UserProvider>
    </SessionProvider>
  )
}
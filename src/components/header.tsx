"use client"

import Link from "next/link"
import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UserBadge } from "@/lib/user-badge"

export function Header() {
  const { data: session } = useSession()

  const role = (session?.user?.role ?? "GUEST") as "ADMIN" | "MOD" | "GUEST"

  return (
    <header className="w-full px-6 py-4 border-b flex items-center justify-between">
      <Link href="/" className="text-xl font-bold">
        AkiCulture
      </Link>

      {session?.user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 text-sm">
              <Avatar className="w-6 h-6">
                <AvatarImage src="/placeholder.png" alt="User" />
                <AvatarFallback>
                  {session.user.pseudo?.charAt(0).toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <span>{session.user.pseudo}</span>
              <UserBadge role={role} size="sm" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/account">Mon compte</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="flex gap-2">
          <Link href="/login">
            <Button variant="outline" size="sm">
              Connexion
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Inscription</Button>
          </Link>
        </div>
      )}
    </header>
  )
}

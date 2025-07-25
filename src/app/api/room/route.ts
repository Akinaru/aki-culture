import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import bcrypt from "bcrypt"

function generateRoomCode(length = 4): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { name, isPrivate = false, password = "", maxPlayers = 10, params = {} } = body

  // Génération d'un code unique
  let code: string
  let attempts = 0
  do {
    code = generateRoomCode()
    const existing = await prisma.room.findUnique({ where: { code } })
    if (!existing) break
    attempts++
  } while (attempts < 5)

  if (attempts === 5) {
    return NextResponse.json({ error: "Code generation failed" }, { status: 500 })
  }

  const hashedPassword = isPrivate ? await bcrypt.hash(password, 10) : null

  const room = await prisma.room.create({
    data: {
      name,
      code,
      isPrivate,
      maxPlayers,
      params,
      password: hashedPassword,
      hostId: session.user.id,
    },
    select: {
      id: true,
      code: true,
      name: true,
      isPrivate: true,
      createdAt: true,
    },
  })

  // ➕ Ajouter l'hôte comme joueur dans la room
  await prisma.roomPlayer.create({
    data: {
      userId: session.user.id,
      roomId: room.id,
      pseudo: session.user.name ?? "Hôte",
    },
  })

  return NextResponse.json(room)
}

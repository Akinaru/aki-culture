// app/api/room/[code]/join/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"

export async function POST(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id
  const { password } = await req.json()

  const room = await prisma.room.findUnique({
    where: { code: params.code.toUpperCase() },
  })

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 })
  }

  // protection mot de passe si room privée
  if (room.isPrivate && room.password && room.password !== password && session.user.role === "GUEST") {
    return NextResponse.json({ error: "Incorrect password" }, { status: 403 })
  }

  await prisma.roomPlayer.upsert({
    where: {
      userId_roomId: {
        userId,
        roomId: room.id,
      },
    },
    create: {
      userId,
      roomId: room.id,
      pseudo: session.user.name ?? "Inconnu",
    },
    update: {},
  })

  return NextResponse.json({ success: true, code: room.code })
}

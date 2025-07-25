import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import bcrypt from "bcrypt"

export async function GET(
  _req: NextRequest,
  { params }: { params: { code: string } }
) {
  const code = params.code.toUpperCase()

  const room = await prisma.room.findUnique({
    where: { code },
    include: {
      host: true,
      players: {
        include: {
          user: {
            select: {
              id: true,
              pseudo: true,
              email: true,
              role: true,
            },
          },
        },
      },
    },
  })

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 })
  }

  // Remapping pour simplifier côté frontend
  const mapped = {
    ...room,
    players: room.players.map((p) => ({
      id: p.user.id,
      pseudo: p.user.pseudo || "",
      role: p.user.role || "GUEST",
    })),
  }

  return NextResponse.json(mapped)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const code = params.code.toUpperCase()

  const room = await prisma.room.findUnique({
    where: { code },
  })

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 })
  }

  if (room.hostId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { name, isPrivate, password, maxPlayers, params: customParams } = body

  const updatedRoom = await prisma.room.update({
    where: { code },
    data: {
      name,
      isPrivate,
      password: isPrivate && password ? await bcrypt.hash(password, 10) : null,
      maxPlayers,
      params: customParams,
    },
  })

  return NextResponse.json(updatedRoom)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { code: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const code = params.code.toUpperCase()

  const room = await prisma.room.findUnique({
    where: { code },
    select: { id: true, hostId: true },
  })

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 })
  }

  if (room.hostId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await prisma.roomPlayer.deleteMany({
    where: { roomId: room.id },
  })

  await prisma.room.delete({
    where: { id: room.id },
  })

  return NextResponse.json({ success: true })
}

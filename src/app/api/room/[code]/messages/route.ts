// app/api/room/[code]/messages/route.ts

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  { params }: { params: { code: string } }
) {
  const code = params.code.toUpperCase()
  const room = await prisma.room.findUnique({
    where: { code },
    select: { id: true },
  })

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 })
  }

  const messages = await prisma.message.findMany({
    where: { roomId: room.id },
    orderBy: { createdAt: "asc" },
    include: {
      user: {
        select: {
          id: true,
          pseudo: true,
          role: true,
        },
      },
    },
  })

  return NextResponse.json(messages)
}

export async function POST(req: NextRequest, context: { params: { code: string } }) {
  const { params } = context
  const code = params.code.toUpperCase()

  const session = await getServerSession(authOptions)
  const body = await req.json()

  if (!body.content || body.content.trim().length === 0) {
    return NextResponse.json({ error: "Contenu vide" }, { status: 400 })
  }

  const room = await prisma.room.findUnique({
    where: { code },
    select: { id: true },
  })

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 })
  }

  const userId = session?.user?.id || null

  const message = await prisma.message.create({
    data: {
      content: body.content,
      roomId: room.id,
      userId,
    },
    include: {
      user: {
        select: {
          id: true,
          pseudo: true,
          role: true,
        },
      },
    },
  })

  return NextResponse.json(message)
}


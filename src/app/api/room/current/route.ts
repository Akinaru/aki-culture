// app/api/room/current/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = session.user.id

  const roomPlayer = await prisma.roomPlayer.findFirst({
    where: {
      userId,
      room: {
        status: { not: "ENDED" },
      },
    },
    include: {
      room: true,
    },
  })

  if (!roomPlayer) {
    return NextResponse.json({ room: null })
  }

  return NextResponse.json({ room: roomPlayer.room })
}

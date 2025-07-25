// app/api/room/[code]/meta/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: NextRequest,
  { params }: { params: { code: string } }
) {
  const room = await prisma.room.findUnique({
    where: { code: params.code.toUpperCase() },
    select: {
      isPrivate: true,
      hostId: true,
    },
  })

  if (!room) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 })
  }

  return NextResponse.json(room)
}

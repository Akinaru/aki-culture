import { NextRequest, NextResponse } from "next/server"
import { hash } from "bcrypt"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const { email, pseudo, password } = await req.json()

  if (!email || !password || !pseudo) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 400 })
  }

  const hashedPassword = await hash(password, 10)

  const user = await prisma.user.create({
    data: {
      email,
      pseudo,
      password: hashedPassword,
      role: "USER", // par défaut
    },
  })

  return NextResponse.json({ success: true, user: { id: user.id, pseudo: user.pseudo } })
}

import express from "express"
import http from "http"
import { Server } from "socket.io"
import cors from "cors"
import dotenv from "dotenv"
import { PrismaClient } from "@prisma/client"

dotenv.config()
const app = express()
app.use(cors())

const server = http.createServer(app)
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
})

const prisma = new PrismaClient()

io.on("connection", (socket) => {
  console.log("✅ Client connecté :", socket.id)

  socket.on("join_room", async (roomCode: string, userId: string, pseudo: string) => {
    try {
      socket.join(roomCode)
      console.log(`🔗 ${pseudo} (${socket.id}) a rejoint la room ${roomCode}`)

      const room = await prisma.room.findUnique({ where: { code: roomCode } })
      if (!room) return

      await prisma.roomPlayer.upsert({
        where: {
          userId_roomId: {
            userId,
            roomId: room.id,
          },
        },
        update: {
          pseudo,
        },
        create: {
          userId,
          roomId: room.id,
          pseudo,
        },
      })

      await sendRoomUpdate(roomCode)
      await sendRoomsUpdate()
    } catch (err) {
      console.error("❌ Erreur join_room :", err)
    }
  })

  socket.on("leave_room", async (roomCode: string, userId: string) => {
    socket.leave(roomCode)
    try {
      const room = await prisma.room.findUnique({ where: { code: roomCode } })
      if (!room) return

      await prisma.roomPlayer.deleteMany({
        where: { userId, roomId: room.id },
      })

      await sendRoomUpdate(roomCode)
      await sendRoomsUpdate()
    } catch (err) {
      console.error("❌ Erreur leave_room :", err)
    }
  })

  socket.on("kick_player", async (roomCode: string, playerId: string) => {
    try {
      const room = await prisma.room.findUnique({ where: { code: roomCode } })
      if (!room) return

      await prisma.roomPlayer.deleteMany({
        where: {
          userId: playerId,
          roomId: room.id,
        },
      })

      console.log(`🦶 Joueur ${playerId} kické de la room ${roomCode}`)
      await sendRoomUpdate(roomCode)
      await sendRoomsUpdate()
    } catch (err) {
      console.error("❌ Erreur kick_player :", err)
    }
  })

  socket.on("room_deleted", async (roomCode: string) => {
    io.to(roomCode).emit("room_deleted")
    await sendRoomsUpdate()
  })

  socket.on("get_rooms", async () => {
    await sendRoomsUpdate()
  })

  socket.on("disconnect", () => {
    console.log("❌ Déconnexion :", socket.id)
  })
})

function sanitizeHost(host: any) {
  if (!host || typeof host !== "object") return null

  return {
    pseudo: typeof host.pseudo === "string" ? host.pseudo : null,
    email: typeof host.email === "string" ? host.email : null,
  }
}

async function sendRoomUpdate(roomCode: string) {
  const room = await prisma.room.findUnique({
    where: { code: roomCode },
    include: {
      host: { select: { email: true, pseudo: true } },
      players: {
        include: {
          user: {
            select: {
              id: true,
              pseudo: true,
              role: true,
            },
          },
        },
      },
    },
  })

  if (room) {
    io.to(roomCode).emit("room_update", {
      ...room,
      host: sanitizeHost(room.host),
      players: room.players.map((p) => ({
        id: p.user.id,
        pseudo: p.user.pseudo || "",
        role: p.user.role || "GUEST",
      })),
    })
  }
}

async function sendRoomsUpdate() {
  const rooms = await prisma.room.findMany({
    where: { status: "WAITING" },
    include: {
      players: {
        include: {
          user: {
            select: {
              id: true,
              role: true,
            },
          },
        },
      },
      host: {
        select: {
          email: true,
          pseudo: true,
          role: true,
        },
      },
    },
  })

  io.emit(
    "rooms_update",
    rooms.map((r) => ({
      code: r.code,
      name: r.name,
      isPrivate: r.isPrivate,
      createdAt: r.createdAt,
      players: r.players.map((p) => ({
        id: p.user.id,
        role: p.user.role || "GUEST",
      })),
      hostId: r.hostId,
      maxPlayers: r.maxPlayers,
      host: sanitizeHost(r.host),
    }))
  )
}

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`🚀 WebSocket server listening on port ${PORT}`)
})

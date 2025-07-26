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
const disconnectTimeouts = new Map<string, NodeJS.Timeout>()

io.on("connection", (socket) => {
  console.log("✅ Client connecté :", socket.id)

  socket.on("join_room", async (roomCode: string, userId: string, pseudo: string) => {
    try {
      socket.join(roomCode)
      console.log(`🔗 ${pseudo} (${socket.id}) a rejoint la room ${roomCode}`)

      // Marquage pour le disconnect
      socket.data.userId = userId
      socket.data.roomCode = roomCode

      // Annule le timeout si déjà prévu
      const existingTimeout = disconnectTimeouts.get(userId)
      if (existingTimeout) {
        clearTimeout(existingTimeout)
        disconnectTimeouts.delete(userId)
      }

      const room = await prisma.room.findUnique({ where: { code: roomCode } })
      if (!room) return

      await prisma.roomPlayer.upsert({
        where: {
          userId_roomId: {
            userId,
            roomId: room.id,
          },
        },
        update: { pseudo },
        create: { userId, roomId: room.id, pseudo },
      })

      await sendRoomUpdate(roomCode)
      await sendRoomsUpdate()
    } catch (err) {
      console.error("❌ Erreur join_room :", err)
    }
  })

  socket.on("send_message", async ({ roomCode, userId, content }) => {
    try {
      const room = await prisma.room.findUnique({ where: { code: roomCode } })
      if (!room || !content || content.trim() === "") return

      const message = await prisma.message.create({
        data: {
          content,
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

      io.to(roomCode).emit("new_message", message)
    } catch (err) {
      console.error("❌ Erreur send_message :", err)
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
        where: { userId: playerId, roomId: room.id },
      })

      console.log(`🦶 Joueur ${playerId} kické de la room ${roomCode}`)
      io.to(roomCode).emit("player_kicked", { playerId })
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

  io.emit("user_count", io.engine.clientsCount)

  socket.on("disconnect", async () => {
    console.log("❌ Déconnexion :", socket.id)
    io.emit("user_count", io.engine.clientsCount)

    const userId = socket.data.userId
    const roomCode = socket.data.roomCode
    if (!userId || !roomCode) return

    // Planifie suppression si non revenu dans 2 minutes
    const timeout = setTimeout(async () => {
      try {
        const room = await prisma.room.findUnique({ where: { code: roomCode } })
        if (!room) return

        await prisma.roomPlayer.deleteMany({
          where: { userId, roomId: room.id },
        })

        console.log(`⏱️ Utilisateur ${userId} supprimé de la room ${roomCode} après inactivité`)

        // Envoie un message dans le chat
        const message = await prisma.message.create({
          data: {
            content: `Un joueur a été retiré automatiquement après 2 minutes d'inactivité.`,
            roomId: room.id,
            userId: null,
          },
        })
        io.to(roomCode).emit("new_message", message)

        await sendRoomUpdate(roomCode)
        await sendRoomsUpdate()
        disconnectTimeouts.delete(userId)
      } catch (err) {
        console.error("❌ Erreur suppression inactivité :", err)
      }
    }, 2 * 60 * 1000)

    disconnectTimeouts.set(userId, timeout)
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

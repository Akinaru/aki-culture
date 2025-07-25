// types/next-auth.d.ts
import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id?: string
      name?: string | null
      email?: string | null
      pseudo?: string
      role?: string
      createdAt?: Date
      questions?: any
      rooms?: any
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: string
    pseudo?: string
    createdAt?: Date
    questions?: any
    rooms?: any
  }
}

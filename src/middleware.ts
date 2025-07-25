import { getToken } from "next-auth/jwt"
import { NextResponse, type NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Autoriser automatiquement les assets et les API
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next()
  }

  const token = await getToken({ req })

  const isPublic = ["/login", "/register"].includes(pathname)

  // Si connecté ET veut accéder à login/register → on redirige vers "/"
  if (token && isPublic) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  // Si NON connecté ET veut accéder à une page privée → redirige vers login
  if (!token && !isPublic) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  return NextResponse.next()
}

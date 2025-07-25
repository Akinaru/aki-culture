"use client"

import LoginForm from "@/components/LoginForm"
import { useSearchParams } from "next/navigation"

export default function LoginPage() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"

  return (
    <main className="min-h-screen flex items-center justify-center">
      <LoginForm callbackUrl={callbackUrl} />
    </main>
  )
}

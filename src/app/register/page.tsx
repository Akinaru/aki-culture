"use client"

import RegisterForm from "@/components/RegisterForm"
import { useSearchParams } from "next/navigation"

export default function RegisterPage() {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") || "/"

  return (
    <main className="min-h-screen flex items-center justify-center">
      <RegisterForm callbackUrl={callbackUrl} />
    </main>
  )
}

import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/authOptions"
import { ThemeScript } from "@/lib/set-theme-script"
import { ThemeProvider } from "@/components/theme-provider"
import { ClientLayout } from "@/components/client-layout"
import { Header } from "@/components/header"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "AkiCulture",
  description: "Jeu de culture générale en ligne",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  await getServerSession(authOptions) // 👈 force l'attente pour hydrater useSession côté client

  return (
    <html lang="fr">
      <head>
        <ThemeScript />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          <ClientLayout>
            <Header />
            <main>{children}</main>
          </ClientLayout>
        </ThemeProvider>
      </body>
    </html>
  )
}

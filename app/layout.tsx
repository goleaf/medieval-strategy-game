import type React from "react"
import type { Metadata } from "next"

import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { startScheduler } from "@/lib/jobs/scheduler"
import { AlpineProvider } from "@/components/alpine-provider"
import { Footer } from "@/components/footer"

import { Libre_Baskerville as V0_Font_Libre_Baskerville, IBM_Plex_Mono as V0_Font_IBM_Plex_Mono, Lora as V0_Font_Lora } from 'next/font/google'

// Initialize fonts
const _libreBaskerville = V0_Font_Libre_Baskerville({ subsets: ['latin'], weight: ["400","700"] })
const _ibmPlexMono = V0_Font_IBM_Plex_Mono({ subsets: ['latin'], weight: ["100","200","300","400","500","600","700"] })
const _lora = V0_Font_Lora({ subsets: ['latin'], weight: ["400","500","600","700"] })

export const metadata: Metadata = {
  title: "Medieval Strategy Game",
  description: "A classic strategy game. Build kingdoms, train armies, conquer enemies.",
    generator: 'v0.app'
}

const shouldStartScheduler =
  typeof window === "undefined" &&
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build" &&
  process.env.NEXT_RUNTIME !== "edge"

if (shouldStartScheduler) {
  startScheduler().catch((error) => {
    console.error("Failed to initialize scheduler:", error)
  })
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased min-h-screen flex flex-col`}>
        <AlpineProvider>
          <div className="flex-1 flex flex-col">
            {children}
          </div>
          <Footer />
        </AlpineProvider>
        <Analytics />
      </body>
    </html>
  )
}

"use client"

import { useEffect } from "react"

declare global {
  interface Window {
    Alpine?: any
  }
}

export function AlpineProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Dynamically import Alpine.js only on the client side
    if (typeof window !== "undefined" && !window.Alpine) {
      import("alpinejs").then((AlpineModule) => {
        const Alpine = AlpineModule.default

        // Make Alpine available globally
        window.Alpine = Alpine

        // Start Alpine.js
        Alpine.start()

        // Dispatch custom event to notify that Alpine is ready
        window.dispatchEvent(new CustomEvent("alpine:ready"))
      }).catch((error) => {
        console.error("Failed to load Alpine.js:", error)
      })
    } else if (window.Alpine && !window.Alpine.store) {
      // If Alpine exists but hasn't started, start it
      window.Alpine.start()
    }
  }, [])

  return <>{children}</>
}


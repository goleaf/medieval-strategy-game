"use client"

import { useEffect } from "react"
import Alpine from "alpinejs"

// Make Alpine available globally
if (typeof window !== "undefined") {
  (window as any).Alpine = Alpine
}

export function AlpineProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize Alpine.js after component mounts
    if (typeof window !== "undefined" && !(window as any).Alpine) {
      Alpine.start()
    }
  }, [])

  return <>{children}</>
}


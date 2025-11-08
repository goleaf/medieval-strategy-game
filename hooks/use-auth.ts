"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export type AuthState = {
  token: string
  playerId: string
}

interface UseAuthOptions {
  redirectTo?: string
  redirectOnMissing?: boolean
}

export function useAuth(options: UseAuthOptions = {}) {
  const { redirectTo = "/login", redirectOnMissing = false } = options
  const router = useRouter()
  const [auth, setAuth] = useState<AuthState | null>(null)
  const [initialized, setInitialized] = useState(false)

  const readAuthFromStorage = useCallback(() => {
    if (typeof window === "undefined") {
      return null
    }

    const token = localStorage.getItem("authToken")
    const playerId = localStorage.getItem("playerId")

    if (token && playerId) {
      const nextAuth = { token, playerId }
      setAuth(nextAuth)
      return nextAuth
    }

    setAuth(null)
    return null
  }, [])

  useEffect(() => {
    const stored = readAuthFromStorage()
    setInitialized(true)

    if (!stored && redirectOnMissing) {
      router.replace(redirectTo)
    }
  }, [readAuthFromStorage, redirectOnMissing, redirectTo, router])

  const clearAuth = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("authToken")
      localStorage.removeItem("playerId")
    }
    setAuth(null)
  }, [])

  return {
    auth,
    initialized,
    refreshAuth: readAuthFromStorage,
    clearAuth,
  }
}

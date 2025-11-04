"use client"

import { useEffect, useRef } from "react"

interface UsePollingOptions {
  enabled?: boolean
  interval?: number
  onError?: (error: Error) => void
}

export function usePolling(
  callback: () => Promise<void>,
  options: UsePollingOptions = {},
) {
  const { enabled = true, interval = 30000, onError } = options
  const callbackRef = useRef(callback)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    const poll = async () => {
      try {
        await callbackRef.current()
      } catch (error) {
        if (onError) {
          onError(error instanceof Error ? error : new Error(String(error)))
        } else {
          console.error("Polling error:", error)
        }
      }
    }

    // Initial call
    poll()

    // Set up interval
    intervalRef.current = setInterval(poll, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [enabled, interval, onError])
}


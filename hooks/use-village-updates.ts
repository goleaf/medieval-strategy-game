"use client"

import { useEffect, useState } from "react"

export function useVillageUpdates(villageId: string) {
  const [updates, setUpdates] = useState<any>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const ws = new WebSocket(`${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/api/ws`)

    ws.onopen = () => {
      console.log("[v0] WebSocket connected")
      setConnected(true)
      ws.send(
        JSON.stringify({
          type: "SUBSCRIBE",
          payload: { channel: `village:${villageId}` },
        }),
      )
    }

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      if (message.type === "VILLAGE_UPDATE") {
        setUpdates(message.data)
      }
    }

    ws.onerror = (error) => {
      console.error("[v0] WebSocket error:", error)
      setConnected(false)
    }

    ws.onclose = () => {
      console.log("[v0] WebSocket disconnected")
      setConnected(false)
    }

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "UNSUBSCRIBE",
            payload: { channel: `village:${villageId}` },
          }),
        )
      }
      ws.close()
    }
  }, [villageId])

  return { updates, connected }
}

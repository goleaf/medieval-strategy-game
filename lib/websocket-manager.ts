import type { Server as HTTPServer } from "http"
import { WebSocketServer, WebSocket } from "ws"

interface ClientMessage {
  type: "SUBSCRIBE" | "UNSUBSCRIBE" | "ACTION"
  payload: any
}

interface ServerMessage {
  type: string
  data: any
  timestamp: number
}

class WebSocketManager {
  private wss: WebSocketServer | null = null
  private clients = new Map<string, Set<WebSocket>>()

  initialize(server: HTTPServer) {
    this.wss = new WebSocketServer({ server, path: "/api/ws" })

    this.wss.on("connection", (ws: WebSocket) => {
      console.log("[v0] WebSocket client connected")

      ws.on("message", (data: string) => {
        try {
          const message: ClientMessage = JSON.parse(data)
          this.handleMessage(ws, message)
        } catch (error) {
          console.error("[v0] WebSocket message error:", error)
        }
      })

      ws.on("close", () => {
        console.log("[v0] WebSocket client disconnected")
        // Remove from all subscriptions
        for (const clients of this.clients.values()) {
          clients.delete(ws)
        }
      })
    })
  }

  private handleMessage(ws: WebSocket, message: ClientMessage) {
    switch (message.type) {
      case "SUBSCRIBE":
        this.subscribeClient(ws, message.payload.channel)
        break
      case "UNSUBSCRIBE":
        this.unsubscribeClient(ws, message.payload.channel)
        break
    }
  }

  private subscribeClient(ws: WebSocket, channel: string) {
    if (!this.clients.has(channel)) {
      this.clients.set(channel, new Set())
    }
    this.clients.get(channel)!.add(ws)
    console.log(`[v0] Client subscribed to ${channel}`)
  }

  private unsubscribeClient(ws: WebSocket, channel: string) {
    const clients = this.clients.get(channel)
    if (clients) {
      clients.delete(ws)
      if (clients.size === 0) {
        this.clients.delete(channel)
      }
    }
  }

  broadcast(channel: string, message: ServerMessage) {
    const clients = this.clients.get(channel)
    if (!clients) return

    const data = JSON.stringify(message)
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data)
      }
    }
  }

  broadcastVillageUpdate(villageId: string, data: any) {
    this.broadcast(`village:${villageId}`, {
      type: "VILLAGE_UPDATE",
      data,
      timestamp: Date.now(),
    })
  }

  broadcastAttackUpdate(attackId: string, data: any) {
    this.broadcast(`attack:${attackId}`, {
      type: "ATTACK_UPDATE",
      data,
      timestamp: Date.now(),
    })
  }
}

export const wsManager = new WebSocketManager()

import { prisma } from "@/lib/db"

export type PushPayload = {
  title: string
  message: string
  type: string
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW"
  actionUrl?: string | null
  metadata?: Record<string, unknown>
}

export class PushService {
  static async notify(playerId: string, payload: PushPayload): Promise<void> {
    const devices = await prisma.pushDevice.findMany({ where: { playerId } })
    if (!devices.length) return
    // Stub transport — integrate FCM/APNs here.
    console.log(`[push] (${playerId}) -> ${devices.length} devices`, {
      title: payload.title,
      message: payload.message,
      priority: payload.priority,
      actionUrl: payload.actionUrl,
      type: payload.type,
    })
  }
}


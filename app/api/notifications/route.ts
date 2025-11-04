import { prisma } from "@/lib/db"
import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"

export async function GET(req: NextRequest) {
  try {
    const playerId = req.nextUrl.searchParams.get("playerId")
    if (!playerId) {
      return errorResponse("Player ID required", 400)
    }

    // Fetch system messages and convert to notifications
    const messages = await prisma.message.findMany({
      where: {
        recipientId: playerId,
        type: { in: ["SYSTEM", "BATTLE_REPORT", "SCOUT_REPORT"] },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    const notifications = messages.map((msg) => ({
      id: msg.id,
      type: msg.type === "ATTACK_RESULT" || msg.type === "ATTACK_INCOMING" ? "BATTLE" : msg.type === "SCOUT_RESULT" || msg.type === "SCOUT_DETECTED" ? "SCOUT" : "SYSTEM",
      title: msg.subject || "System Notification",
      message: msg.content,
      createdAt: msg.createdAt.toISOString(),
      read: msg.isRead,
      link: msg.type === "ATTACK_RESULT" ? `/attacks` : msg.type === "SCOUT_RESULT" ? `/attacks` : undefined,
    }))

    return successResponse(notifications)
  } catch (error) {
    return serverErrorResponse(error)
  }
}


import { prisma } from "@/lib/db"
import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"

export async function POST(req: NextRequest) {
  try {
    const { messageId, reason } = await req.json()

    if (!messageId) {
      return errorResponse("Message ID required", 400)
    }

    // Get the message
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: { select: { playerName: true } },
      },
    })

    if (!message) {
      return errorResponse("Message not found", 404)
    }

    // Check if message is already reported (you might want to add a reported flag to Message model)
    // For now, we'll just log the report and notify admins

    // Create admin notification
    await prisma.adminNotification.create({
      data: {
        type: "REPORT",
        title: "Message Reported as Spam",
        message: `Message from ${message.sender.playerName} reported as spam. Reason: ${reason || 'No reason provided'}`,
        targetId: messageId,
        targetType: "MESSAGE",
        severity: "warning",
      },
    })

    // You could also:
    // 1. Mark the message as reported
    // 2. Automatically hide spam messages
    // 3. Track spam reports per user
    // 4. Implement rate limiting for reported users

    return successResponse({
      message: "Message reported successfully. Our team will review it.",
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

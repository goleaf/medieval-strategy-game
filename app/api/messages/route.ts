import { prisma } from "@/lib/db"
import { type NextRequest } from "next/server"
import { messageSchema } from "@/lib/utils/validation"
import { successResponse, errorResponse, serverErrorResponse, handleValidationError } from "@/lib/utils/api-response"

export async function GET(req: NextRequest) {
  try {
    const playerId = req.nextUrl.searchParams.get("playerId")
    const type = req.nextUrl.searchParams.get("type")
    const isRead = req.nextUrl.searchParams.get("isRead")

    if (!playerId) {
      return errorResponse("Player ID required", 400)
    }

    const where: any = {
      OR: [
        { village: { playerId } },
        { sender: { villages: { some: { playerId } } } },
      ],
    }

    if (type) {
      where.type = type
    }

    if (isRead !== null) {
      where.isRead = isRead === "true"
    }

    const messages = await prisma.message.findMany({
      where,
      include: {
        sender: { select: { playerName: true } },
        village: { select: { name: true, x: true, y: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })

    return successResponse(messages)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = messageSchema.parse(body)

    const message = await prisma.message.create({
      data: {
        senderId: validated.senderId,
        villageId: validated.villageId || null,
        type: validated.type,
        subject: validated.subject,
        content: validated.content,
      },
      include: {
        sender: { select: { playerName: true } },
      },
    })

    return successResponse(message, 201)
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { messageId, isRead } = await req.json()

    if (!messageId) {
      return errorResponse("Message ID required", 400)
    }

    const message = await prisma.message.update({
      where: { id: messageId },
      data: { isRead: isRead ?? true },
    })

    return successResponse(message)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const messageId = req.nextUrl.searchParams.get("messageId")

    if (!messageId) {
      return errorResponse("Message ID required", 400)
    }

    await prisma.message.delete({
      where: { id: messageId },
    })

    return successResponse({ message: "Message deleted" })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

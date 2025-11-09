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
        { recipientId: playerId }, // Include received messages
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
        sender: { select: { id: true, playerName: true } },
        recipient: { select: { id: true, playerName: true } },
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

    // Handle alliance messaging
    if (validated.allianceRole) {
      return await handleAllianceMessage(validated)
    }

    // Handle player-to-player messaging
    if (validated.recipientId) {
      return await handlePlayerMessage(validated)
    }

    // Handle regular messages (village/system messages)
    const message = await prisma.message.create({
      data: {
        senderId: validated.senderId,
        villageId: validated.villageId || null,
        type: validated.type,
        subject: validated.subject,
        content: validated.content,
      },
      include: {
        sender: { select: { id: true, playerName: true } },
        recipient: { select: { id: true, playerName: true } },
        village: { select: { name: true, x: true, y: true } },
      },
    })

    return successResponse(message, 201)
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}

async function handlePlayerMessage(validated: any) {
  // Validate recipient exists
  const recipient = await prisma.player.findUnique({
    where: { id: validated.recipientId },
  })

  if (!recipient) {
    return errorResponse("Recipient not found", 404)
  }

  const message = await prisma.message.create({
    data: {
      senderId: validated.senderId,
      recipientId: validated.recipientId,
      type: "PLAYER",
      subject: validated.subject,
      content: validated.content,
    },
    include: {
        sender: { select: { id: true, playerName: true } },
        recipient: { select: { id: true, playerName: true } },
    },
  })

  return successResponse(message, 201)
}

async function handleAllianceMessage(validated: any) {
  // Get sender's tribe
  const sender = await prisma.player.findUnique({
    where: { id: validated.senderId },
    include: { tribe: true },
  })

  if (!sender?.tribe) {
    return errorResponse("You must be in a tribe to send alliance messages", 403)
  }

  // Check if sender has permission to send alliance messages
  const canSendAllianceMessages = sender.tribe.leaderId === validated.senderId
    // TODO: Add role-based permissions for alliance messaging

  if (!canSendAllianceMessages) {
    return errorResponse("You don't have permission to send alliance messages", 403)
  }

  // Get tribe members based on role
  let targetMembers: any[] = []

  if (validated.allianceRole === "ally") {
    // Get all tribe members
    targetMembers = await prisma.player.findMany({
      where: { tribeId: sender.tribe.id },
    })
  } else if (validated.allianceRole === "def") {
    // TODO: Get defense coordinators
    targetMembers = await prisma.player.findMany({
      where: { tribeId: sender.tribe.id },
      // Add role filtering when implemented
    })
  } else if (validated.allianceRole === "off") {
    // TODO: Get offense coordinators
    targetMembers = await prisma.player.findMany({
      where: { tribeId: sender.tribe.id },
      // Add role filtering when implemented
    })
  }

  // Create messages for all target members
  const messages = []
  for (const member of targetMembers) {
    if (member.id !== validated.senderId) { // Don't send to self
      const message = await prisma.message.create({
        data: {
          senderId: validated.senderId,
          recipientId: member.id,
          allianceRole: validated.allianceRole,
          type: "PLAYER",
          subject: `[${validated.allianceRole.toUpperCase()}] ${validated.subject}`,
          content: validated.content,
        },
        include: {
          sender: { select: { playerName: true } },
          recipient: { select: { playerName: true } },
        },
      })
      messages.push(message)
    }
  }

  return successResponse({
    message: `Alliance message sent to ${messages.length} members`,
    sentCount: messages.length,
  }, 201)
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

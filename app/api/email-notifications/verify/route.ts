import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse, handleValidationError } from "@/lib/utils/api-response"
import { EmailNotificationService } from "@/lib/notifications/email-notification-service"
import { z } from "zod"

const requestSchema = z.object({
  playerId: z.string().min(1),
})

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token")
    if (!token) {
      return new Response("Missing token", { status: 400 })
    }

    const verified = await EmailNotificationService.verifyEmail(token)
    return new Response(verified ? "Email verified. You can close this tab." : "Verification link expired.", {
      status: verified ? 200 : 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    })
  } catch (error) {
    return new Response("Unable to verify email", { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { playerId } = requestSchema.parse(body)
    await EmailNotificationService.requestVerification(playerId)
    return successResponse({ queued: true })
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}

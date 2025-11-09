import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse, handleValidationError } from "@/lib/utils/api-response"
import { emailNotificationPreferenceSchema } from "@/lib/utils/validation"
import { EmailNotificationService } from "@/lib/notifications/email-notification-service"
import { getDefaultEmailNotificationPreferences } from "@/lib/config/email-notifications"

const mergePreferences = (raw: any) => ({
  ...getDefaultEmailNotificationPreferences(),
  ...(raw ?? {}),
})

export async function GET(req: NextRequest) {
  try {
    const playerId = req.nextUrl.searchParams.get("playerId")
    if (!playerId) {
      return errorResponse("Player ID required", 400)
    }

    const setting = await EmailNotificationService.getSettings(playerId)
    if (!setting) {
      return errorResponse("Player not found", 404)
    }

    return successResponse({
      email: setting.email,
      verified: Boolean(setting.emailVerifiedAt),
      deliverySchedule: setting.deliverySchedule,
      language: setting.language,
      preferences: mergePreferences(setting.preferences),
      dailyDigestHour: setting.dailyDigestHour,
      unsubscribed: Boolean(setting.unsubscribedAt),
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const validated = emailNotificationPreferenceSchema.parse(body)
    const existing = await EmailNotificationService.getSettings(validated.playerId)

    await EmailNotificationService.updatePreferences(validated.playerId, {
      email: validated.email,
      deliverySchedule: validated.deliverySchedule,
      language: validated.language,
      preferences: validated.preferences,
      dailyDigestHour: validated.dailyDigestHour,
    })

    if (validated.email && existing?.email !== validated.email) {
      await EmailNotificationService.requestVerification(validated.playerId)
    }

    const updated = await EmailNotificationService.getSettings(validated.playerId)

    return successResponse({
      email: updated?.email,
      verified: Boolean(updated?.emailVerifiedAt),
      deliverySchedule: updated?.deliverySchedule,
      language: updated?.language,
      preferences: mergePreferences(updated?.preferences),
      dailyDigestHour: updated?.dailyDigestHour,
      unsubscribed: Boolean(updated?.unsubscribedAt),
    })
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}

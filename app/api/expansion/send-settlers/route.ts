import { ExpansionService } from "@/lib/game-services/expansion-service"
import { sendSettlersSchema } from "@/lib/utils/validation"
import { successResponse, errorResponse, serverErrorResponse, handleValidationError } from "@/lib/utils/api-response"
import { type NextRequest } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = sendSettlersSchema.safeParse(body)

    if (!parsed.success) {
      return errorResponse(parsed.error, 400)
    }

    const movement = await ExpansionService.sendSettlers(parsed.data)
    return successResponse(movement, 201)
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}

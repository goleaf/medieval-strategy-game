import { prisma } from "@/lib/db"
import { BuildingService } from "@/lib/game-services/building-service"
import { type NextRequest } from "next/server"
import { buildingUpgradeSchema } from "@/lib/utils/validation"
import { successResponse, errorResponse, serverErrorResponse, notFoundResponse, handleValidationError } from "@/lib/utils/api-response"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { SitterPermissions } from "@/lib/utils/sitter-permissions"
import { SitterDualService } from "@/lib/game-services/sitter-dual-service"
import { type AccountActorType } from "@prisma/client"

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth || !auth.playerId) {
      return errorResponse("Unauthorized", 401)
    }

    const body = await req.json()
    const validated = buildingUpgradeSchema.parse(body)

    // Check sitter permissions for resource usage
    const sitterContext = await SitterPermissions.getSitterContext(auth)
    if (sitterContext.isSitter) {
      const permissionCheck = await SitterPermissions.enforcePermission(
        req,
        sitterContext.sitterId!,
        sitterContext.ownerId!,
        'useResources'
      )
      if (permissionCheck) return permissionCheck
    }

    await BuildingService.upgradeBuilding(validated.buildingId)

    const building = await prisma.building.findUnique({
      where: { id: validated.buildingId },
      include: { village: true },
    })

    if (!building) {
      return notFoundResponse()
    }

    // Log sitter/dual actions for accountability
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined
    const ua = req.headers.get("user-agent") || undefined
    if (sitterContext.isSitter) {
      await SitterDualService.logAction({
        playerId: auth.playerId,
        actorType: "SITTER" as AccountActorType,
        actorUserId: auth.userId,
        actorPlayerId: sitterContext.sitterId,
        actorLabel: "Sitter",
        action: "BUILDING_UPGRADE",
        metadata: { buildingId: validated.buildingId },
        ipAddress: ip,
        userAgent: ua,
      })
    } else if (auth.isDual && auth.dualFor) {
      await SitterDualService.logAction({
        playerId: auth.playerId,
        actorType: "DUAL" as AccountActorType,
        actorUserId: auth.userId,
        actorLabel: "Dual",
        action: "BUILDING_UPGRADE",
        metadata: { buildingId: validated.buildingId },
        ipAddress: ip,
        userAgent: ua,
      })
    }

    return successResponse(building)
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}

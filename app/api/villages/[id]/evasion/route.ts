import { prisma } from "@/lib/db"
import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await req.json()
    const { enabled } = body

    if (typeof enabled !== 'boolean') {
      return errorResponse("Invalid request: 'enabled' must be a boolean", 400)
    }

    // Verify village exists and is capital
    const village = await prisma.village.findUnique({
      where: { id },
      include: { player: true },
    })

    if (!village) {
      return errorResponse("Village not found", 404)
    }

    if (!village.isCapital) {
      return errorResponse("Troop evasion is only available for capital villages", 400)
    }

    const now = new Date()
    const hasGoldClub =
      village.player.hasGoldClubMembership &&
      (!village.player.goldClubExpiresAt || village.player.goldClubExpiresAt > now)

    if (!hasGoldClub) {
      return errorResponse("Troop evasion requires Gold Club membership", 403)
    }

    // Update evasion setting
    await prisma.village.update({
      where: { id },
      data: { troopEvasionEnabled: enabled },
    })

    return successResponse({
      message: `Troop evasion ${enabled ? 'activated' : 'deactivated'} for ${village.name}`,
      troopEvasionEnabled: enabled,
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const village = await prisma.village.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        isCapital: true,
        troopEvasionEnabled: true,
      },
    })

    if (!village) {
      return errorResponse("Village not found", 404)
    }

    return successResponse(village)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

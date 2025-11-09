import { prisma } from "@/lib/db"
import combatConfig from "@/config/combat.json"
import { calculateMoraleMultiplier } from "@/lib/combat/morale"
import { type NextRequest } from "next/server"
import { errorResponse, successResponse } from "@/lib/utils/api-response"
import { withMetrics } from "@/lib/utils/metrics"

export const GET = withMetrics("GET /api/attacks/morale", async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url)
    const fromVillageId = searchParams.get("fromVillageId")
    const toX = searchParams.get("toX")
    const toY = searchParams.get("toY")

    if (!fromVillageId || toX == null || toY == null) {
      return errorResponse("fromVillageId, toX and toY are required", 400)
    }

    const fromVillage = await prisma.village.findUnique({
      where: { id: fromVillageId },
      include: { player: true },
    })
    if (!fromVillage?.player) {
      return errorResponse("Source village not found", 404)
    }

    // Bounds check
    const tx = Number(toX), ty = Number(toY)
    if (Number.isNaN(tx) || Number.isNaN(ty) || tx < 0 || tx > 999 || ty < 0 || ty > 999) {
      return errorResponse("Coordinates out of bounds", 400)
    }
    const targetVillage = await prisma.village.findUnique({
      where: { x_y: { x: tx, y: ty } },
      include: { player: true },
    })

    // Barbarians / empty tile → full morale
    if (!targetVillage?.player) {
      return successResponse({ moralePct: 1 })
    }

    const attackerSize = fromVillage.player.totalPoints ?? 0
    const defenderSize = targetVillage.player.totalPoints ?? 0

    const morale = calculateMoraleMultiplier(
      { mission: "attack", attackerSize, defenderSize },
      combatConfig as any,
    )

    return successResponse({ moralePct: morale })
  } catch (error) {
    return errorResponse(error as Error, 500)
  }
})

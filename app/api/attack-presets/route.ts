import { prisma } from "@/lib/db"
import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"
import { attackPresetCreateSchema, attackPresetQuerySchema } from "@/lib/utils/validation"
import { Prisma } from "@prisma/client"
import { getTroopSystemConfig } from "@/lib/troop-system/config"

export async function GET(req: NextRequest) {
  try {
    const params = {
      playerId: req.nextUrl.searchParams.get("playerId") ?? "",
      villageId: req.nextUrl.searchParams.get("villageId") ?? undefined,
      mission: req.nextUrl.searchParams.get("mission") ?? undefined,
    }

    const parsed = attackPresetQuerySchema.safeParse(params)
    if (!parsed.success) {
      return errorResponse(parsed.error, 400)
    }

    const { playerId, villageId, mission } = parsed.data

    const where: Prisma.AttackPresetWhereInput = { playerId }
    if (villageId) {
      where.OR = [{ villageId }, { villageId: null }]
    }
    if (mission) {
      where.mission = mission
    }

    const presets = await prisma.attackPreset.findMany({
      where,
      include: {
        units: true,
        village: { select: { id: true, name: true } },
        targetVillage: { select: { id: true, name: true, x: true, y: true } },
      },
      orderBy: [{ requiresGoldClub: "desc" }, { createdAt: "desc" }],
    })

    return successResponse({ presets })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    const parsed = attackPresetCreateSchema.safeParse(payload)
    if (!parsed.success) {
      return errorResponse(parsed.error, 400)
    }

    const data = parsed.data

    const player = await prisma.player.findUnique({
      where: { id: data.playerId },
      select: { hasGoldClubMembership: true },
    })

    if (!player) {
      return errorResponse("Player not found", 404)
    }

    if (data.requiresGoldClub && !player.hasGoldClubMembership) {
      return errorResponse("Gold Club membership required to mark preset as premium", 403)
    }

    const preset = await prisma.$transaction(async (tx) => {
      const created = await tx.attackPreset.create({
        data: {
          playerId: data.playerId,
          villageId: data.villageId ?? null,
          name: data.name,
          type: data.type,
          requiresGoldClub: data.requiresGoldClub ?? false,
          targetVillageId: data.targetVillageId ?? null,
          targetX: data.targetX ?? null,
          targetY: data.targetY ?? null,
          preferredArrival: data.preferredArrival ? new Date(data.preferredArrival) : null,
          waveWindowMs: data.waveWindowMs ?? null,
          catapultTargets: data.catapultTargets,
          mission: data.mission ?? "ATTACK",
          units: {
            create: data.units.map((unit) => ({
              troopType: unit.troopType,
              quantity: unit.quantity,
            })),
          },
        },
        include: {
          units: true,
          village: { select: { id: true, name: true } },
          targetVillage: { select: { id: true, name: true, x: true, y: true } },
        },
      })

      return created
    })

    return successResponse({ preset }, 201)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

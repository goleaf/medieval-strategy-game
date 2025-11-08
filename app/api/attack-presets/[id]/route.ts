import { prisma } from "@/lib/db"
import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"
import { attackPresetUpdateSchema } from "@/lib/utils/validation"
import { Prisma } from "@prisma/client"
import { getTroopSystemConfig } from "@/lib/troop-system/config"

interface RouteParams {
  params: { id: string }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const payload = await req.json()
    const parsed = attackPresetUpdateSchema.safeParse({ ...payload, presetId: params.id })
    if (!parsed.success) {
      return errorResponse(parsed.error, 400)
    }

    const data = parsed.data

    const preset = await prisma.attackPreset.findUnique({
      where: { id: params.id },
      select: { playerId: true },
    })

    if (!preset) {
      return errorResponse("Preset not found", 404)
    }

    if (preset.playerId !== data.playerId) {
      return errorResponse("Unauthorized preset update", 403)
    }

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

    const updateData: Prisma.AttackPresetUpdateInput = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.villageId !== undefined) updateData.villageId = data.villageId ?? null
    if (data.type !== undefined) updateData.type = data.type
    if (data.requiresGoldClub !== undefined) updateData.requiresGoldClub = data.requiresGoldClub
    if (data.mission !== undefined) updateData.mission = data.mission
    if (data.targetVillageId !== undefined) updateData.targetVillageId = data.targetVillageId ?? null
    if (data.targetX !== undefined) updateData.targetX = data.targetX ?? null
    if (data.targetY !== undefined) updateData.targetY = data.targetY ?? null
    if (data.preferredArrival !== undefined) {
      updateData.preferredArrival = data.preferredArrival ? new Date(data.preferredArrival) : null
    }
    if (data.waveWindowMs !== undefined) updateData.waveWindowMs = data.waveWindowMs ?? null
    if (data.catapultTargets !== undefined) updateData.catapultTargets = data.catapultTargets ?? null

    const updated = await prisma.$transaction(async (tx) => {
      if (data.units) {
        await tx.attackPresetUnit.deleteMany({ where: { presetId: params.id } })
        await tx.attackPresetUnit.createMany({
          data: data.units.map((unit) => ({
            presetId: params.id,
            troopType: unit.troopType,
            quantity: unit.quantity,
          })),
        })
      }

      return tx.attackPreset.update({
        where: { id: params.id },
        data: updateData,
        include: {
          units: true,
          village: { select: { id: true, name: true } },
          targetVillage: { select: { id: true, name: true, x: true, y: true } },
        },
      })
    })

    return successResponse({ preset: updated })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const playerId = req.nextUrl.searchParams.get("playerId")
    if (!playerId) {
      return errorResponse("Player ID required", 400)
    }

    const preset = await prisma.attackPreset.findUnique({
      where: { id: params.id },
      select: { playerId: true },
    })

    if (!preset) {
      return errorResponse("Preset not found", 404)
    }

    if (preset.playerId !== playerId) {
      return errorResponse("Unauthorized preset delete", 403)
    }

    await prisma.attackPreset.delete({ where: { id: params.id } })
    return successResponse({ id: params.id })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

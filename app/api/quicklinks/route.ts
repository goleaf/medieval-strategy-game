import { prisma } from "@/lib/db"
import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"
import { quicklinkUpdateSchema } from "@/lib/utils/validation"

export async function GET(req: NextRequest) {
  try {
    const playerId = req.nextUrl.searchParams.get("playerId")
    if (!playerId) {
      return errorResponse("Player ID required", 400)
    }
    const villageId = req.nextUrl.searchParams.get("villageId") ?? undefined

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: { hasGoldClubMembership: true, goldClubExpiresAt: true },
    })

    if (!player) {
      return errorResponse("Player not found", 404)
    }

    const [playerQuicklinks, villageQuicklinks] = await Promise.all([
      prisma.playerQuicklink.findMany({
        where: { playerId },
        orderBy: { slotNumber: "asc" },
        include: { quickLinkOption: true },
      }),
      villageId
        ? prisma.villageQuicklink.findMany({
            where: { villageId },
            orderBy: { slotNumber: "asc" },
            include: { quickLinkOption: true },
          })
        : Promise.resolve([]),
    ])

    return successResponse({
      playerQuicklinks,
      villageQuicklinks,
      membership: {
        hasGoldClubMembership: player.hasGoldClubMembership,
        goldClubExpiresAt: player.goldClubExpiresAt,
      },
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    const parsed = quicklinkUpdateSchema.safeParse(payload)
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

    const slotLimit = data.scope === "PLAYER" ? 4 : 5
    if (data.slots.some((slot) => slot.slotNumber > slotLimit)) {
      return errorResponse(`Slot numbers exceed maximum for ${data.scope.toLowerCase()} scope`, 400)
    }

    let targetVillage:
      | (Awaited<ReturnType<typeof prisma.village.findFirst>> & { buildings: { type: string; level: number }[] })
      | null = null

    if (data.scope === "VILLAGE") {
      targetVillage = await prisma.village.findFirst({
        where: { id: data.villageId!, playerId: data.playerId },
        include: { buildings: true },
      })

      if (!targetVillage) {
        return errorResponse("Village not found", 404)
      }
    }

    const optionIds = data.slots.map((slot) => slot.quickLinkOptionId).filter((id): id is string => !!id)
    const options = optionIds.length
      ? await prisma.quickLinkOption.findMany({
          where: { id: { in: optionIds }, isActive: true },
        })
      : []

    const optionMap = new Map(options.map((option) => [option.id, option]))

    const villageBuildings =
      targetVillage?.buildings.reduce<Record<string, number>>((acc, building) => {
        acc[building.type] = Math.max(acc[building.type] ?? 0, building.level)
        return acc
      }, {}) ?? {}

    for (const slot of data.slots) {
      if (!slot.quickLinkOptionId) continue
      const option = optionMap.get(slot.quickLinkOptionId)
      if (!option) {
        return errorResponse("Invalid quicklink option provided", 400)
      }

      if (option.requiresPremium && !player.hasGoldClubMembership) {
        return errorResponse(`Gold Club membership required for ${option.name}`, 403)
      }

      if (data.scope === "VILLAGE" && option.requiredBuildingType) {
        const level = villageBuildings[option.requiredBuildingType] ?? 0
        const requiredLevel = option.requiredBuildingLevel ?? 1
        if (level < requiredLevel) {
          return errorResponse(
            `${option.name} requires ${option.requiredBuildingType} level ${requiredLevel}`,
            400,
          )
        }
      }
    }

    const filteredSlots = data.slots
      .filter((slot) => slot.quickLinkOptionId)
      .map((slot) => ({
        slotNumber: slot.slotNumber,
        quickLinkOptionId: slot.quickLinkOptionId as string,
      }))

    await prisma.$transaction(async (tx) => {
      if (data.scope === "PLAYER") {
        await tx.playerQuicklink.deleteMany({ where: { playerId: data.playerId } })
        if (filteredSlots.length) {
          await tx.playerQuicklink.createMany({
            data: filteredSlots.map((slot) => ({
              playerId: data.playerId,
              slotNumber: slot.slotNumber,
              quickLinkOptionId: slot.quickLinkOptionId,
            })),
          })
        }
      } else {
        await tx.villageQuicklink.deleteMany({ where: { villageId: data.villageId! } })
        if (filteredSlots.length) {
          await tx.villageQuicklink.createMany({
            data: filteredSlots.map((slot) => ({
              villageId: data.villageId!,
              slotNumber: slot.slotNumber,
              quickLinkOptionId: slot.quickLinkOptionId,
            })),
          })
        }
      }
    })

    const [playerQuicklinks, villageQuicklinks] = await Promise.all([
      prisma.playerQuicklink.findMany({
        where: { playerId: data.playerId },
        orderBy: { slotNumber: "asc" },
        include: { quickLinkOption: true },
      }),
      data.villageId
        ? prisma.villageQuicklink.findMany({
            where: { villageId: data.villageId },
            orderBy: { slotNumber: "asc" },
            include: { quickLinkOption: true },
          })
        : Promise.resolve([]),
    ])

    return successResponse({ playerQuicklinks, villageQuicklinks })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

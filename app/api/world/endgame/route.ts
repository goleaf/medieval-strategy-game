import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * GET /api/world/endgame
 * Returns the current endgame configuration and live progress snapshot so the
 * UI can surface domination percentages, rune control, and timers.
 */
export async function GET() {
  try {
    const prismaAny = prisma as Record<string, any>
    if (
      !prismaAny.endgameConfig ||
      typeof prismaAny.endgameConfig.findFirst !== "function"
    ) {
      return NextResponse.json({
        success: true,
        data: null,
        message:
          "Endgame tables are not provisioned yet. Run the latest Prisma migrations to enable the feature.",
      })
    }

    const config = await prismaAny.endgameConfig.findFirst({
      include: {
        states: { orderBy: { createdAt: "desc" }, take: 1 },
        runeVillages: {
          include: {
            village: {
              select: {
                id: true,
                name: true,
                x: true,
                y: true,
                player: {
                  select: {
                    id: true,
                    tribeId: true,
                    tribe: { select: { id: true, name: true, tag: true } },
                  },
                },
              },
            },
            controllingTribe: { select: { id: true, name: true, tag: true } },
          },
        },
      },
    })

    if (!config) {
      return NextResponse.json({ success: true, data: null })
    }

    const state = config.states[0] ?? null

    const payload = {
      config: {
        type: config.type,
        dominanceThreshold: config.dominanceThreshold,
        dominanceHoldHours: config.dominanceHoldHours,
        dominanceBaseline: config.dominanceBaseline,
        dominanceWarningDistance: config.dominanceWarningDistance,
        earliestStart: config.earliestStart?.toISOString() ?? null,
        runeRequirement: config.runeRequirement,
        runeHoldHours: config.runeHoldHours,
        runeTimerBehavior: config.runeTimerBehavior,
        runeWarningDistance: config.runeWarningDistance,
        relicsEnabled: config.relicsEnabled,
        relicPlacementLimit: config.relicPlacementLimit,
        relicCooldownHours: config.relicCooldownHours,
        relicStackCap: config.relicStackCap,
        relicSubstatCap: config.relicSubstatCap,
      },
      state: state
        ? {
            status: state.status,
            leadingTribeId: state.leadingTribeId,
            leadingPercent: state.leadingPercent,
            countedVillages: state.countedVillages,
            runeControlCount: state.runeControlCount,
            warningEmittedAt: state.warningEmittedAt?.toISOString() ?? null,
            holdStartedAt: state.holdStartedAt?.toISOString() ?? null,
            holdEndsAt: state.holdEndsAt?.toISOString() ?? null,
            completedAt: state.completedAt?.toISOString() ?? null,
          }
        : null,
      runeVillages: config.runeVillages.map((rune: any) => ({
        id: rune.id,
        villageId: rune.villageId,
        runeType: rune.runeType,
        defenseMultiplier: rune.defenseMultiplier,
        required: rune.required,
        holdRequirementHours: rune.holdRequirementHours,
        holdStartedAt: rune.holdStartedAt?.toISOString() ?? null,
        holdEndsAt: rune.holdEndsAt?.toISOString() ?? null,
        controllingTribeId: rune.controllingTribeId,
        controllingTribe: rune.controllingTribe
          ? {
              id: rune.controllingTribe.id,
              name: rune.controllingTribe.name,
              tag: rune.controllingTribe.tag,
            }
          : rune.village.player?.tribe
          ? {
              id: rune.village.player.tribe.id,
              name: rune.village.player.tribe.name,
              tag: rune.village.player.tribe.tag,
            }
          : null,
        coordinates: { x: rune.village.x, y: rune.village.y },
        villageName: rune.village.name,
      })),
    }

    return NextResponse.json({ success: true, data: payload })
  } catch (error) {
    console.error("[EndgameAPI] Failed to load endgame status", error)
    return NextResponse.json(
      { success: false, error: "Failed to load endgame status" },
      { status: 500 },
    )
  }
}

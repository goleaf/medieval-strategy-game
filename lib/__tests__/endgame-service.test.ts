import { describe, expect, it, vi, afterEach } from "vitest"
import { EndgameService, ENDGAME_STATUS } from "@/lib/game-services/endgame-service"
import { prisma } from "@/lib/db"

const prismaAny = prisma as Record<string, any>

afterEach(() => {
  delete prismaAny.endgameConfig
  delete prismaAny.endgameState
  delete prismaAny.endgameRuneVillage
  vi.restoreAllMocks()
})

describe("EndgameService", () => {
  it("skips evaluation when Prisma delegates are missing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

    await EndgameService.evaluateWorldEndgame(new Date())

    expect(warnSpy).toHaveBeenCalledOnce()
  })

  it("updates state when domination warning threshold is crossed", async () => {
    const now = new Date()

    prismaAny.endgameConfig = {
      findFirst: vi.fn().mockResolvedValue({
        id: "cfg",
        type: "DOMINATION",
        dominanceThreshold: 0.7,
        dominanceHoldHours: 0,
        dominanceBaseline: "PLAYER_OWNED",
        dominanceWarningDistance: 0.05,
        runeRequirement: 0,
        runeHoldHours: 0,
        runeTimerBehavior: "RESET_ON_LOSS",
        relicsEnabled: false,
        relicPlacementLimit: 10,
        relicCooldownHours: 24,
        relicStackCap: 0.1,
        relicSubstatCap: 0.05,
        earliestStart: null,
        runeVillages: [],
        states: [
          {
            id: "state",
            status: "IDLE",
            leadingTribeId: null,
            leadingPercent: 0,
            countedVillages: 0,
            runeControlCount: 0,
            warningEmittedAt: null,
            holdStartedAt: null,
            holdEndsAt: null,
            completedAt: null,
          },
        ],
      }),
    }

    const updateSpy = vi.fn().mockResolvedValue({})
    prismaAny.endgameState = {
      update: updateSpy,
      create: vi.fn(),
    }

    prismaAny.endgameRuneVillage = {
      update: vi.fn(),
    }

    vi.spyOn(prisma.village, "findMany").mockResolvedValue([
      { player: { tribeId: "tribeA" } },
      { player: { tribeId: "tribeA" } },
      { player: { tribeId: null } },
    ])

    vi.spyOn(prisma.admin, "findMany").mockResolvedValue([])
    vi.spyOn(prisma.adminNotification, "createMany").mockResolvedValue({
      count: 0,
    })

    await EndgameService.evaluateWorldEndgame(now)

    expect(updateSpy).toHaveBeenCalledTimes(1)
    const updateArgs = updateSpy.mock.calls[0][0]
    expect(updateArgs.where.id).toBe("state")
    expect(updateArgs.data.status).toBe(ENDGAME_STATUS.WARNING)
    expect(updateArgs.data.leadingTribeId).toBe("tribeA")
    expect(updateArgs.data.leadingPercent).toBeCloseTo(2 / 3, 5)
    expect(updateArgs.data.countedVillages).toBe(3)
  })
})

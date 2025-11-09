import { beforeEach, describe, expect, it, vi } from "vitest"
import { CrannyService } from "@/lib/game-services/cranny-service"

const prismaMock = vi.hoisted(() => ({
  village: {
    findUnique: vi.fn(),
  },
  crannyProtectionCurve: {
    findMany: vi.fn(),
  },
}))

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}))

describe("CrannyService", () => {
  beforeEach(async () => {
    prismaMock.village.findUnique.mockReset()
    prismaMock.crannyProtectionCurve.findMany.mockReset()
    prismaMock.crannyProtectionCurve.findMany.mockResolvedValue([
      { level: 1, protectedPerResource: 200, gaulBonusMultiplier: 1.5, teutonPenaltyPercent: 0.8 },
      { level: 2, protectedPerResource: 400, gaulBonusMultiplier: 1.5, teutonPenaltyPercent: 0.8 },
    ])
    await CrannyService.refreshCurve()
  })

  it("applies defender tribe bonuses", async () => {
    prismaMock.village.findUnique.mockResolvedValue({
      buildings: [
        { type: "CRANNY", level: 1 },
        { type: "CRANNY", level: 2 },
      ],
      player: { gameTribe: "GAULS" },
    })

    const protection = await CrannyService.calculateTotalProtection("village-gaul")
    expect(protection.wood).toBe(450) // (100 + 200) * 1.5
    expect(prismaMock.crannyProtectionCurve.findMany).toHaveBeenCalled()
  })

  it("applies attacker penetration modifiers", async () => {
    prismaMock.village.findUnique.mockResolvedValue({
      buildings: [
        { type: "CRANNY", level: 1 },
        { type: "CRANNY", level: 2 },
      ],
      player: { gameTribe: "ROMANS" },
    })

    const protection = await CrannyService.calculateTotalProtection("village-roman", "TEUTONS")
    expect(protection.wood).toBe(60) // (100 + 200) reduced by 80%
  })

  it("provides base vs adjusted protection breakdown", async () => {
    prismaMock.village.findUnique.mockResolvedValue({
      buildings: [{ type: "CRANNY", level: 1 }],
      player: { gameTribe: "GAULS" },
    })

    const breakdown = await CrannyService.getProtectionBreakdown("village-gaul")
    expect(breakdown.base.wood).toBe(100)
    expect(breakdown.adjusted.wood).toBe(150)
    expect(breakdown.defenderTribe).toBe("GAULS")
    expect(breakdown.crannyCount).toBe(1)
  })
})

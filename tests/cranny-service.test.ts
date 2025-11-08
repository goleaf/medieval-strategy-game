import { beforeEach, describe, expect, it, vi } from "vitest"
import { CrannyService } from "@/lib/game-services/cranny-service"

const prismaMock = {
  village: {
    findUnique: vi.fn(),
  },
  crannyProtectionCurve: {
    findMany: vi.fn(),
  },
}

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
    expect(protection.wood).toBe(900) // (200 + 400) * 1.5
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
    expect(protection.wood).toBe(120) // (200 + 400) * 0.2
  })
})

import { beforeEach, describe, expect, it, vi } from "vitest"
import { MerchantService } from "@/lib/game-services/merchant-service"

const sharedModels = {
  building: {
    findUnique: vi.fn(),
  },
  village: {
    findUnique: vi.fn(),
  },
  merchantState: {
    findUnique: vi.fn(),
    upsert: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
}

const prismaMock = {
  ...sharedModels,
  $transaction: vi.fn(async (cb: any) => cb(sharedModels as any)),
}

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}))

describe("MerchantService", () => {
  beforeEach(() => {
    sharedModels.building.findUnique.mockReset()
    sharedModels.village.findUnique.mockReset()
    sharedModels.merchantState.findUnique.mockReset()
    sharedModels.merchantState.upsert.mockReset()
    sharedModels.merchantState.update.mockReset()
    sharedModels.merchantState.updateMany.mockReset()
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(sharedModels as any))
  })

  it("computes merchant snapshot with tribe modifiers", async () => {
    sharedModels.building.findUnique.mockResolvedValue({ level: 4 })
    sharedModels.village.findUnique.mockResolvedValue({
      player: { gameTribe: "TEUTONS" },
    })
    sharedModels.merchantState.findUnique.mockResolvedValue({
      merchantsBusy: 4,
      merchantsReserved: 2,
    })

    const snapshot = await MerchantService.getSnapshot("village-1")

    expect(snapshot.totalMerchants).toBe(10) // 2 base + 2 per level
    expect(snapshot.availableMerchants).toBe(4)
    expect(snapshot.capacityPerMerchant).toBe(1000)
    expect(snapshot.tilesPerHour).toBe(12)
  })

  it("reserves merchants atomically", async () => {
    sharedModels.building.findUnique.mockResolvedValue({ level: 3 })
    sharedModels.village.findUnique.mockResolvedValue({
      player: { gameTribe: "ROMANS" },
    })
    sharedModels.merchantState.findUnique.mockResolvedValue(null)
    sharedModels.merchantState.upsert.mockResolvedValue({})

    const snapshot = await MerchantService.reserveMerchants("village-2", 2)

    expect(sharedModels.merchantState.upsert).toHaveBeenCalledWith({
      where: { villageId: "village-2" },
      update: expect.objectContaining({ merchantsBusy: expect.objectContaining({ increment: 2 }) }),
      create: expect.objectContaining({ merchantsBusy: 2 }),
    })
    expect(snapshot.busyMerchants).toBe(2)
    expect(snapshot.availableMerchants).toBeGreaterThanOrEqual(0)
  })
})

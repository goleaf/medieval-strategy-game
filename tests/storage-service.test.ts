import { beforeEach, describe, expect, it, vi } from "vitest"
import { StorageLedgerReason } from "@prisma/client"
import { StorageService } from "@/lib/game-services/storage-service"
import { CapacityService } from "@/lib/game-services/capacity-service"

const villageModel = {
  findUnique: vi.fn(),
  update: vi.fn(),
}

const ledgerModel = {
  create: vi.fn(),
}

const prismaMock = {
  village: villageModel,
  villageStorageLedger: ledgerModel,
  $transaction: vi.fn(async (cb: any) => cb(prismaMock as any)),
}

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}))

describe("StorageService", () => {
  beforeEach(() => {
    villageModel.findUnique.mockReset()
    villageModel.update.mockReset()
    ledgerModel.create.mockReset()
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock as any))
    vi.spyOn(CapacityService, "getVillageCapacitySummary").mockResolvedValue({
      totals: {
        wood: 100,
        stone: 100,
        iron: 100,
        gold: 100,
        food: 100,
      },
      warehouses: [],
      granaries: [],
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("clamps additions at capacity and records ledger entries", async () => {
    villageModel.findUnique.mockResolvedValue({
      id: "village-1",
      wood: 95,
      stone: 10,
      iron: 10,
      gold: 10,
      food: 10,
    })
    villageModel.update.mockResolvedValue({})
    ledgerModel.create.mockResolvedValue({})

    const result = await StorageService.addResources("village-1", { wood: 20 }, StorageLedgerReason.PRODUCTION)

    expect(villageModel.update).toHaveBeenCalledWith({
      where: { id: "village-1" },
      data: { wood: 100 },
    })
    expect(result.appliedDelta.wood).toBe(5)
    expect(ledgerModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          woodDelta: 5,
          reason: "PRODUCTION",
        }),
      }),
    )
  })

  it("throws when deducting more resources than available", async () => {
    villageModel.findUnique.mockResolvedValue({
      id: "village-2",
      wood: 5,
      stone: 0,
      iron: 0,
      gold: 0,
      food: 0,
    })

    await expect(
      StorageService.deductResources("village-2", { wood: 10 }, StorageLedgerReason.BUILD_COST),
    ).rejects.toThrow(/lacks wood/)
    expect(villageModel.update).not.toHaveBeenCalled()
    expect(ledgerModel.create).not.toHaveBeenCalled()
  })
})

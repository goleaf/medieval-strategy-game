import { beforeEach, describe, expect, it, vi } from "vitest"
import { ShipmentService } from "@/lib/game-services/shipment-service"
import { MerchantService } from "@/lib/game-services/merchant-service"
import { StorageService } from "@/lib/game-services/storage-service"

const txModels = {
  shipment: {
    create: vi.fn(),
  },
  village: {
    findMany: vi.fn(),
  },
  villageDistanceCache: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
}

const prismaMock = {
  ...txModels,
  $transaction: vi.fn(async (cb: any) => cb(txModels as any)),
}

vi.mock("@/lib/db", () => ({
  prisma: prismaMock,
}))

describe("ShipmentService", () => {
  beforeEach(() => {
    txModels.shipment.create.mockReset()
    txModels.village.findMany.mockReset()
    txModels.villageDistanceCache.findUnique.mockReset()
    txModels.villageDistanceCache.create.mockReset()
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(txModels as any))
    vi.restoreAllMocks()
  })

  it("creates direct shipments with travel times", async () => {
    vi.spyOn(MerchantService, "getSnapshot").mockResolvedValue({
      villageId: "source",
      marketplaceLevel: 3,
      totalMerchants: 8,
      busyMerchants: 0,
      reservedMerchants: 0,
      availableMerchants: 8,
      capacityPerMerchant: 500,
      tilesPerHour: 10,
      tribe: "ROMANS",
    })
    vi.spyOn(MerchantService, "reserveMerchants").mockResolvedValue({
      villageId: "source",
      marketplaceLevel: 3,
      totalMerchants: 8,
      busyMerchants: 2,
      reservedMerchants: 0,
      availableMerchants: 6,
      capacityPerMerchant: 500,
      tilesPerHour: 10,
      tribe: "ROMANS",
    })
    vi.spyOn(StorageService, "deductResources").mockResolvedValue({
      appliedDelta: { wood: -200, stone: 0, iron: 0, gold: 0, food: 0 },
      totals: { wood: 1000, stone: 1000, iron: 1000, gold: 1000, food: 1000 },
    })

    txModels.village.findMany.mockResolvedValue([
      { id: "source", x: 0, y: 0, player: { gameWorld: { speed: 2 } } },
      { id: "target", x: 3, y: 4, player: { gameWorld: { speed: 1 } } },
    ])
    txModels.villageDistanceCache.findUnique.mockResolvedValue(null)
    txModels.villageDistanceCache.create.mockResolvedValue({})
    txModels.shipment.create.mockImplementation(async ({ data }) => ({ id: "shipment-test", ...data }))

    const shipment = await ShipmentService.createDirectShipment({
      sourceVillageId: "source",
      targetVillageId: "target",
      bundle: { wood: 200 },
    })

    expect(MerchantService.reserveMerchants).toHaveBeenCalledWith("source", 1, expect.any(Object))
    expect(StorageService.deductResources).toHaveBeenCalledWith(
      "source",
      { wood: 200 },
      expect.any(String),
      expect.any(Object),
    )
    expect(txModels.shipment.create).toHaveBeenCalled()
    expect(shipment.arriveAt.getTime()).toBeGreaterThan(shipment.departAt.getTime())
    expect(txModels.villageDistanceCache.create).toHaveBeenCalled()
  })
})

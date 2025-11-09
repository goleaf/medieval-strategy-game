import { beforeEach, describe, expect, it, vi } from "vitest"
import { ShipmentService } from "@/lib/game-services/shipment-service"
import { MerchantService } from "@/lib/game-services/merchant-service"
import { StorageService } from "@/lib/game-services/storage-service"

const prismaModule = vi.hoisted(() => {
  const txModels = {
    shipment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
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

  return { txModels, prismaMock }
})

vi.mock("@/lib/db", () => ({
  prisma: prismaModule.prismaMock,
}))

const { txModels, prismaMock } = prismaModule

describe("ShipmentService", () => {
  beforeEach(() => {
    txModels.shipment.create.mockReset()
    txModels.shipment.findUnique.mockReset()
    txModels.shipment.update.mockReset()
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

  it("cancels active shipments before arrival", async () => {
    const now = new Date("2025-01-01T00:10:00Z")
    vi.setSystemTime(now)

    const baseShipment = {
      id: "shipment-cancel",
      sourceVillageId: "source",
      targetVillageId: "target",
      sourceVillage: { playerId: "player-1" },
      merchantsUsed: 2,
      departAt: new Date(now.getTime() - 5 * 60 * 1000),
      arriveAt: new Date(now.getTime() + 5 * 60 * 1000),
      returnAt: new Date(now.getTime() + 10 * 60 * 1000),
      status: "EN_ROUTE" as const,
      cancelledAt: null,
      deliveredAt: null,
    }

    txModels.shipment.findUnique.mockResolvedValue(baseShipment)
    txModels.shipment.update.mockImplementation(async ({ data }) => ({
      ...baseShipment,
      ...data,
    }))

    try {
      const updated = await ShipmentService.cancelShipment("shipment-cancel", "player-1")

      expect(txModels.shipment.update).toHaveBeenCalled()
      expect(updated.status).toBe("CANCELLED")
      expect(updated.returnAt.getTime()).toBe(now.getTime() + 5 * 60 * 1000)
    } finally {
      vi.useRealTimers()
    }
  })
})

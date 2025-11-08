import { prisma } from "@/lib/db"
import {
  RESOURCE_ENUMS,
  RESOURCE_ENUM_TO_CONFIG,
  calculateCropConsumption,
  calculateFieldProduction,
  getHeroBonuses,
  partitionModifiers,
} from "@/lib/game-services/resource-production-helpers"
import type { Prisma, Troop, TroopBalance } from "@prisma/client"

const BASELINE_PRODUCTION_PER_HOUR = 2

export class ResourceProductionService {
  static async processAllVillages(options?: { tickMinutes?: number }) {
    const worldConfig = await prisma.worldConfig.findFirst({
      select: { tickIntervalMinutes: true },
    })

    const tickMinutes = options?.tickMinutes ?? worldConfig?.tickIntervalMinutes ?? 60
    const villages = await prisma.village.findMany({
      where: { player: { isDeleted: false } },
      select: { id: true },
    })

    for (const village of villages) {
      await this.processVillageTick(village.id, tickMinutes)
    }
  }

  static async processVillageTick(villageId: string, tickMinutes: number) {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: {
        resourceFields: true,
        resourceLedgers: true,
        resourceModifiers: true,
        troops: true,
        player: {
          include: {
            hero: true,
            gameWorld: true,
          },
        },
      },
    })

    if (!village) return

    if (village.resourceLedgers.length < RESOURCE_ENUMS.length || village.resourceFields.length === 0) {
      await this.bootstrapVillageResources(village.id)
      return this.processVillageTick(villageId, tickMinutes)
    }

    const tickHours = tickMinutes / 60
    const loyaltyMultiplier = Math.max(0, village.loyalty) / Math.max(1, village.maxLoyalty || 100)
    const speedMultiplier = village.player?.gameWorld?.speed ?? 1
    const heroBonuses = this.getHeroBonuses(village.player?.hero)
    const activeModifiers = this.partitionModifiers(village.resourceModifiers)
    const fieldProduction = this.calculateFieldProduction(village.resourceFields)

    const troopBalanceLookup = await this.buildTroopBalanceLookup(village.troops)
    let baseCropConsumptionPerHour = calculateCropConsumption(village.troops, troopBalanceLookup)
    const consumptionReduction = activeModifiers.cropConsumptionReduction
    let effectiveConsumptionPerHour = baseCropConsumptionPerHour * Math.max(0, 1 - consumptionReduction)

    await prisma.$transaction(async (tx) => {
      const now = new Date()

      for (const ledger of village.resourceLedgers) {
        const slug = RESOURCE_ENUM_TO_CONFIG[ledger.resourceType]
        const fieldOutput = fieldProduction[ledger.resourceType] ?? 0
        const baseGross = (BASELINE_PRODUCTION_PER_HOUR + fieldOutput) * loyaltyMultiplier * speedMultiplier
        const heroMultiplier = 1 + heroBonuses.all + heroBonuses[slug]
        const resourceMultiplier = 1 + activeModifiers.resource[ledger.resourceType]
        const grossPerHour = baseGross * heroMultiplier * resourceMultiplier
        let amountDelta = grossPerHour * tickHours
        let netPerHour = grossPerHour

        if (ledger.resourceType === "CROP") {
          if (grossPerHour <= effectiveConsumptionPerHour) {
            baseCropConsumptionPerHour = await this.resolveStarvation(tx, {
              villageId: village.id,
              troops: village.troops,
              troopBalanceLookup,
              allowedUpkeep: grossPerHour,
            })
            effectiveConsumptionPerHour = baseCropConsumptionPerHour * Math.max(0, 1 - consumptionReduction)
          }

          netPerHour = grossPerHour - effectiveConsumptionPerHour
          amountDelta = netPerHour * tickHours
        }

        const newAmount = Math.max(
          0,
          Math.min(ledger.storageCapacity, Math.floor(ledger.currentAmount + amountDelta)),
        )

        await tx.villageResourceLedger.update({
          where: { id: ledger.id },
          data: {
            currentAmount: newAmount,
            productionPerHour: Math.max(0, Math.floor(grossPerHour)),
            netProductionPerHour: Math.floor(netPerHour),
            lastTickAt: now,
          },
        })
      }

      await tx.village.update({
        where: { id: village.id },
        data: { lastTickAt: now },
      })
    })
  }

  private static async bootstrapVillageResources(villageId: string) {
    await prisma.$transaction(async (tx) => {
      for (const resourceType of RESOURCE_ENUMS) {
        await tx.villageResourceLedger.upsert({
          where: {
            villageId_resourceType: {
              villageId,
              resourceType,
            },
          },
          update: {},
          create: {
            villageId,
            resourceType,
            currentAmount: 500,
            productionPerHour: BASELINE_PRODUCTION_PER_HOUR,
            netProductionPerHour: BASELINE_PRODUCTION_PER_HOUR,
            storageCapacity: resourceType === "CROP" ? 2400 : 1200,
          },
        })

        for (let slot = 0; slot < 10; slot++) {
          await tx.villageResourceField.upsert({
            where: {
              villageId_resourceType_slot: {
                villageId,
                resourceType,
                slot,
              },
            },
            update: {},
            create: {
              villageId,
              resourceType,
              slot,
              level: 0,
            },
          })
        }
      }
    })
  }

  private static async buildTroopBalanceLookup(troops: Troop[]) {
    const troopTypes = troops.map((troop) => troop.type)
    if (troopTypes.length === 0) {
      return new Map<TroopBalance["troopType"], TroopBalance>()
    }

    const balances = await prisma.troopBalance.findMany({
      where: { troopType: { in: troopTypes } },
    })

    return new Map(balances.map((balance) => [balance.troopType, balance]))
  }

  private static async resolveStarvation(
    tx: Prisma.TransactionClient,
    params: {
      villageId: string
      troops: Troop[]
      troopBalanceLookup: Map<TroopBalance["troopType"], TroopBalance>
      allowedUpkeep: number
    },
  ): Promise<number> {
    let totalUpkeep = calculateCropConsumption(params.troops, params.troopBalanceLookup)
    if (totalUpkeep <= params.allowedUpkeep) {
      return totalUpkeep
    }

    const casualties: { troopId: string; type: Troop["type"]; lost: number }[] = []
    const sortedTroops = [...params.troops].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    )

    for (const troop of sortedTroops) {
      if (totalUpkeep <= params.allowedUpkeep) break
      const upkeepPerUnit = params.troopBalanceLookup.get(troop.type)?.cropUpkeep ?? 1

      if (upkeepPerUnit <= 0) continue

      const requiredReduction = totalUpkeep - params.allowedUpkeep
      const unitsToKill = Math.min(troop.quantity, Math.ceil(requiredReduction / upkeepPerUnit))

      if (unitsToKill <= 0) continue

      await tx.troop.update({
        where: { id: troop.id },
        data: { quantity: troop.quantity - unitsToKill },
      })

      troop.quantity -= unitsToKill
      totalUpkeep -= unitsToKill * upkeepPerUnit
      casualties.push({ troopId: troop.id, type: troop.type, lost: unitsToKill })
    }

    if (casualties.length) {
      console.warn(
        `[starvation] Village ${params.villageId} lost troops due to crop deficit`,
        casualties.map((entry) => `${entry.type}: -${entry.lost}`).join(", "),
      )
    }

    return Math.max(totalUpkeep, 0)
  }
}

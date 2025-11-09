import { prisma } from "@/lib/db"
import { WorldSettingsService } from "@/lib/game-services/world-settings-service"
import { EventQueueService } from "@/lib/game-services/event-queue-service"

interface PathNode {
  x: number
  y: number
}

export class MovementService {
  /**
   * Calculate distance between two points
   */
  static distance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
  }

  /**
   * A* pathfinding algorithm
   */
  static findPath(startX: number, startY: number, endX: number, endY: number, maxDistance = 100): PathNode[] {
    const openSet = [[startX, startY]]
    const cameFrom = new Map<string, [number, number]>()
    const gScore = new Map<string, number>()
    const fScore = new Map<string, number>()

    const heuristic = (x: number, y: number) => this.distance(x, y, endX, endY)

    const keyToString = (x: number, y: number) => `${x},${y}`
    const stringToKey = (str: string) => {
      const [x, y] = str.split(",").map(Number)
      return [x, y]
    }

    gScore.set(keyToString(startX, startY), 0)
    fScore.set(keyToString(startX, startY), heuristic(startX, startY))

    while (openSet.length > 0) {
      let current: [number, number] | null = null
      let minF = Number.POSITIVE_INFINITY

      for (const node of openSet) {
        const f = fScore.get(keyToString(node[0], node[1])) || Number.POSITIVE_INFINITY
        if (f < minF) {
          minF = f
          current = node
        }
      }

      if (!current) break
      if (current[0] === endX && current[1] === endY) {
        // Reconstruct path
        const path: PathNode[] = [{ x: endX, y: endY }]
        let node: [number, number] | undefined = current
        while (cameFrom.has(keyToString(node[0], node[1]))) {
          node = cameFrom.get(keyToString(node[0], node[1]))!
          path.unshift({ x: node[0], y: node[1] })
        }
        return path
      }

      openSet.splice(openSet.indexOf(current), 1)

      // Check 8 adjacent cells
      const neighbors = [
        [current[0] + 1, current[1]],
        [current[0] - 1, current[1]],
        [current[0], current[1] + 1],
        [current[0], current[1] - 1],
        [current[0] + 1, current[1] + 1],
        [current[0] - 1, current[1] - 1],
        [current[0] + 1, current[1] - 1],
        [current[0] - 1, current[1] + 1],
      ]

      for (const neighbor of neighbors) {
        if (this.distance(neighbor[0], neighbor[1], startX, startY) > maxDistance) continue

        const tentativeGScore = (gScore.get(keyToString(current[0], current[1])) || 0) + 1
        const neighborG = gScore.get(keyToString(neighbor[0], neighbor[1])) || Number.POSITIVE_INFINITY

        if (tentativeGScore < neighborG) {
          cameFrom.set(keyToString(neighbor[0], neighbor[1]), current)
          gScore.set(keyToString(neighbor[0], neighbor[1]), tentativeGScore)
          fScore.set(keyToString(neighbor[0], neighbor[1]), tentativeGScore + heuristic(neighbor[0], neighbor[1]))

          if (!openSet.some((n) => n[0] === neighbor[0] && n[1] === neighbor[1])) {
            openSet.push(neighbor as [number, number])
          }
        }
      }
    }

    return []
  }

  /**
   * Calculate travel time between two points
   * ETA = distance * unit_speed / world.unit_speed
   * Slowest unit defines stack speed
   */
  static async calculateTravelTime(
    distance: number,
    troopSpeeds: number[],
    worldUnitSpeed?: number,
  ): Promise<number> {
    let effectiveUnitSpeed = worldUnitSpeed
    if (effectiveUnitSpeed === undefined) {
      const config = await prisma.worldConfig.findFirst({ select: { unitSpeed: true } })
      effectiveUnitSpeed = config?.unitSpeed ?? 1.0
    }

    // Slowest unit defines stack speed
    const slowestSpeed = Math.min(...troopSpeeds)

    // ETA = distance * unit_speed / world.unit_speed
    // Convert to milliseconds
    const travelTimeSeconds = (distance * slowestSpeed) / Math.max(0.01, effectiveUnitSpeed)
    return Math.ceil(travelTimeSeconds * 1000)
  }

  /**
   * Get slowest troop speed from a troop stack
   */
  static getSlowestSpeed(troops: Array<{ speed: number; quantity: number }>): number {
    if (troops.length === 0) return 5 // Default speed
    return Math.min(...troops.map((t) => t.speed))
  }

  /**
   * Send troops between villages (Reign of Fire troop forwarding)
   */
  static async sendTroops(
    fromVillageId: string,
    toVillageId: string,
    troopAmounts: Record<string, number>
  ): Promise<void> {
    const fromVillage = await prisma.village.findUnique({
      where: { id: fromVillageId },
      include: { player: { include: { gameWorld: true } } }
    })

    const toVillage = await prisma.village.findUnique({
      where: { id: toVillageId },
      include: { player: true }
    })

    if (!fromVillage || !toVillage) {
      throw new Error("Village not found")
    }

    // Check ownership/alliance permissions (Reign of Fire: can send to own villages or allies)
    const isOwnVillage = fromVillage.playerId === toVillage.playerId
    const isAlly = await this.checkAllianceStatus(fromVillage.playerId, toVillage.playerId)

    if (!isOwnVillage && !isAlly) {
      throw new Error("Can only send troops to own villages or allies")
    }

    // Get available troops
    const availableTroops = await prisma.troop.findMany({
      where: { villageId: fromVillageId }
    })

    // Validate troop amounts
    for (const [troopType, amount] of Object.entries(troopAmounts)) {
      const troop = availableTroops.find(t => t.type === troopType)
      if (!troop || troop.quantity < amount) {
        throw new Error(`Insufficient ${troopType} troops`)
      }
    }

    // Calculate travel time
    const distance = this.distance(fromVillage.x, fromVillage.y, toVillage.x, toVillage.y)
    const troopSpeeds = availableTroops.map(t => t.speed)
    const worldSettings = WorldSettingsService.derive(fromVillage.player?.gameWorld)
    const travelTime = await this.calculateTravelTime(distance, troopSpeeds, worldSettings.unitSpeed)
    const arrivalTime = new Date(Date.now() + travelTime)

    // Create movement record
    const movement = await prisma.movement.create({
      data: {
        kind: "TROOP",
        fromVillageId,
        toVillageId,
        fromX: fromVillage.x,
        fromY: fromVillage.y,
        toX: toVillage.x,
        toY: toVillage.y,
        path: JSON.stringify([]), // Simple path for now
        currentStep: 0,
        totalSteps: 1,
        startedAt: new Date(),
        arrivalAt: arrivalTime,
        status: "IN_PROGRESS"
      }
    })

    await EventQueueService.scheduleEvent(
      "TROOP_MOVEMENT",
      arrivalTime,
      { movementId: movement.id },
      { dedupeKey: `movement:${movement.id}` },
    )

    // Create troop movements for each type
    for (const [troopType, amount] of Object.entries(troopAmounts)) {
      if (amount > 0) {
        const troop = availableTroops.find(t => t.type === troopType)
        if (troop) {
          // Deduct troops from source village
          await prisma.troop.update({
            where: {
              villageId_type: {
                villageId: fromVillageId,
                type: troopType as any
              }
            },
            data: {
              quantity: troop.quantity - amount
            }
          })

          // Create movement record for this troop type
          await prisma.movement.create({
            data: {
              kind: "TROOP",
              troopId: troop.id,
              fromVillageId,
              toVillageId,
              fromX: fromVillage.x,
              fromY: fromVillage.y,
              toX: toVillage.x,
              toY: toVillage.y,
              path: JSON.stringify([]),
              currentStep: 0,
              totalSteps: 1,
              startedAt: new Date(),
              arrivalAt: arrivalTime,
              status: "IN_PROGRESS"
            }
          })
        }
      }
    }
  }

  /**
   * Merge arriving troops into destination village
   */
  static async mergeTroops(movementId: string): Promise<void> {
    const movement = await prisma.movement.findUnique({
      where: { id: movementId },
      include: { troop: true }
    })

    if (!movement || !movement.troop) {
      return
    }

    // Find destination village
    const destinationVillage = movement.toVillageId
      ? await prisma.village.findUnique({ where: { id: movement.toVillageId } })
      : await prisma.village.findFirst({
          where: {
            x: movement.toX,
            y: movement.toY
          }
        })

    if (!destinationVillage) {
      return
    }

    // Add troops to destination village
    const existingTroop = await prisma.troop.findUnique({
      where: {
        villageId_type: {
          villageId: destinationVillage.id,
          type: movement.troop.type
        }
      }
    })

    if (existingTroop) {
      // Merge with existing troops
      await prisma.troop.update({
        where: {
          villageId_type: {
            villageId: destinationVillage.id,
            type: movement.troop.type
          }
        },
        data: {
          quantity: existingTroop.quantity + movement.troop.quantity
        }
      })
    } else {
      // Create new troop entry
      await prisma.troop.create({
        data: {
          villageId: destinationVillage.id,
          type: movement.troop.type,
          quantity: movement.troop.quantity,
          health: movement.troop.health,
          attack: movement.troop.attack,
          defense: movement.troop.defense,
          speed: movement.troop.speed
        }
      })
    }

    // Delete the movement record
    await prisma.movement.delete({
      where: { id: movementId }
    })
  }

  /**
   * Check if two players are allies
   */
  static async checkAllianceStatus(playerId1: string, playerId2: string): Promise<boolean> {
    if (playerId1 === playerId2) return true

    // Get player tribes
    const player1 = await prisma.player.findUnique({
      where: { id: playerId1 },
      include: { tribe: true }
    })

    const player2 = await prisma.player.findUnique({
      where: { id: playerId2 },
      include: { tribe: true }
    })

    if (!player1?.tribe || !player2?.tribe) return false

    // Check for alliance between tribes
    const alliance = await prisma.tribeTreaty.findFirst({
      where: {
        OR: [
          { tribe1Id: player1.tribe.id, tribe2Id: player2.tribe.id },
          { tribe1Id: player2.tribe.id, tribe2Id: player1.tribe.id }
        ]
      }
    })

    return !!alliance
  }
}

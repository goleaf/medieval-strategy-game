import { prisma } from "@/lib/db"

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
  ): Promise<number> {
    // Get world unit speed multiplier
    const config = await prisma.worldConfig.findFirst()
    const worldUnitSpeed = config?.unitSpeed || 1.0

    // Slowest unit defines stack speed
    const slowestSpeed = Math.min(...troopSpeeds)

    // ETA = distance * unit_speed / world.unit_speed
    // Convert to milliseconds
    const travelTimeSeconds = (distance * slowestSpeed) / worldUnitSpeed
    return Math.ceil(travelTimeSeconds * 1000)
  }

  /**
   * Get slowest troop speed from a troop stack
   */
  static getSlowestSpeed(troops: Array<{ speed: number; quantity: number }>): number {
    if (troops.length === 0) return 5 // Default speed
    return Math.min(...troops.map((t) => t.speed))
  }
}

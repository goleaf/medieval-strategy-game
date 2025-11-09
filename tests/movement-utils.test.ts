import { describe, it, expect } from "vitest"
import { calculateDistance, computeTravel, type Coordinate } from "@/lib/troop-system/movement"

describe("movement utilities", () => {
  it("calculates Euclidean distance in tiles", () => {
    const a: Coordinate = { x: 0, y: 0 }
    const b: Coordinate = { x: 3, y: 4 }
    expect(calculateDistance(a, b)).toBe(5)
  })

  it("computes travel time using slowest stack and world speed", () => {
    const from: Coordinate = { x: 0, y: 0 }
    const to: Coordinate = { x: 0, y: 10 }
    const stacks = [
      { unitType: "spearman", count: 10 },
      { unitType: "scout", count: 5 },
    ]
    const result = computeTravel({ from, to, stacks, mission: "attack", config: {
      globals: { serverSpeed: 2 },
      units: {
        spearman: { role: "inf", speedTilesPerHour: 4 } as any,
        scout: { role: "scout", speedTilesPerHour: 20 } as any,
      },
    } as any })

    // distance = 10, slowest = 4, serverSpeed = 2 => 10 / 4 / 2 = 1.25h
    expect(result.distance).toBeCloseTo(10)
    expect(result.slowestSpeed).toBe(4)
    expect(result.durationHours).toBeCloseTo(1.25)
    expect(result.arriveAt.getTime()).toBeGreaterThan(result.departAt.getTime())
  })
})


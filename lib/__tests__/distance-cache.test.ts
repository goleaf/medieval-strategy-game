import { describe, expect, it } from "vitest"
import { DistanceCache } from "@/lib/map-vision/distance-cache"

describe("DistanceCache", () => {
  it("returns Manhattan approximations and exact Euclidean distances", () => {
    const cache = new DistanceCache()
    const origin = { x: 100, y: 100 }
    const target = { x: 110, y: 115 }
    const result = cache.distance(origin, target)

    expect(result.approximate).toBe(25)
    expect(result.exact).toBe(19)
    expect(result.usedApproximation).toBe(false)
  })

  it("re-uses cached results for repeated queries", () => {
    const cache = new DistanceCache()
    const a = { x: 0, y: 0 }
    const b = { x: 30, y: 40 }
    const first = cache.euclideanDistance(a, b)
    const second = cache.euclideanDistance(b, a)

    expect(first).toBe(50)
    expect(second).toBe(50)
  })

  it("short-circuits when approximation is allowed", () => {
    const cache = new DistanceCache()
    const origin = { x: 0, y: 0 }
    const target = { x: 1, y: 1 }
    const result = cache.distance(origin, target, true, 10)

    expect(result.usedApproximation).toBe(true)
    expect(result.exact).toBe(result.approximate)
  })
})

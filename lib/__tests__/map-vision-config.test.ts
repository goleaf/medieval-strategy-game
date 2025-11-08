import { describe, expect, it } from "vitest"
import {
  ATTRIBUTE_FRESHNESS_RULES,
  calculateWatchtowerBonus,
  getAttributeStatus,
  populationToBand,
  wallLevelToBand,
} from "@/lib/map-vision/config"

describe("map vision config helpers", () => {
  it("calculates watchtower bonus at defined thresholds", () => {
    expect(calculateWatchtowerBonus(0)).toBe(0)
    expect(calculateWatchtowerBonus(5)).toBe(1)
    expect(calculateWatchtowerBonus(12)).toBe(2)
    expect(calculateWatchtowerBonus(20)).toBe(4)
  })

  it("maps population and wall bands", () => {
    expect(populationToBand(10)?.id).toBe("P0")
    expect(populationToBand(1200)?.id).toBe("P5")
    expect(populationToBand(5000)?.id).toBe("P6")

    expect(wallLevelToBand(3)?.id).toBe("W0")
    expect(wallLevelToBand(12)?.id).toBe("W2")
    expect(wallLevelToBand(null)).toBeNull()
  })

  it("derives attribute freshness states", () => {
    const now = new Date()
    const freshEntry = { seenAt: now.toISOString() }
    expect(getAttributeStatus(freshEntry, "owner", now)).toBe("FRESH")

    const staleAgeHours = ATTRIBUTE_FRESHNESS_RULES.population.staleAfterHours + 1
    const staleEntry = { seenAt: new Date(now.getTime() - staleAgeHours * 60 * 60 * 1000).toISOString() }
    expect(getAttributeStatus(staleEntry, "population", now)).toBe("STALE")

    const expiredAgeHours = (ATTRIBUTE_FRESHNESS_RULES.population.expireAfterHours ?? 0) + 1
    const expiredEntry = { seenAt: new Date(now.getTime() - expiredAgeHours * 60 * 60 * 1000).toISOString() }
    expect(getAttributeStatus(expiredEntry, "population", now)).toBe("UNKNOWN")
  })
})

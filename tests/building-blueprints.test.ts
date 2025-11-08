import { describe, expect, it } from "vitest"
import type { BuildingType } from "@prisma/client"

import { getBlueprintKeyForBuilding } from "@/lib/game-services/construction-helpers"
import { getLevelData } from "@/lib/config/construction"

/**
 * Lightweight helper to extract numeric effect values in a type-safe manner for the tests.
 */
function requireNumericEffect(effects: Record<string, unknown> | undefined, key: string): number {
  const value = effects?.[key]
  if (typeof value !== "number") {
    throw new Error(`Expected numeric effect ${key}`)
  }
  return value
}

describe("building blueprint coverage", () => {
  it("accelerates cavalry production as the Stable levels up", () => {
    const blueprintKey = getBlueprintKeyForBuilding("STABLES" as BuildingType)
    expect(blueprintKey).toBe("stable")

    const levelOne = getLevelData(blueprintKey!, 1)
    const levelSix = getLevelData(blueprintKey!, 6)

    const speedOne = requireNumericEffect(levelOne.effects, "trainingSpeedMultiplier")
    const speedSix = requireNumericEffect(levelSix.effects, "trainingSpeedMultiplier")

    expect(speedSix).toBeLessThan(speedOne)
    expect(levelSix.cost.wood).toBeGreaterThan(levelOne.cost.wood)
  })

  it("exposes research acceleration on the Smithy blueprint", () => {
    const blueprintKey = getBlueprintKeyForBuilding("SMITHY" as BuildingType)
    expect(blueprintKey).toBe("smithy")

    const levelTwo = getLevelData(blueprintKey!, 2)
    const levelSeven = getLevelData(blueprintKey!, 7)

    const multiplierTwo = requireNumericEffect(levelTwo.effects, "researchSpeedMultiplier")
    const multiplierSeven = requireNumericEffect(levelSeven.effects, "researchSpeedMultiplier")

    expect(multiplierSeven).toBeLessThan(multiplierTwo)
  })

  it("grows merchant capacity as the Market advances", () => {
    const blueprintKey = getBlueprintKeyForBuilding("MARKETPLACE" as BuildingType)
    expect(blueprintKey).toBe("marketplace")

    const levelThree = getLevelData(blueprintKey!, 3)
    const levelEight = getLevelData(blueprintKey!, 8)

    const merchantsThree = requireNumericEffect(levelThree.effects, "merchants")
    const capacityThree = requireNumericEffect(levelThree.effects, "merchantCapacity")
    const merchantsEight = requireNumericEffect(levelEight.effects, "merchants")
    const capacityEight = requireNumericEffect(levelEight.effects, "merchantCapacity")

    expect(merchantsEight).toBeGreaterThan(merchantsThree)
    expect(capacityEight).toBeGreaterThan(capacityThree)
  })
})

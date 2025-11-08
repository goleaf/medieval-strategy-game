import { computeRamDrop } from "@/lib/balance/subsystem-effects"
import { getCatapultTargetingMode, getRallyPointConfig } from "@/lib/config/rally-point"
import { resolveCatapultDamage } from "@/lib/combat/catapult/engine"
import type { CatapultDamageResult, CatapultModifiers, CatapultRules, VillageSiegeSnapshot } from "@/lib/combat/catapult/types"

const RP_CONFIG = getRallyPointConfig()

export function calculateRamWallDrop(
  rams: number,
  wallLevel = 0,
  wallType = "city_wall",
  options?: { techLevel?: number },
): number {
  if (rams <= 0 || wallLevel <= 0) {
    return 0
  }
  const drop = computeRamDrop({
    survivingRams: rams,
    wallLevel,
    wallType,
    ramTechLevel: options?.techLevel,
  })
  return Math.max(0, Math.min(wallLevel, drop))
}

function splitCatapultShots(catapultCount: number, mode: ReturnType<typeof getCatapultTargetingMode>): number[] {
  if (mode === "two") {
    const first = Math.ceil(catapultCount / 2)
    const second = Math.floor(catapultCount / 2)
    return [first, second]
  }
  return [catapultCount]
}

export interface CatapultDamageContext {
  snapshot?: VillageSiegeSnapshot | null
  seed?: string
  rules?: CatapultRules
  modifiers?: CatapultModifiers
}

export function calculateCatapultDamage(
  catapults: number,
  rpLevel: number,
  targets: string[],
  context?: CatapultDamageContext,
): CatapultDamageResult {
  if (catapults <= 0) {
    return {
      totalCatapults: 0,
      totalShots: 0,
      mode: "random",
      targets: [],
      wastedShots: 0,
    }
  }

  const mode = getCatapultTargetingMode(rpLevel)
  const shotsSplit = splitCatapultShots(catapults, mode)

  return resolveCatapultDamage({
    catapults,
    mode,
    selections: targets,
    snapshot: context?.snapshot,
    rules: context?.rules,
    seed: context?.seed,
    modifiers: context?.modifiers,
    shotsSplit,
  })
}

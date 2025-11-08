import rallyPointData from "@/config/rally-point.json"

type MissionName = keyof typeof rallyPointData.missions

export type MissionSiegeMode = "full" | "none"
export type CatapultTargetingMode = "random" | "one" | "two"

export interface MissionConfig {
  allowRoles: string[]
  lethality?: number
  siegeEffects?: MissionSiegeMode
  combat?: "none"
  requireSiege?: boolean
}

export interface RallyPointConfigFile {
  version: string
  generatedAt: string
  notes?: string[]
  travel: {
    serverSpeed: number
    minWaveArrivalLeadMs: number
  }
  missions: Record<MissionName, MissionConfig>
  rallyPoint: {
    waveWindowDefaultMs: number
    cancelGraceMs: number
    catapultTargeting: {
      levels: Array<{ min: number; max: number | null; mode: CatapultTargetingMode }>
    }
    wavePrecisionMsByLevel: Record<string, number>
  }
  siege: {
    raidLethalityFactor: number
    ramTechPctPerLevel: number
    catapultTechPctPerLevel: number
    ramCurve: { alpha: number; beta: number; gamma: number }
    catapultCurve: { baseDrop: number; perLevelFalloff: number; minDrop: number }
  }
  walls: Record<string, { defPctPerLevel: number; ramResistanceMultiplier: number }>
}

const config = rallyPointData as RallyPointConfigFile

export function getMissionConfig(mission: MissionName): MissionConfig {
  const payload = config.missions[mission]
  if (!payload) {
    throw new Error(`Unknown mission type: ${mission}`)
  }
  return payload
}

export function getWavePrecisionMs(level: number): number {
  const thresholds = Object.entries(config.rallyPoint.wavePrecisionMsByLevel)
    .map(([levelKey, precision]) => ({ level: Number(levelKey), precision }))
    .sort((a, b) => a.level - b.level)

  let precision = config.rallyPoint.waveWindowDefaultMs
  for (const entry of thresholds) {
    if (level >= entry.level) {
      precision = entry.precision
    }
  }
  return precision
}

export function getCatapultTargetingMode(level: number): CatapultTargetingMode {
  const match = config.rallyPoint.catapultTargeting.levels.find((window) => {
    const withinMin = level >= window.min
    const withinMax = window.max == null || level <= window.max
    return withinMin && withinMax
  })
  return match?.mode ?? "random"
}

export function getCancelGraceMs(): number {
  return config.rallyPoint.cancelGraceMs
}

export function getServerSpeed(): number {
  return config.travel.serverSpeed
}

export function getRaidLethalityFactor(): number {
  return config.siege.raidLethalityFactor
}

export function getWallConfig(wallType: string) {
  return config.walls[wallType]
}

export function getRallyPointConfig(): RallyPointConfigFile {
  return config
}

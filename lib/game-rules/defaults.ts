import { getSubsystemEffectsConfig } from "@/lib/config/subsystem-effects"
import type { NightPolicyConfig, ResourceBand, ScoutingConfig, TroopBand } from "./types"

const SUBSYSTEM_EFFECTS = getSubsystemEffectsConfig()
const TRAPPER_CONFIG = SUBSYSTEM_EFFECTS.trapper
const TRAP_CAPACITY_PER_LEVEL = Math.max(1, TRAPPER_CONFIG.capacity_per_level)
const TRAP_LIGHT_MAX = TRAP_CAPACITY_PER_LEVEL
const TRAP_MODERATE_MAX = TRAP_CAPACITY_PER_LEVEL * 3
const TRAP_FULL_MIN = TRAP_MODERATE_MAX + 1

const RESOURCE_BANDS: ResourceBand[] = [
  { label: "0-10%", minPct: 0, maxPct: 0.1 },
  { label: "10-25%", minPct: 0.1, maxPct: 0.25 },
  { label: "25-50%", minPct: 0.25, maxPct: 0.5 },
  { label: "50-75%", minPct: 0.5, maxPct: 0.75 },
  { label: "75-100%", minPct: 0.75, maxPct: 1 },
  { label: "Full", minPct: 1, maxPct: null },
]

const TROOP_BANDS: TroopBand[] = [
  { label: "token", min: 1, max: 10 },
  { label: "scattered", min: 11, max: 50 },
  { label: "small", min: 51, max: 200 },
  { label: "medium", min: 201, max: 800 },
  { label: "large", min: 801, max: 2000 },
  { label: "massive", min: 2001, max: null },
]

const TRAP_BANDS: TroopBand[] = [
  { label: "empty", min: 0, max: 0 },
  { label: "light", min: 1, max: TRAP_LIGHT_MAX },
  { label: "moderate", min: TRAP_LIGHT_MAX + 1, max: TRAP_MODERATE_MAX },
  { label: "full", min: TRAP_FULL_MIN, max: null },
]

export const DEFAULT_SCOUTING_CONFIG: ScoutingConfig = {
  thresholds: {
    failure: 0.5,
    partialLow: 0.85,
    partialHigh: 1.15,
  },
  randomness: {
    boundPct: 0.05,
  },
  tierThresholds: [
    { id: "tier_a", label: "Presence & Economy", ratioMin: 0.55, description: "Occupancy, storage, resource stocks." },
    { id: "tier_b", label: "Defenses & Installations", ratioMin: 0.75, description: "Walls, cranny, watchtower, traps." },
    { id: "tier_c", label: "Garrison Forces", ratioMin: 0.95, description: "Troops by class/unit and hero presence." },
    { id: "tier_d", label: "Reinforcements & Oases", ratioMin: 1.05, description: "Reinforcement owners, oasis garrisons." },
    { id: "tier_e", label: "Infrastructure Snapshot", ratioMin: 1.25, description: "Military building levels." },
  ],
  casualties: {
    failure: { attackerLossPct: 1, defenderLossPct: 0.15 },
    partialLow: { attackerLossPct: 0.6, defenderLossPct: 0.35 },
    partialHigh: { attackerLossPct: 0.4, defenderLossPct: 0.5 },
    success: { attackerLossPct: 0.15, defenderLossPct: 0.65 },
  },
  partialFidelity: {
    resourceBands: RESOURCE_BANDS,
    troopBands: TROOP_BANDS,
    reinforcementBands: TROOP_BANDS,
    trapBands: TRAP_BANDS,
  },
  spam: {
    windowSeconds: 60,
    maxReportsPerWindow: 1,
    minScoutsPerReport: 1,
  },
  oasisIntelEnabled: false,
  tech: {
    smithyPctPerLevel: 0.03,
    heroVisionPct: 0.02,
    heroCounterPct: 0.02,
    watchtowerPctPerLevel: 0.04,
    heroItems: {
      spyglassPct: 0.1,
      darkCloakPct: 0.1,
    },
  },
}

export const DEFAULT_NIGHT_POLICY: NightPolicyConfig = {
  mode: "BONUS",
  defenseMultiplier: 1.25,
  timezone: "UTC",
  windows: [{ start: "00:00", end: "06:00", label: "default" }],
  trucePolicy: "BLOCK_SEND",
  scoutingModifiers: undefined,
}

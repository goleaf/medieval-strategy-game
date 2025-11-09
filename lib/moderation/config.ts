export const MULTI_ACCOUNT_CONFIG = {
  lookbackDays: 14,
  ipWeight: 0.6,
  deviceWeight: 0.8,
  resourceFlowWeight: 0.5,
  supportWeight: 0.4,
  loginPatternWeight: 0.3,
  // Heuristics
  minNetResourceRatio: 4, // 4:1 in one direction
  minTransfers: 3,
  minSupportArrivals: 3,
  minSimultaneousDays: 3,
  // Scores
  baseIpScore: 0.5,
  baseDeviceScore: 0.7,
  maxPairScore: 1.0,
  autoReportThreshold: 0.7, // Pair score threshold to generate a report
}

export const ENFORCEMENT_DEFAULTS = {
  warningMessage:
    "Multi-accounting suspicion detected. Please review the rules. If this is a false positive (e.g., shared household or cafe), submit an appeal via Settings → Support/Appeals.",
  attackRestrictionHours: 72,
  tradeRestrictionHours: 72,
  suspensionDays: 7,
}

export type ActionKind = "ATTACK" | "TRADE" | "LOGIN"

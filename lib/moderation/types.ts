export type LinkEvidence = {
  type: "IP" | "DEVICE" | "RESOURCE_FLOW" | "SUPPORT" | "LOGIN_PATTERN" | "BEHAVIOR"
  score: number
  evidence?: Record<string, unknown>
}

export type SuspiciousPair = {
  userIdA: string
  userIdB: string
  weight: number
  evidences: LinkEvidence[]
}

export type MultiAccountReport = {
  generatedAt: string
  lookbackDays: number
  pairs: SuspiciousPair[]
  userScores: Record<string, number>
}

export type EnforcementRequest = {
  action:
    | "WARNING"
    | "ATTACK_RESTRICT"
    | "TRADE_RESTRICT"
    | "POINT_RESET"
    | "SUSPEND"
    | "BAN"
    | "IP_BAN"
  reason: string
  playerIds?: string[]
  userIds?: string[]
  ipAddresses?: string[]
  durationHours?: number
}

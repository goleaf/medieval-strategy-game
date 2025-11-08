/**
 * Canonical Tribal Wars world presets captured as TypeScript data so the admin UI
 * and automation scripts can surface the same switches that live-ops uses in runbooks.
 * The values mirror the in-depth guide in docs/admin/tribal-wars-world-types.md.
 */

/**
 * Enumerates the supported Tribal Wars world presets so that UI components and
 * future server logic can address each preset in a type-safe way.
 */
export type TribalWarsPresetId =
  | "standard"
  | "speedRound"
  | "highPerformance"
  | "classic"
  | "casual"

/**
 * High-level summary metadata for a world preset. This is surfaced in cards so
 * producers can quickly confirm they picked the correct template.
 */
export interface TribalWarsPresetSummary {
  id: TribalWarsPresetId
  name: string
  headline: string
  description: string
  recommendedFor: string
  tempo: string
  highlights: string[]
  victory: string
}

/**
 * Single switchboard row that captures how each preset toggles a given system.
 * Values are stringified because some rows capture ranges, optional behaviour,
 * or textual notes (e.g., "event-defined").
 */
export interface TribalWarsSwitchboardRow {
  key: string
  label: string
  notes: string
  values: Record<TribalWarsPresetId, string>
}

/**
 * Authoritative preset metadata pulled directly from the documentation so that
 * the UI can render rich summaries for each world type.
 */
export const TRIBAL_WARS_WORLD_PRESETS: Record<TribalWarsPresetId, TribalWarsPresetSummary> = {
  standard: {
    id: "standard",
    name: "Standard",
    headline: "Persistent worlds",
    description:
      "Default long-form servers that focus on conquest, diplomacy, and steady tribe growth.",
    recommendedFor: "Seasonal launches where players expect classic Tribal Wars pacing.",
    tempo: "Mid-tempo macro with slightly slower troop travel.",
    highlights: [
      "Balanced safety nets with morale and night bonus windows",
      "Scavenging, hauls, and flags enabled for flexible economies",
      "Coin-based nobles with loyalty tuned to 20–35 per hit"
    ],
    victory: "Domination thresholds or Runes/Relics control, depending on region."
  },
  speedRound: {
    id: "speedRound",
    name: "Speed Round",
    headline: "Ultra-fast resets",
    description:
      "Short competitive rounds that reset entirely between sessions with extreme acceleration.",
    recommendedFor: "Weekend tournaments and flash events where timing mastery decides outcomes.",
    tempo: "Everything scales into the tens or hundreds, compressing campaigns into hours or days.",
    highlights: [
      "Round-specific goals and bespoke fair-play enforcement",
      "Milliseconds matter—noble trains and backtimes resolve fights",
      "Scavenging and hauls stay on to keep raids worthwhile despite fast ticks"
    ],
    victory: "Round-defined score races, capture goals, or bespoke event win conditions."
  },
  highPerformance: {
    id: "highPerformance",
    name: "High Performance",
    headline: "Tournament ladder",
    description:
      "Long-form competitive worlds with strict rules and punishing speeds for elite teams.",
    recommendedFor: "Esports brackets and invite-only ladders that want unforgiving metas.",
    tempo: "High macro speed but very slow unit travel, demanding coordinated stacking.",
    highlights: [
      "Morale, night bonus, watchtower, and church disabled for pure skill checks",
      "Militia, scavenging, and hauls stay online to reward organisation",
      "Tiny tribe caps with roster lock after roughly 30 days"
    ],
    victory: "Stronghold influence race via district control."
  },
  classic: {
    id: "classic",
    name: "Classic",
    headline: "Throwback rules",
    description:
      "Retro configurations that mimic early-era Tribal Wars with minimal safety features.",
    recommendedFor: "Players chasing pre-modern deception metas with deep fake play.",
    tempo: "Fast account growth but deliberately slow marches to elevate timing mind games.",
    highlights: [
      "No morale, night bonus, watchtower, or church",
      "Paladin, archers, and scavenging disabled to match legacy rosters",
      "Resource-based nobles with escalating cost and millisecond faking everywhere"
    ],
    victory: "Fixed-duration domination checks (e.g., hold ≥55% after ~60 days)."
  },
  casual: {
    id: "casual",
    name: "Casual",
    headline: "Safety-first",
    description:
      "Relaxed long-term worlds that maximise protections for experimental or recovering players.",
    recommendedFor: "Onboarding cohorts, returning players, and communities that prefer low-pressure play.",
    tempo: "Standard macro cadence but layered with heavy protection and helper systems.",
    highlights: [
      "Attack-block ratio and customisable night bonus with morale",
      "Church, watchtower, archers, paladin, and scavenging all active",
      "Generous barbarian spawns with bonus villages to keep maps thriving"
    ],
    victory: "Attack blocks relax into a domination requirement once worlds mature."
  }
}

/**
 * Switchboard rows align with the one-pager checklist so the admin UI can
 * visualise differences between presets without copying tables manually.
 */
export const TRIBAL_WARS_SWITCHBOARD: TribalWarsSwitchboardRow[] = [
  {
    key: "worldSpeed",
    label: "World Speed",
    notes: "Controls construction, recruitment, research, and loyalty timers.",
    values: {
      standard: "1.0–1.5×",
      speedRound: "10×–400×",
      highPerformance: "6×",
      classic: "3.0–3.5×",
      casual: "1.0×"
    }
  },
  {
    key: "unitSpeed",
    label: "Unit Speed",
    notes: "Lower multipliers slow marches, changing how stacking and snipes work.",
    values: {
      standard: "0.7–1.0×",
      speedRound: "10×–400×",
      highPerformance: "0.25–0.3×",
      classic: "0.3×",
      casual: "0.8–1.0×"
    }
  },
  {
    key: "productionFactor",
    label: "Production Factor",
    notes: "Applies to hourly resource ticks from villages and barbarians.",
    values: {
      standard: "1×",
      speedRound: "10×–400×",
      highPerformance: "6×",
      classic: "3×",
      casual: "1×"
    }
  },
  {
    key: "beginnerProtection",
    label: "Beginner Protection",
    notes: "Set alongside cancel windows so new villages have breathing room.",
    values: {
      standard: "≈7 days",
      speedRound: "0–24h",
      highPerformance: "~48h",
      classic: "Off",
      casual: "≈5 days"
    }
  },
  {
    key: "nightBonus",
    label: "Night Bonus",
    notes: "Use regional hours or player-picked windows depending on policy.",
    values: {
      standard: "Fixed/Player 8h",
      speedRound: "Off",
      highPerformance: "Off",
      classic: "Off",
      casual: "Player 8h +100%"
    }
  },
  {
    key: "morale",
    label: "Morale",
    notes: "Protects smaller accounts early unless the preset requires pure ladders.",
    values: {
      standard: "Points + time",
      speedRound: "Off",
      highPerformance: "Off",
      classic: "Off",
      casual: "Points-based"
    }
  },
  {
    key: "fakeLimit",
    label: "Fake Limit",
    notes: "Controls minimum troop size for fakes to limit spam micro.",
    values: {
      standard: "1% of target",
      speedRound: "Event-defined",
      highPerformance: "Off",
      classic: "Off",
      casual: "1%"
    }
  },
  {
    key: "scavenging",
    label: "Scavenging",
    notes: "Pair with hauls; turning it off reduces passive income options.",
    values: {
      standard: "On",
      speedRound: "On",
      highPerformance: "On",
      classic: "Off",
      casual: "On"
    }
  },
  {
    key: "hauls",
    label: "Hauls",
    notes: "Standard carry rules stay consistent across presets.",
    values: {
      standard: "On",
      speedRound: "On",
      highPerformance: "On",
      classic: "On",
      casual: "On"
    }
  },
  {
    key: "flags",
    label: "Flags",
    notes: "Disable for hardcore metas where flag bonuses skew balance.",
    values: {
      standard: "On",
      speedRound: "Round choice",
      highPerformance: "Off",
      classic: "Off",
      casual: "On"
    }
  },
  {
    key: "archers",
    label: "Archers",
    notes: "Keep roster toggles aligned with chosen research system.",
    values: {
      standard: "On",
      speedRound: "Round-dependent",
      highPerformance: "Off",
      classic: "Off",
      casual: "On"
    }
  },
  {
    key: "paladin",
    label: "Paladin w/ Skills",
    notes: "Remove skills for hardcore ladders that want simpler rosters.",
    values: {
      standard: "On",
      speedRound: "Round-dependent",
      highPerformance: "Off",
      classic: "Off",
      casual: "On"
    }
  },
  {
    key: "watchtower",
    label: "Watchtower",
    notes: "Provide scouting intel for protection-heavy worlds only.",
    values: {
      standard: "Optional",
      speedRound: "Round-dependent",
      highPerformance: "Off",
      classic: "Off",
      casual: "On"
    }
  },
  {
    key: "church",
    label: "Church",
    notes: "Enable when you need slower expansion and defensive boosts.",
    values: {
      standard: "Optional",
      speedRound: "Round-dependent",
      highPerformance: "Off",
      classic: "Off",
      casual: "On"
    }
  },
  {
    key: "loyaltyDrop",
    label: "Loyalty Drop",
    notes: "Align with noble coin costs so conquest pacing feels fair.",
    values: {
      standard: "20–35",
      speedRound: "Accelerated",
      highPerformance: "20–35",
      classic: "20–35",
      casual: "20–35"
    }
  },
  {
    key: "loyaltyRegen",
    label: "Loyalty Regen (/h)",
    notes: "Multiply by world speed for accurate loyalty recovery.",
    values: {
      standard: "1–1.5",
      speedRound: "Fast (10×–400×)",
      highPerformance: "6",
      classic: "3",
      casual: "1"
    }
  },
  {
    key: "nobleRange",
    label: "Noble Range",
    notes: "Cap noble hops to keep wars regional and manageable.",
    values: {
      standard: "60–100 fields",
      speedRound: "Event-defined",
      highPerformance: "50 fields",
      classic: "100 fields",
      casual: "100 fields"
    }
  },
  {
    key: "tribeCap",
    label: "Tribe Cap",
    notes: "Remember to disable outside support when capping tribes.",
    values: {
      standard: "20–25",
      speedRound: "Event-defined",
      highPerformance: "8",
      classic: "~14",
      casual: "~20"
    }
  },
  {
    key: "offTribeSupport",
    label: "Off-Tribe Support",
    notes: "Withdraw reinforcements automatically on tribe change.",
    values: {
      standard: "Disabled",
      speedRound: "Event-defined",
      highPerformance: "Disabled",
      classic: "Disabled",
      casual: "Disabled"
    }
  },
  {
    key: "attackBlock",
    label: "Attack Block Ratio",
    notes: "Casual worlds gate attacks by points to prevent bullying.",
    values: {
      standard: "Off",
      speedRound: "Off",
      highPerformance: "Off",
      classic: "Off",
      casual: "≈20%"
    }
  },
  {
    key: "winCondition",
    label: "Win Condition",
    notes: "Document percentages/durations inside launch briefs.",
    values: {
      standard: "Domination or Runes",
      speedRound: "Round goal",
      highPerformance: "Stronghold",
      classic: "Fast Domination",
      casual: "Domination after relax"
    }
  }
]

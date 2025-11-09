export const NOTIFICATION_PRIORITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const
export type NotificationPriority = (typeof NOTIFICATION_PRIORITY_ORDER)[number]

export const NOTIFICATION_SOUND_PRESETS = ["siren", "war-horn", "drumline", "ping", "chime", "mute"] as const
export type NotificationSoundPreset = (typeof NOTIFICATION_SOUND_PRESETS)[number]

export const NOTIFICATION_TYPE_IDS = [
  "NOBLE_ATTACK_INCOMING",
  "LOYALTY_LOW",
  "VILLAGE_CONQUEST",
  "TRIBE_WAR_DECLARED",
  "ATTACK_INCOMING",
  "TRIBE_SUPPORT_REQUEST",
  "EXPENSIVE_BUILDING_COMPLETE",
  "NOBLE_TRAINING_COMPLETE",
  "TROOP_TRAINING_COMPLETE",
  "RESOURCE_STORAGE_NEARLY_FULL",
  "TRADE_CONVOY_ARRIVING",
  "ATTACK_REPORT_READY",
  "TRIBE_LEADERSHIP_MESSAGE",
  "TROOPS_RETURNING",
  "SMALL_TRADE_COMPLETE",
  "MINOR_BUILDING_COMPLETE",
  "GAME_UPDATE",
  "RESEARCH_COMPLETED",
  "SMITHY_UPGRADE_COMPLETED",
] as const
export type PlayerNotificationType = (typeof NOTIFICATION_TYPE_IDS)[number]

export type NotificationChannelDefaults = {
  popup: boolean
  sound: boolean
  desktop: boolean
  push: boolean
  email: "none" | "critical" | "digest"
  autoDismiss?: number
}

export type NotificationTypeConfig = {
  id: PlayerNotificationType
  label: string
  description: string
  priority: NotificationPriority
  accent: string
  badgeClass: string
  highlightClass: string
  icon: string
  recommendedAction: string
  defaultSound: NotificationSoundPreset
  persistUntilAck?: boolean
  defaultChannels: NotificationChannelDefaults
}

export const PRIORITY_BEHAVIOUR: Record<
  NotificationPriority,
  { label: string; summary: string; accent: string; badgeClass: string }
> = {
  CRITICAL: {
    label: "Critical / Red Alert",
    summary: "Immediate popup, loud siren, push + desktop notifications, cannot be dismissed without acknowledgement.",
    accent: "border-red-600 text-red-700 bg-red-50",
    badgeClass: "bg-red-600 text-white",
  },
  HIGH: {
    label: "High / Orange Alert",
    summary: "Prominent UI banner and optional audio. Remains until acknowledged.",
    accent: "border-orange-500 text-orange-700 bg-orange-50",
    badgeClass: "bg-orange-500 text-white",
  },
  MEDIUM: {
    label: "Medium / Yellow",
    summary: "Counts toward unread badge. Cleared when panel is opened.",
    accent: "border-amber-400 text-amber-700 bg-amber-50",
    badgeClass: "bg-amber-400 text-neutral-900",
  },
  LOW: {
    label: "Low / Informational",
    summary: "Subtle toast-style notification that auto-dismisses.",
    accent: "border-sky-400 text-sky-700 bg-sky-50",
    badgeClass: "bg-sky-400 text-neutral-900",
  },
}

export const NOTIFICATION_TYPE_CONFIG: Record<PlayerNotificationType, NotificationTypeConfig> = {
  NOBLE_ATTACK_INCOMING: {
    id: "NOBLE_ATTACK_INCOMING",
    label: "Incoming Noble Attack",
    description: "A conquering noble wave is locked on one of your villages.",
    priority: "CRITICAL",
    accent: "border-red-600",
    badgeClass: "bg-red-600 text-white",
    highlightClass: "bg-red-50",
    icon: "ShieldAlert",
    recommendedAction: "Open rally point immediately, ping tribe defenders, trigger watchtower alarms.",
    defaultSound: "siren",
    persistUntilAck: true,
    defaultChannels: { popup: true, sound: true, desktop: true, push: true, email: "critical", autoDismiss: undefined },
  },
  LOYALTY_LOW: {
    id: "LOYALTY_LOW",
    label: "Village Loyalty Under 50%",
    description: "A village loyalty threshold has been crossed and is vulnerable to capture.",
    priority: "CRITICAL",
    accent: "border-red-500",
    badgeClass: "bg-red-500 text-white",
    highlightClass: "bg-red-50",
    icon: "Activity",
    recommendedAction: "Stabilize loyalty via celebrations or defend against nobles.",
    defaultSound: "war-horn",
    persistUntilAck: true,
    defaultChannels: { popup: true, sound: true, desktop: true, push: true, email: "critical" },
  },
  VILLAGE_CONQUEST: {
    id: "VILLAGE_CONQUEST",
    label: "Village Being Conquered",
    description: "Loyalty reached zero; ownership transfer is underway.",
    priority: "CRITICAL",
    accent: "border-red-500",
    badgeClass: "bg-red-500 text-white",
    highlightClass: "bg-red-50",
    icon: "Castle",
    recommendedAction: "Dispatch counter-nobles or recall support immediately.",
    defaultSound: "siren",
    persistUntilAck: true,
    defaultChannels: { popup: true, sound: true, desktop: true, push: true, email: "critical" },
  },
  TRIBE_WAR_DECLARED: {
    id: "TRIBE_WAR_DECLARED",
    label: "Tribe War Declaration",
    description: "Your tribe entered a war; attacks bypass former diplomacy limits.",
    priority: "CRITICAL",
    accent: "border-red-500",
    badgeClass: "bg-red-500 text-white",
    highlightClass: "bg-red-50",
    icon: "Sword",
    recommendedAction: "Coordinate war rooms and update defense plans.",
    defaultSound: "war-horn",
    persistUntilAck: true,
    defaultChannels: { popup: true, sound: true, desktop: true, push: true, email: "critical" },
  },
  ATTACK_INCOMING: {
    id: "ATTACK_INCOMING",
    label: "Incoming Attack",
    description: "Hostile troops are inbound to one of your villages.",
    priority: "HIGH",
    accent: "border-orange-500",
    badgeClass: "bg-orange-500 text-white",
    highlightClass: "bg-orange-50",
    icon: "AlarmClock",
    recommendedAction: "Check rally point, prepare dodges/support, optionally sound horn.",
    defaultSound: "drumline",
    persistUntilAck: true,
    defaultChannels: { popup: true, sound: true, desktop: true, push: true, email: "digest" },
  },
  TRIBE_SUPPORT_REQUEST: {
    id: "TRIBE_SUPPORT_REQUEST",
    label: "Tribe Support Request",
    description: "An allied player flagged a large support need.",
    priority: "HIGH",
    accent: "border-orange-500",
    badgeClass: "bg-orange-500 text-white",
    highlightClass: "bg-orange-50",
    icon: "Users",
    recommendedAction: "Send reinforcements or coordinate within tribe chat.",
    defaultSound: "drumline",
    persistUntilAck: true,
    defaultChannels: { popup: true, sound: false, desktop: true, push: true, email: "digest" },
  },
  EXPENSIVE_BUILDING_COMPLETE: {
    id: "EXPENSIVE_BUILDING_COMPLETE",
    label: "High-Tier Building Complete",
    description: "An expensive construction finished and is ready for use.",
    priority: "HIGH",
    accent: "border-orange-400",
    badgeClass: "bg-orange-400 text-neutral-900",
    highlightClass: "bg-orange-50",
    icon: "Warehouse",
    recommendedAction: "Queue next upgrades or configure the new structure.",
    defaultSound: "drumline",
    persistUntilAck: true,
    defaultChannels: { popup: true, sound: false, desktop: true, push: false, email: "digest" },
  },
  NOBLE_TRAINING_COMPLETE: {
    id: "NOBLE_TRAINING_COMPLETE",
    label: "Nobleman Ready",
    description: "A noble training queue finished.",
    priority: "HIGH",
    accent: "border-orange-400",
    badgeClass: "bg-orange-400 text-neutral-900",
    highlightClass: "bg-orange-50",
    icon: "Crown",
    recommendedAction: "Move noble to staging village or launch planned train.",
    defaultSound: "drumline",
    persistUntilAck: true,
    defaultChannels: { popup: true, sound: false, desktop: true, push: true, email: "digest" },
  },
  TROOP_TRAINING_COMPLETE: {
    id: "TROOP_TRAINING_COMPLETE",
    label: "Troop Queue Finished",
    description: "Barracks, stable, or workshop produced queued troops.",
    priority: "MEDIUM",
    accent: "border-amber-400",
    badgeClass: "bg-amber-400 text-neutral-900",
    highlightClass: "bg-amber-50",
    icon: "ShieldPlus",
    recommendedAction: "Queue additional troops or send them to the front.",
    defaultSound: "ping",
    defaultChannels: { popup: true, sound: false, desktop: false, push: false, email: "none" },
  },
  RESOURCE_STORAGE_NEARLY_FULL: {
    id: "RESOURCE_STORAGE_NEARLY_FULL",
    label: "Storage Almost Full",
    description: "Warehouse or granary is above the configured threshold.",
    priority: "MEDIUM",
    accent: "border-amber-400",
    badgeClass: "bg-amber-400 text-neutral-900",
    highlightClass: "bg-amber-50",
    icon: "Cylinder",
    recommendedAction: "Spend or ship excess resources to prevent overflow.",
    defaultSound: "ping",
    defaultChannels: { popup: true, sound: false, desktop: false, push: false, email: "none" },
  },
  TRADE_CONVOY_ARRIVING: {
    id: "TRADE_CONVOY_ARRIVING",
    label: "Trade Arriving",
    description: "Merchants are about to deliver resources.",
    priority: "MEDIUM",
    accent: "border-amber-400",
    badgeClass: "bg-amber-400 text-neutral-900",
    highlightClass: "bg-amber-50",
    icon: "Truck",
    recommendedAction: "Review trade or schedule next shipment.",
    defaultSound: "ping",
    defaultChannels: { popup: true, sound: false, desktop: false, push: false, email: "none" },
  },
  ATTACK_REPORT_READY: {
    id: "ATTACK_REPORT_READY",
    label: "Attack Report",
    description: "A combat report is ready to review.",
    priority: "MEDIUM",
    accent: "border-amber-400",
    badgeClass: "bg-amber-400 text-neutral-900",
    highlightClass: "bg-amber-50",
    icon: "ClipboardList",
    recommendedAction: "Open the report to react to scouting intel.",
    defaultSound: "ping",
    defaultChannels: { popup: true, sound: false, desktop: false, push: false, email: "digest" },
  },
  TRIBE_LEADERSHIP_MESSAGE: {
    id: "TRIBE_LEADERSHIP_MESSAGE",
    label: "Tribe Leadership Message",
    description: "High-importance message from tribe leadership.",
    priority: "MEDIUM",
    accent: "border-amber-400",
    badgeClass: "bg-amber-400 text-neutral-900",
    highlightClass: "bg-amber-50",
    icon: "Megaphone",
    recommendedAction: "View leadership instructions.",
    defaultSound: "ping",
    defaultChannels: { popup: true, sound: false, desktop: true, push: true, email: "digest" },
  },
  TROOPS_RETURNING: {
    id: "TROOPS_RETURNING",
    label: "Troops Returning",
    description: "A movement completed and troops are back home.",
    priority: "LOW",
    accent: "border-sky-400",
    badgeClass: "bg-sky-400 text-neutral-900",
    highlightClass: "bg-sky-50",
    icon: "Undo2",
    recommendedAction: "Queue next task or redeploy units.",
    defaultSound: "chime",
    defaultChannels: { popup: false, sound: false, desktop: false, push: false, email: "none", autoDismiss: 8000 },
  },
  SMALL_TRADE_COMPLETE: {
    id: "SMALL_TRADE_COMPLETE",
    label: "Trade Complete",
    description: "A small trade finalized successfully.",
    priority: "LOW",
    accent: "border-sky-400",
    badgeClass: "bg-sky-400 text-neutral-900",
    highlightClass: "bg-sky-50",
    icon: "Coins",
    recommendedAction: "Inspect market log or schedule next trade.",
    defaultSound: "chime",
    defaultChannels: { popup: false, sound: false, desktop: false, push: false, email: "none", autoDismiss: 6000 },
  },
  MINOR_BUILDING_COMPLETE: {
    id: "MINOR_BUILDING_COMPLETE",
    label: "Building Complete",
    description: "A low-cost construction finished.",
    priority: "LOW",
    accent: "border-sky-400",
    badgeClass: "bg-sky-400 text-neutral-900",
    highlightClass: "bg-sky-50",
    icon: "Hammer",
    recommendedAction: "Queue next level or move to higher priority builds.",
    defaultSound: "chime",
    defaultChannels: { popup: false, sound: false, desktop: false, push: false, email: "none", autoDismiss: 6000 },
  },
  GAME_UPDATE: {
    id: "GAME_UPDATE",
    label: "Game Update",
    description: "General game news, balance changes, or admin updates.",
    priority: "LOW",
    accent: "border-sky-400",
    badgeClass: "bg-sky-400 text-neutral-900",
    highlightClass: "bg-sky-50",
    icon: "BellRing",
    recommendedAction: "Review patch notes or admin posts.",
    defaultSound: "chime",
    defaultChannels: { popup: false, sound: false, desktop: false, push: false, email: "digest", autoDismiss: 6000 },
  },
  RESEARCH_COMPLETED: {
    id: "RESEARCH_COMPLETED",
    label: "Technology Researched",
    description: "A technology finished at your Academy.",
    priority: "LOW",
    accent: "border-sky-400",
    badgeClass: "bg-sky-400 text-neutral-900",
    highlightClass: "bg-sky-50",
    icon: "BookCheck",
    recommendedAction: "Review the tech tree and plan the next research.",
    defaultSound: "chime",
    defaultChannels: { popup: true, sound: false, desktop: false, push: false, email: "digest", autoDismiss: 6000 },
  },
  SMITHY_UPGRADE_COMPLETED: {
    id: "SMITHY_UPGRADE_COMPLETED",
    label: "Smithy Upgrade Complete",
    description: "A smithy upgrade reached a new level.",
    priority: "LOW",
    accent: "border-sky-400",
    badgeClass: "bg-sky-400 text-neutral-900",
    highlightClass: "bg-sky-50",
    icon: "Hammer",
    recommendedAction: "Queue the next upgrade or switch to other priorities.",
    defaultSound: "chime",
    defaultChannels: { popup: true, sound: false, desktop: false, push: false, email: "none", autoDismiss: 6000 },
  },
}

export type NotificationTypePreference = {
  enabled: boolean
  sound: NotificationSoundPreset
  channels: {
    popup?: boolean
    sound?: boolean
    desktop?: boolean
    push?: boolean
    email?: "none" | "critical" | "digest"
  }
}

export const DEFAULT_TYPE_SETTINGS: Record<PlayerNotificationType, NotificationTypePreference> = Object.fromEntries(
  Object.values(NOTIFICATION_TYPE_CONFIG).map((config) => [
    config.id,
    {
      enabled: true,
      sound: config.defaultSound,
      channels: {
        popup: config.defaultChannels.popup,
        sound: config.defaultChannels.sound,
        desktop: config.defaultChannels.desktop,
        push: config.defaultChannels.push,
        email: config.defaultChannels.email,
      },
    },
  ]),
) as Record<PlayerNotificationType, NotificationTypePreference>

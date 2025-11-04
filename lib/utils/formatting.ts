export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M"
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K"
  }
  return num.toString()
}

export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function getTroopEmoji(type: string): string {
  const emojiMap: Record<string, string> = {
    WARRIOR: "🗡️",
    SPEARMAN: "🔱",
    BOWMAN: "🏹",
    HORSEMAN: "🐴",
    PALADIN: "⚜️",
    EAGLE_KNIGHT: "🦅",
    RAM: "🪵",
    CATAPULT: "🎯",
    KNIGHT: "♞",
    NOBLEMAN: "👑",
  }
  return emojiMap[type] || "🗡️"
}

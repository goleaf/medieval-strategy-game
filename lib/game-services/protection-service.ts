import { prisma } from "@/lib/db"

export class ProtectionService {
  /**
   * Check if a player has beginner protection
   */
  static async isPlayerProtected(playerId: string): Promise<boolean> {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
    })

    if (!player || !player.beginnerProtectionUntil) {
      return false
    }

    return new Date() < player.beginnerProtectionUntil
  }

  /**
   * Check if a village is protected (via player protection)
   */
  static async isVillageProtected(villageId: string): Promise<boolean> {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: { player: true },
    })

    if (!village) return false

    return this.isPlayerProtected(village.playerId)
  }

  /**
   * Initialize beginner protection for a new player
   */
  static async initializeProtection(playerId: string): Promise<void> {
    const config = await prisma.worldConfig.findFirst()

    if (!config || !config.beginnerProtectionEnabled) {
      return
    }

    const protectionHours = config.beginnerProtectionHours || 72
    const protectionUntil = new Date()
    protectionUntil.setHours(protectionUntil.getHours() + protectionHours)

    await prisma.player.update({
      where: { id: playerId },
      data: { beginnerProtectionUntil: protectionUntil },
    })
  }

  /**
   * Check if it's currently night time (for night bonus)
   * Night is defined as 22:00 - 06:00 UTC
   */
  static isNightTime(): boolean {
    const now = new Date()
    const hour = now.getUTCHours()
    return hour >= 22 || hour < 6
  }

  /**
   * Get night bonus multiplier for defense
   */
  static async getNightBonusMultiplier(): Promise<number> {
    if (!this.isNightTime()) {
      return 1.0
    }

    const config = await prisma.worldConfig.findFirst()
    return config?.nightBonusMultiplier || 1.2
  }

  /**
   * Get protection time remaining for a player
   */
  static async getProtectionTimeRemaining(playerId: string): Promise<number | null> {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
    })

    if (!player || !player.beginnerProtectionUntil) {
      return null
    }

    const now = new Date()
    const protectionUntil = player.beginnerProtectionUntil

    if (now >= protectionUntil) {
      return 0
    }

    return Math.ceil((protectionUntil.getTime() - now.getTime()) / (1000 * 60 * 60)) // Hours remaining
  }
}


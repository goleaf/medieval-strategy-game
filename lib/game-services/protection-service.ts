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
   * Initialize beginner protection for a new player based on world speed
   */
  static async initializeProtection(playerId: string): Promise<void> {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { gameWorld: true },
    })

    if (!player?.gameWorld?.beginnerProtectionDays) {
      return
    }

    const worldSpeed = player.gameWorld.speed
    let protectionDays: number

    // Calculate protection duration based on world speed (from Travian specs)
    switch (worldSpeed) {
      case 1:
        protectionDays = 5
        break
      case 2:
      case 3:
        protectionDays = 3
        break
      case 5:
        protectionDays = 2
        break
      case 10:
        protectionDays = 1
        break
      default:
        protectionDays = 3 // Default fallback
    }

    const protectionUntil = new Date()
    protectionUntil.setDate(protectionUntil.getDate() + protectionDays)

    await prisma.player.update({
      where: { id: playerId },
      data: {
        beginnerProtectionUntil: protectionUntil,
        hasExtendedProtection: false, // Reset extension flag for new players
      },
    })
  }

  /**
   * Extend beginner protection (can only be done once)
   */
  static async extendProtection(playerId: string): Promise<boolean> {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { gameWorld: true },
    })

    if (!player || !player.beginnerProtectionUntil || player.hasExtendedProtection) {
      return false // Cannot extend if no protection or already extended
    }

    const worldSpeed = player.gameWorld?.speed || 1
    let extensionDays: number

    // Calculate extension duration based on world speed
    switch (worldSpeed) {
      case 1:
        extensionDays = 3
        break
      case 2:
      case 3:
        extensionDays = 3
        break
      case 5:
        extensionDays = 2
        break
      case 10:
        extensionDays = 1
        break
      default:
        extensionDays = 3
    }

    const newProtectionUntil = new Date(player.beginnerProtectionUntil)
    newProtectionUntil.setDate(newProtectionUntil.getDate() + extensionDays)

    await prisma.player.update({
      where: { id: playerId },
      data: {
        beginnerProtectionUntil: newProtectionUntil,
        hasExtendedProtection: true,
      },
    })

    return true
  }

  /**
   * Check if a player can extend their protection
   */
  static async canExtendProtection(playerId: string): Promise<boolean> {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
    })

    return !!(player?.beginnerProtectionUntil && !player.hasExtendedProtection)
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


import { prisma } from "@/lib/db"
import { NightPolicyService } from "./night-policy-service"
import { WorldSettingsService } from "@/lib/game-services/world-settings-service"
import type { GameWorld } from "@prisma/client"

export class ProtectionService {
  /**
   * Check if a player has beginner protection
   */
  static async isPlayerProtected(playerId: string): Promise<boolean> {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: {
        id: true,
        totalPoints: true,
        beginnerProtectionUntil: true,
        gameWorld: {
          select: { id: true, speed: true, worldType: true, settings: true },
        },
      },
    })

    if (!player) {
      return false
    }

    return this.playerHasProtection(player.beginnerProtectionUntil, player.totalPoints, player.gameWorld)
  }

  /**
   * Check if a village is protected (via player protection)
   */
  static async isVillageProtected(villageId: string): Promise<boolean> {
    const village = await prisma.village.findUnique({
      where: { id: villageId },
      include: {
        player: {
          select: {
            id: true,
            totalPoints: true,
            beginnerProtectionUntil: true,
            gameWorld: {
              select: { id: true, speed: true, worldType: true, settings: true },
            },
          },
        },
      },
    })

    if (!village?.player) return false
    return this.playerHasProtection(
      village.player.beginnerProtectionUntil,
      village.player.totalPoints,
      village.player.gameWorld,
    )
  }

  /**
   * Initialize beginner protection for a new player based on world speed
   */
  static async initializeProtection(playerId: string): Promise<void> {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { gameWorld: true },
    })

    if (!player?.gameWorld) {
      return
    }

    const worldSettings = WorldSettingsService.derive(player.gameWorld)
    const protectionHours = worldSettings.beginnerProtection.hours
    const protectionUntil = new Date(Date.now() + protectionHours * 60 * 60 * 1000)

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

    const worldSettings = WorldSettingsService.derive(player.gameWorld)
    const threshold = worldSettings.beginnerProtection.pointThreshold
    if (threshold !== undefined && player.totalPoints >= threshold) {
      return false // Cannot extend if no protection or already extended
    }

    const extensionHours = Math.max(12, Math.round(worldSettings.beginnerProtection.hours / 2))
    const newProtectionUntil = new Date(player.beginnerProtectionUntil)
    newProtectionUntil.setTime(newProtectionUntil.getTime() + extensionHours * 60 * 60 * 1000)

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
   * Get night bonus multiplier for defense
   */
  static async getNightBonusMultiplier(at: Date = new Date()): Promise<number> {
    const state = await NightPolicyService.evaluate(at)
    if (state.mode !== "BONUS" || !state.active) {
      return 1.0
    }
    return state.defenseMultiplier
  }

  /**
   * Get protection time remaining for a player
   */
  static async getProtectionTimeRemaining(playerId: string): Promise<number | null> {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      select: {
        beginnerProtectionUntil: true,
      },
    })

    if (!player?.beginnerProtectionUntil) {
      return null
    }

    const now = new Date()
    const protectionUntil = player.beginnerProtectionUntil

    if (now >= protectionUntil) {
      return 0
    }

    return Math.ceil((protectionUntil.getTime() - now.getTime()) / (1000 * 60 * 60)) // Hours remaining
  }

  private static playerHasProtection(
    beginnerProtectionUntil: Date | null,
    totalPoints: number,
    gameWorld: GameWorld | null,
  ): boolean {
    if (!beginnerProtectionUntil) {
      return false
    }
    const worldSettings = WorldSettingsService.derive(gameWorld ?? undefined)
    const threshold = worldSettings.beginnerProtection.pointThreshold
    if (threshold !== undefined && totalPoints >= threshold) {
      return false
    }
    return new Date() < beginnerProtectionUntil
  }
}

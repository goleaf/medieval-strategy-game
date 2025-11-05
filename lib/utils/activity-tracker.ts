import { SitterDualService } from "@/lib/game-services/sitter-dual-service"

/**
 * Utility for tracking player activity across the application
 */
export class ActivityTracker {
  /**
   * Record owner activity for a player
   * Should be called whenever a player performs a game action
   */
  static async recordOwnerActivity(playerId: string): Promise<void> {
    try {
      await SitterDualService.recordOwnerActivity(playerId)
    } catch (error) {
      // Don't fail the main operation if activity tracking fails
      console.error("Failed to record owner activity:", error)
    }
  }

  /**
   * Record general player activity (updates lastActiveAt)
   * Should be called on page loads or API calls to track general activity
   */
  static async recordPlayerActivity(playerId: string): Promise<void> {
    try {
      // Update lastActiveAt for general activity tracking
      const { prisma } = await import("@/lib/db")
      await prisma.player.update({
        where: { id: playerId },
        data: { lastActiveAt: new Date() }
      })

      // Also record owner activity for sitter/dual system
      await this.recordOwnerActivity(playerId)
    } catch (error) {
      console.error("Failed to record player activity:", error)
    }
  }
}


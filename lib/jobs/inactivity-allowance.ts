import { SitterDualService } from "@/lib/game-services/sitter-dual-service"

/**
 * Daily job to update inactivity allowance for all players
 * Runs once per day to calculate and update inactivity allowance based on
 * owner and sitter activity patterns
 */
export async function updateInactivityAllowance() {
  console.log("Updating inactivity allowance for all players...")

  try {
    await SitterDualService.updateInactivityAllowance()
    console.log("Inactivity allowance update completed successfully")
  } catch (error) {
    console.error("Error updating inactivity allowance:", error)
    throw error
  }
}

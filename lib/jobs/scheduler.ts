import { processGameTick, spawnBarbainians } from "./game-tick"
import { updateInactivityAllowance } from "./inactivity-allowance"

let gameTickInterval: NodeJS.Timeout | null = null
let barbarianSpawnInterval: NodeJS.Timeout | null = null
let inactivityAllowanceInterval: NodeJS.Timeout | null = null

/**
 * Start the game scheduler
 */
export async function startScheduler() {
  console.log("[v0] Starting game scheduler...")

  // Get tick interval from config (default 5 minutes)
  const { prisma } = await import("@/lib/db")
  const config = await prisma.worldConfig.findFirst()
  const tickIntervalMinutes = config?.tickIntervalMinutes || 5
  const tickIntervalMs = tickIntervalMinutes * 60 * 1000

  // Run game tick at configured interval
  gameTickInterval = setInterval(() => {
    processGameTick().catch((error) => {
      console.error("[v0] Game tick error:", error)
    })
  }, tickIntervalMs)

  // Spawn barbarians every 5 minutes
  barbarianSpawnInterval = setInterval(
    () => {
      spawnBarbainians().catch((error) => {
        console.error("[v0] Barbarian spawn error:", error)
      })
    },
    5 * 60 * 1000,
  ) // 5 minutes

  // Update inactivity allowance daily
  inactivityAllowanceInterval = setInterval(
    () => {
      updateInactivityAllowance().catch((error) => {
        console.error("[v0] Inactivity allowance update error:", error)
      })
    },
    24 * 60 * 60 * 1000,
  ) // 24 hours

  // Run once immediately
  processGameTick().catch(console.error)

  console.log(`[v0] Game scheduler started (tick interval: ${tickIntervalMinutes} minutes)`)
}

/**
 * Stop the game scheduler
 */
export function stopScheduler() {
  if (gameTickInterval) clearInterval(gameTickInterval)
  if (barbarianSpawnInterval) clearInterval(barbarianSpawnInterval)
  if (inactivityAllowanceInterval) clearInterval(inactivityAllowanceInterval)
  console.log("[v0] Game scheduler stopped")
}

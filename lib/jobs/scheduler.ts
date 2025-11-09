import { randomUUID } from "crypto"
import { bootstrapTickEvents, processGameTick, spawnBarbainians } from "./game-tick"
import { updateInactivityAllowance } from "./inactivity-allowance"
import { runEmailNotificationTick } from "./email-notifications"

let realtimeTickHandle: NodeJS.Timeout | null = null
let barbarianSpawnInterval: NodeJS.Timeout | null = null
let inactivityAllowanceInterval: NodeJS.Timeout | null = null
let emailNotificationInterval: NodeJS.Timeout | null = null
let processorId = `tick-${process.pid}-${randomUUID()}`
let nextTickTarget = Date.now()
let schedulerRunning = false

const REALTIME_TICK_MS = 1000

/**
 * Start the game scheduler
 */
export async function startScheduler() {
  if (schedulerRunning) return
  console.log("Starting game scheduler...")

  const { prisma } = await import("@/lib/db")
  const config = await prisma.worldConfig.findFirst()
  const tickIntervalMinutes = config?.tickIntervalMinutes || 5

  schedulerRunning = true
  processorId = `tick-${process.pid}-${randomUUID()}`
  nextTickTarget = Date.now()

  await bootstrapTickEvents()

  const loop = async () => {
    if (!schedulerRunning) return
    const tickStart = Date.now()

    try {
      await processGameTick({ now: new Date(tickStart), processorId })
    } catch (error) {
      console.error("Game tick error:", error)
    }

    nextTickTarget += REALTIME_TICK_MS
    const now = Date.now()
    if (now - nextTickTarget > REALTIME_TICK_MS * 5) {
      // Skip ahead if we're falling behind badly
      nextTickTarget = now + REALTIME_TICK_MS
    }

    const delay = Math.max(0, nextTickTarget - now)
    realtimeTickHandle = setTimeout(loop, delay)
  }

  realtimeTickHandle = setTimeout(loop, REALTIME_TICK_MS)

  // Spawn barbarians every 5 minutes
  barbarianSpawnInterval = setInterval(
    () => {
      spawnBarbainians().catch((error) => {
        console.error("Barbarian spawn error:", error)
      })
    },
    5 * 60 * 1000,
  )

  // Update inactivity allowance daily
  inactivityAllowanceInterval = setInterval(
    () => {
      updateInactivityAllowance().catch((error) => {
        console.error("Inactivity allowance update error:", error)
      })
    },
    24 * 60 * 60 * 1000,
  )

  emailNotificationInterval = setInterval(
    () => {
      runEmailNotificationTick().catch((error) => {
        console.error("Email notification dispatch error:", error)
      })
    },
    60 * 1000,
  )

  // Run once immediately
  processGameTick({ processorId }).catch(console.error)
  runEmailNotificationTick().catch(console.error)

  console.log(`Game scheduler started (legacy tick interval config: ${tickIntervalMinutes} minutes, realtime 1s)`)
}

/**
 * Stop the game scheduler
 */
export function stopScheduler() {
  schedulerRunning = false
  if (realtimeTickHandle) clearTimeout(realtimeTickHandle)
  if (barbarianSpawnInterval) clearInterval(barbarianSpawnInterval)
  if (inactivityAllowanceInterval) clearInterval(inactivityAllowanceInterval)
  if (emailNotificationInterval) clearInterval(emailNotificationInterval)
  console.log("Game scheduler stopped")
}

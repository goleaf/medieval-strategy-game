import "dotenv/config"
import { ensureDemoEnvironment } from "../lib/setup/demo-data"

async function main() {
  console.log("[v0] Ensuring demo accounts exist...")
  await ensureDemoEnvironment()
  console.log("[v0] Admin credentials: admin@game.local / pass123")
  console.log("[v0] Demo credentials: demo@game.local / pass123")
}

main().catch((e) => {
  console.error("[v0] Error creating users:", e)
  process.exit(1)
})

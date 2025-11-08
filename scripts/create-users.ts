import "dotenv/config"
import { ensureDemoEnvironment } from "../lib/setup/demo-data"

async function main() {
  console.log("Ensuring demo accounts exist...")
  await ensureDemoEnvironment()
  console.log("Admin credentials: admin@game.local / pass123")
  console.log("Demo credentials: demo@game.local / pass123")
}

main().catch((e) => {
  console.error("Error creating users:", e)
  process.exit(1)
})

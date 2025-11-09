import { type NextRequest } from "next/server"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { prisma } from "@/lib/db"
import { getCacheMetrics } from "@/lib/cache"

export async function GET(req: NextRequest) {
  const auth = await authenticateRequest(req)
  if (!auth?.userId) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
  const admin = await prisma.admin.findUnique({ where: { userId: auth.userId } })
  if (!admin) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 })

  const metrics = getCacheMetrics()
  let backend: "redis" | "memory" = process.env.REDIS_URL ? "redis" : "memory"
  let redisOk: boolean | undefined = undefined
  if (backend === "redis") {
    try {
      // lazy load and ping
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Redis = require("ioredis")
      const client = new Redis(process.env.REDIS_URL)
      await client.ping()
      await client.quit()
      redisOk = true
    } catch {
      redisOk = false
      backend = "memory"
    }
  }

  return new Response(
    JSON.stringify({ success: true, data: { backend, metrics, redisOk } }),
    { status: 200, headers: { "Cache-Control": "no-store" } },
  )
}


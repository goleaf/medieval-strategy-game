import { NextRequest } from "next/server"

import { fetchCombatReportList } from "@/lib/reports/queries"
import { cache } from "@/lib/cache"
import { errorResponse, successResponse } from "@/lib/utils/api-response"
import { withMetrics } from "@/lib/utils/metrics"

const DIRECTIONS = new Set(["sent", "received"])
const MISSIONS = new Set(["attack", "raid", "reinforce", "siege", "return"])

export const GET = withMetrics("GET /api/reports", async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const playerId = searchParams.get("playerId")
  if (!playerId) {
    return errorResponse("playerId is required", 400)
  }

  const directionParam = searchParams.get("direction")
  const missionParam = searchParams.get("mission")
  const search = searchParams.get("search")?.toLowerCase().trim()

  const keyBase = [`pid:${playerId}`]
  const directionParam = searchParams.get("direction")
  const missionParam = searchParams.get("mission")
  const search = searchParams.get("search")?.toLowerCase().trim()

  keyBase.push(`dir:${directionParam ?? "all"}`)
  keyBase.push(`mis:${missionParam ?? "all"}`)
  keyBase.push(`q:${search ?? ""}`)

  let items = await cache.wrap(`reports:list:${keyBase.join('|')}`, 30, async () => fetchCombatReportList(playerId))

  if (directionParam && DIRECTIONS.has(directionParam)) {
    items = items.filter((item) => item.direction === directionParam)
  }

  if (missionParam && MISSIONS.has(missionParam)) {
    items = items.filter((item) => item.mission === missionParam)
  }

  if (search) {
    items = items.filter((item) => {
      const coordsA = item.attacker.x != null && item.attacker.y != null ? `(${item.attacker.x}|${item.attacker.y})` : ""
      const coordsD = item.defender.x != null && item.defender.y != null ? `(${item.defender.x}|${item.defender.y})` : ""
      const haystack = [
        item.subject,
        item.attacker.playerName,
        item.attacker.villageName,
        item.defender.playerName,
        item.defender.villageName,
        coordsA,
        coordsD,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(search)
    })
  }

  const etag = `W/"rl-${items.length}-${items[0]?.createdAt ?? "0"}"`
  const inm = req.headers.get('if-none-match')
  if (inm === etag) return new Response(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'public, max-age=30' } })
  return new Response(JSON.stringify({ success: true, data: items }), {
    status: 200,
    headers: { ETag: etag, 'Cache-Control': 'public, max-age=30' },
  })
})

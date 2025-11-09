import { NextRequest } from "next/server"
import { successResponse, errorResponse } from "@/lib/utils/api-response"
import { computePersonalStats } from "@/lib/stats/personal"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const playerId = url.searchParams.get("playerId")
  if (!playerId) return errorResponse("playerId is required", 400)
  const range = url.searchParams.get("range") ?? undefined
  const compare = url.searchParams.get("compare") === "true"
  const format = url.searchParams.get("format") ?? "json"

  const data = await computePersonalStats({ playerId, range, includeComparison: compare })

  if (format === "csv") {
    const rows: string[] = []
    rows.push("metric,value")
    rows.push(`totalPoints,${data.overview.totalPoints}`)
    rows.push(`rank,${data.overview.rank}`)
    rows.push(`villages,${data.overview.villagesOwned}`)
    rows.push(`od_total,${data.overview.od.attacking + data.overview.od.defending + data.overview.od.supporting}`)
    rows.push(`growth_per_day,${data.overview.growthRatePerDay}`)
    const body = rows.join("\n")
    return new Response(body, { headers: { "Content-Type": "text/csv" } })
  }

  return successResponse(data)
}


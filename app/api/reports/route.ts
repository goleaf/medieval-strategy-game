import { NextRequest } from "next/server"

import { fetchCombatReportList } from "@/lib/reports/queries"
import { errorResponse, successResponse } from "@/lib/utils/api-response"

const DIRECTIONS = new Set(["sent", "received"])
const MISSIONS = new Set(["attack", "raid", "reinforce", "siege", "return"])

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const playerId = searchParams.get("playerId")
  if (!playerId) {
    return errorResponse("playerId is required", 400)
  }

  const directionParam = searchParams.get("direction")
  const missionParam = searchParams.get("mission")
  const search = searchParams.get("search")?.toLowerCase().trim()

  let items = await fetchCombatReportList(playerId)

  if (directionParam && DIRECTIONS.has(directionParam)) {
    items = items.filter((item) => item.direction === directionParam)
  }

  if (missionParam && MISSIONS.has(missionParam)) {
    items = items.filter((item) => item.mission === missionParam)
  }

  if (search) {
    items = items.filter((item) => {
      const haystack = [
        item.subject,
        item.attacker.playerName,
        item.attacker.villageName,
        item.defender.playerName,
        item.defender.villageName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return haystack.includes(search)
    })
  }

  return successResponse(items)
}

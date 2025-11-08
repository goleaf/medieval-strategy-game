import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { claimQuestRewards } from "@/lib/game-services/task-service"

/**
 * POST /api/tasks/claim
 * Claim one or more quest rewards and deposit them into a village.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const rewardIds = Array.isArray(body?.rewardIds) ? body.rewardIds.filter((id) => typeof id === "string") : []
    const villageId = typeof body?.villageId === "string" ? body.villageId : null

    if (!rewardIds.length) {
      return NextResponse.json({ error: "No rewards specified" }, { status: 400 })
    }

    if (!villageId) {
      return NextResponse.json({ error: "Missing villageId" }, { status: 400 })
    }

    const result = await claimQuestRewards(session.user.id, rewardIds, villageId)

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Error claiming quest rewards:", error)
    return NextResponse.json({ error: "Failed to claim quest rewards" }, { status: 500 })
  }
}

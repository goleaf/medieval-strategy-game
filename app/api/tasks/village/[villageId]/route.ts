import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getQuestPaneState, syncQuestProgressForPlayer } from "@/lib/game-services/task-service"
import { prisma } from "@/lib/db"

/**
 * GET /api/tasks/village/[villageId]
 * Return reward entries scoped to a specific village for warehouse planning.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { villageId: string } },
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const villageId = params.villageId
    const village = await prisma.village.findFirst({
      where: { id: villageId, playerId: session.user.id },
    })

    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 })
    }

    const panes = await getQuestPaneState(session.user.id)
    const rewardPane = panes.find((pane) => pane.pane === "REWARDS")
    const rewards = (rewardPane?.rewards ?? []).filter((reward) => {
      if (!reward.metadata) return false
      try {
        const parsed = JSON.parse(reward.metadata) as Record<string, unknown>
        return parsed?.villageId === villageId
      } catch {
        return false
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        villageId,
        rewards,
      },
    })
  } catch (error) {
    console.error("Error fetching village rewards:", error)
    return NextResponse.json({
      error: "Failed to fetch village rewards",
    }, { status: 500 })
  }
}

/**
 * POST /api/tasks/village/[villageId]/update
 * Force a sync for quests relevant to the owning player.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { villageId: string } },
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const villageId = params.villageId
    const village = await prisma.village.findFirst({
      where: { id: villageId, playerId: session.user.id },
    })

    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 })
    }

    await syncQuestProgressForPlayer(session.user.id)
    const panes = await getQuestPaneState(session.user.id)

    return NextResponse.json({
      success: true,
      data: { panes },
    })
  } catch (error) {
    console.error("Error updating village quest state:", error)
    return NextResponse.json({
      error: "Failed to update village quest progress",
    }, { status: 500 })
  }
}

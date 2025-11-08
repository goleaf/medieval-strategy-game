import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getQuestPaneState, syncQuestProgressForPlayer } from "@/lib/game-services/task-service"

/**
 * GET /api/tasks
 * Return quest panes with progress, including the Rewards pane.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const eventKeys = searchParams.getAll("eventKey")
    const panes = await getQuestPaneState(session.user.id, {
      eventKeys: eventKeys.length ? eventKeys : undefined,
    })

    return NextResponse.json({
      success: true,
      data: { panes },
    })
  } catch (error) {
    console.error("Error fetching quests:", error)
    return NextResponse.json({
      error: "Failed to fetch quest panes",
    }, { status: 500 })
  }
}

/**
 * POST /api/tasks
 * Force a resync of quest progress and return refreshed panes.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const eventKeys = Array.isArray(body?.eventKeys) ? body.eventKeys : undefined

    await syncQuestProgressForPlayer(session.user.id, { eventKeys })
    const panes = await getQuestPaneState(session.user.id, { eventKeys })

    return NextResponse.json({
      success: true,
      data: { panes },
    })
  } catch (error) {
    console.error("Error refreshing quests:", error)
    return NextResponse.json({
      error: "Failed to refresh quest progress",
    }, { status: 500 })
  }
}

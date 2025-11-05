import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { SitterDualService } from "@/lib/game-services/sitter-dual-service"
import { authOptions } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { sitterId, ownerId, action } = body

    if (!sitterId || !ownerId || !action) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate action type
    const validActions = ['sendRaids', 'useResources', 'buyAndSpendGold']
    if (!validActions.includes(action)) {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 })
    }

    const hasPermission = await SitterDualService.validateSitterPermissions(
      sitterId,
      ownerId,
      action as 'sendRaids' | 'useResources' | 'buyAndSpendGold'
    )

    return NextResponse.json({
      success: true,
      data: { hasPermission }
    })
  } catch (error) {
    console.error("Error validating sitter permissions:", error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Internal server error"
    }, { status: 500 })
  }
}
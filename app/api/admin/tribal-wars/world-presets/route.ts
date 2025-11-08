import { NextRequest, NextResponse } from "next/server"
import { authenticateAdmin } from "../../middleware"
import {
  TRIBAL_WARS_SWITCHBOARD,
  TRIBAL_WARS_WORLD_PRESETS
} from "@/lib/config/tribal-wars-presets"

/**
 * Exposes the curated Tribal Wars presets so admin tooling can render the
 * switchboard UI without duplicating data in React components.
 */
export async function GET(req: NextRequest) {
  // Guard the endpoint with admin authentication to keep configuration details private.
  const adminAuth = await authenticateAdmin(req)

  if (!adminAuth) {
    return NextResponse.json(
      {
        success: false,
        error: "Admin authentication required"
      },
      { status: 401 }
    )
  }

  // Return both the preset summaries and the switchboard rows in a single payload
  // so the client can render cards and comparison tables without extra requests.
  return NextResponse.json({
    success: true,
    data: {
      presets: TRIBAL_WARS_WORLD_PRESETS,
      switchboard: TRIBAL_WARS_SWITCHBOARD
    }
  })
}

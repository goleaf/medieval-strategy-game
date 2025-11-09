import { NextRequest } from "next/server"

import { errorResponse, successResponse } from "@/lib/utils/api-response"
import { updateMetadata, moveToFolder } from "@/lib/reports/manage"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const playerId = body?.playerId as string | undefined
  if (!playerId) return errorResponse("playerId is required", 400)

  const action = body?.action as string | undefined
  const items = (body?.items as Array<{ kind: "MOVEMENT" | "SCOUT"; refId: string }>) ?? []
  if (!Array.isArray(items) || items.length === 0) return errorResponse("items are required", 400)

  if (action === "star" || action === "unstar" || action === "archive" || action === "unarchive" || action === "mark_read") {
    await updateMetadata({
      playerId,
      items,
      starred: action === "star" ? true : action === "unstar" ? false : undefined,
      archived: action === "archive" ? true : action === "unarchive" ? false : undefined,
      markRead: action === "mark_read",
    })
    return successResponse({ ok: true })
  }

  if (action === "move_to_folder") {
    const folderId = body?.folderId as string | undefined
    if (!folderId) return errorResponse("folderId is required", 400)
    await moveToFolder({ playerId, folderId, items })
    return successResponse({ ok: true })
  }

  return errorResponse("Unsupported action", 400)
}


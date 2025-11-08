import { NextRequest } from "next/server"

import { prisma } from "@/lib/db"
import { mapPrismaMovement } from "@/lib/rally-point/prisma-repository"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"
import type { MovementStatus, MovementMission } from "@/lib/rally-point"
import { Prisma, RallyPointMission, RallyPointMovementStatus } from "@prisma/client"

const statusMap: Partial<Record<MovementStatus, RallyPointMovementStatus>> = {
  en_route: RallyPointMovementStatus.EN_ROUTE,
  resolved: RallyPointMovementStatus.RESOLVED,
  returning: RallyPointMovementStatus.RETURNING,
  done: RallyPointMovementStatus.DONE,
  cancelled: RallyPointMovementStatus.CANCELLED,
  scheduled: RallyPointMovementStatus.SCHEDULED,
}

const missionMap: Partial<Record<MovementMission, RallyPointMission>> = {
  attack: RallyPointMission.ATTACK,
  raid: RallyPointMission.RAID,
  reinforce: RallyPointMission.REINFORCE,
  siege: RallyPointMission.SIEGE,
  return: RallyPointMission.RETURN,
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const villageId = searchParams.get("villageId")
    const direction = searchParams.get("direction") ?? "outgoing"
    const status = searchParams.get("status") as MovementStatus | null
    const mission = searchParams.get("mission") as MovementMission | null
    const limit = Number(searchParams.get("limit") ?? "50")

    if (!villageId) {
      return errorResponse("villageId is required", 400)
    }

    const where: Prisma.RallyPointMovementWhereInput = {}
    if (direction === "incoming") {
      where.toVillageId = villageId
    } else {
      where.fromVillageId = villageId
    }

    if (status && statusMap[status]) {
      where.status = statusMap[status]
    }

    if (mission && missionMap[mission]) {
      where.mission = missionMap[mission]
    }

    const movements = await prisma.rallyPointMovement.findMany({
      where,
      orderBy: [{ arriveAt: "asc" }],
      take: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 200) : 50,
    })

    return successResponse(movements.map(mapPrismaMovement))
  } catch (error) {
    return serverErrorResponse(error)
  }
}

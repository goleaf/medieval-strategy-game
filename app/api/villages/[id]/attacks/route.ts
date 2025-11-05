import { prisma } from "@/lib/db"
import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') // 'incoming' or 'outgoing'

    if (!type || !['incoming', 'outgoing'].includes(type)) {
      return errorResponse("Invalid type parameter. Must be 'incoming' or 'outgoing'", 400)
    }

    const now = new Date()

    let attacks
    if (type === 'incoming') {
      attacks = await prisma.attack.findMany({
        where: {
          toVillageId: id,
          status: { in: ['IN_PROGRESS', 'ARRIVED'] },
          arrivalAt: { gte: now },
        },
        include: {
          fromVillage: {
            select: { name: true, x: true, y: true }
          },
        },
        orderBy: { arrivalAt: 'asc' },
      })
    } else {
      attacks = await prisma.attack.findMany({
        where: {
          fromVillageId: id,
          status: { in: ['IN_PROGRESS', 'ARRIVED'] },
          arrivalAt: { gte: now },
        },
        include: {
          toVillage: {
            select: { name: true, x: true, y: true }
          },
        },
        orderBy: { arrivalAt: 'asc' },
      })
    }

    const formattedAttacks = attacks.map(attack => ({
      id: attack.id,
      fromVillageName: attack.fromVillage?.name || 'Unknown',
      toVillageName: attack.toVillage?.name || 'Unknown',
      arrivalAt: attack.arrivalAt.toISOString(),
      type: attack.type,
      status: attack.status,
    }))

    return successResponse(formattedAttacks)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

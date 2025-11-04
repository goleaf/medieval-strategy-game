import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import type { OrderType, Resource } from "@prisma/client"

export async function GET(req: NextRequest) {
  try {
    const resource = req.nextUrl.searchParams.get("resource") as Resource | null

    const where: any = { status: "OPEN" }
    if (resource) where.offeringResource = resource

    const orders = await prisma.marketOrder.findMany({
      where,
      include: { player: true, village: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    })

    return NextResponse.json(orders, { status: 200 })
  } catch (error) {
    console.error("[v0] Get market orders error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { villageId, playerId, type, offeringResource, offeringAmount, requestResource, requestAmount } =
      await req.json()

    if (!villageId || !type || !offeringResource || !requestResource) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const village = await prisma.village.findUnique({
      where: { id: villageId },
    })

    if (!village) {
      return NextResponse.json({ error: "Village not found" }, { status: 404 })
    }

    if (type === "SELL") {
      // Check if village has resources
      if (village[offeringResource.toLowerCase() as keyof typeof village] < offeringAmount) {
        return NextResponse.json({ error: "Insufficient resources" }, { status: 400 })
      }

      // Deduct resources
      await prisma.village.update({
        where: { id: villageId },
        data: {
          [offeringResource.toLowerCase()]: {
            decrement: offeringAmount,
          },
        },
      })
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    const order = await prisma.marketOrder.create({
      data: {
        villageId,
        playerId,
        type: type as OrderType,
        offeringResource,
        offeringAmount,
        requestResource,
        requestAmount,
        expiresAt,
      },
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error("[v0] Create market order error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

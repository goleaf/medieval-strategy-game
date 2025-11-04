import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const centerX = Number(req.nextUrl.searchParams.get("centerX")) || 50
    const centerY = Number(req.nextUrl.searchParams.get("centerY")) || 50
    const zoom = Number(req.nextUrl.searchParams.get("zoom")) || 1
    const viewSize = Math.floor(20 / zoom)

    const startX = Math.max(0, centerX - Math.floor(viewSize / 2))
    const startY = Math.max(0, centerY - Math.floor(viewSize / 2))
    const endX = Math.min(200, startX + viewSize)
    const endY = Math.min(200, startY + viewSize)

    const villages = await prisma.village.findMany({
      where: {
        x: { gte: startX, lte: endX },
        y: { gte: startY, lte: endY },
      },
      select: {
        id: true,
        x: true,
        y: true,
        name: true,
        player: { select: { playerName: true } },
      },
    })

    const mapTiles = []
    for (let y = startY; y < endY; y++) {
      for (let x = startX; x < endX; x++) {
        const village = villages.find((v) => v.x === x && v.y === y)
        mapTiles.push({
          x,
          y,
          type: village ? "village" : "empty",
          village: village || null,
        })
      }
    }

    return NextResponse.json({
      tiles: mapTiles,
      bounds: { startX, startY, endX, endY },
    })
  } catch (error) {
    console.error("[v0] Get map error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

import { prisma } from "@/lib/db"
import { type NextRequest, NextResponse } from "next/server"
import type { JoinPolicy } from "@prisma/client"

export async function POST(req: NextRequest) {
  try {
    const { name, tag, leaderId, description } = await req.json()

    if (!name || !tag || !leaderId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (tag.length > 4) {
      return NextResponse.json({ error: "Tag must be 4 characters or less" }, { status: 400 })
    }

    // Check if player already in tribe
    const player = await prisma.player.findUnique({
      where: { id: leaderId },
    })

    if (player?.tribeLeaderId || player?.tribeMembersId) {
      return NextResponse.json({ error: "Player already in a tribe" }, { status: 409 })
    }

    const tribe = await prisma.tribe.create({
      data: {
        name,
        tag: tag.toUpperCase(),
        leaderId,
        description,
        joinPolicy: "INVITE_ONLY" as JoinPolicy,
      },
    })

    // Add leader as member
    await prisma.player.update({
      where: { id: leaderId },
      data: { tribeId: tribe.id },
    })

    return NextResponse.json(tribe, { status: 201 })
  } catch (error: any) {
    console.error("[v0] Create tribe error:", error)
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const tribes = await prisma.tribe.findMany({
      include: {
        leader: true,
        _count: { select: { members: true } },
      },
      orderBy: { totalPoints: "desc" },
      take: 100,
    })

    return NextResponse.json(tribes, { status: 200 })
  } catch (error) {
    console.error("[v0] Get tribes error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

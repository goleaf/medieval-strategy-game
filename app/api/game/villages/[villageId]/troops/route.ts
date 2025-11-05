import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { villageId: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const villageId = params.villageId;

    // Get player
    const player = await prisma.player.findFirst({
      where: { userId: session.user.id },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Verify ownership
    const village = await prisma.village.findUnique({
      where: { id: villageId },
    });

    if (!village || village.playerId !== player.id) {
      return NextResponse.json({
        error: "Village not found or not owned by you"
      }, { status: 403 });
    }

    // Get troops
    const troops = await prisma.troop.findMany({
      where: { villageId },
      orderBy: { type: "asc" }
    });

    return NextResponse.json({
      success: true,
      troops
    });

  } catch (error) {
    console.error("Village troops fetch error:", error);
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { MovementService } from "@/lib/game-services/movement-service";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { fromVillageId, toVillageId, troops } = body;

    if (!fromVillageId || !toVillageId || !troops) {
      return NextResponse.json({
        error: "Missing required fields: fromVillageId, toVillageId, troops"
      }, { status: 400 });
    }

    // Get player
    const player = await prisma.player.findFirst({
      where: { userId: session.user.id },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Verify ownership of source village
    const fromVillage = await prisma.village.findUnique({
      where: { id: fromVillageId },
    });

    if (!fromVillage || fromVillage.playerId !== player.id) {
      return NextResponse.json({
        error: "Source village not found or not owned by you"
      }, { status: 403 });
    }

    // Forward troops
    await MovementService.sendTroops(fromVillageId, toVillageId, troops);

    return NextResponse.json({
      success: true,
      message: "Troops forwarded successfully"
    });

  } catch (error: any) {
    console.error("Troop forwarding error:", error);
    return NextResponse.json({
      error: error.message || "Internal server error"
    }, { status: 500 });
  }
}

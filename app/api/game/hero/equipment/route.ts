import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get player
    const player = await prisma.player.findFirst({
      where: { userId: session.user.id },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Get hero
    const hero = await prisma.hero.findUnique({
      where: { playerId: player.id },
    });

    if (!hero) {
      return NextResponse.json({
        success: false,
        error: "Hero not found"
      }, { status: 404 });
    }

    // Get equipped items
    const equipment = await prisma.heroEquipment.findMany({
      where: { heroId: hero.id },
      include: {
        item: {
          include: {
            template: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      equipment: equipment.map(eq => ({
        id: eq.item.id,
        name: eq.item.name,
        slot: eq.slot,
        rarity: eq.item.rarity,
        quality: eq.item.quality,
        attackBonus: eq.item.attackBonus,
        defenseBonus: eq.item.defenseBonus,
      }))
    });

  } catch (error) {
    console.error("Hero equipment fetch error:", error);
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 });
  }
}


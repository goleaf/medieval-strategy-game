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

    // Get inventory items (not equipped)
    const inventory = await prisma.heroItem.findMany({
      where: {
        heroId: hero.id,
        equipment: null // Not equipped
      },
      include: {
        template: true
      }
    });

    return NextResponse.json({
      success: true,
      inventory: inventory.map(item => ({
        id: item.id,
        name: item.name,
        slot: item.slot,
        rarity: item.rarity,
        quality: item.quality,
        attackBonus: item.attackBonus,
        defenseBonus: item.defenseBonus,
      }))
    });

  } catch (error) {
    console.error("Hero inventory fetch error:", error);
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 });
  }
}


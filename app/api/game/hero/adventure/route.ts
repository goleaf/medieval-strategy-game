import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(req: NextRequest) {
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

    // Get game world for adventure settings
    const gameWorld = await prisma.gameWorld.findUnique({
      where: { id: player.gameWorldId || "default" },
    });

    if (!gameWorld) {
      return NextResponse.json({ error: "Game world not found" }, { status: 404 });
    }

    // Get hero
    const hero = await prisma.hero.findUnique({
      where: { playerId: player.id },
    });

    if (!hero) {
      return NextResponse.json({
        error: "Hero not found"
      }, { status: 404 });
    }

    // Check if hero can go on adventure (cooldown)
    const lastAdventure = hero.lastAdventureAt ? new Date(hero.lastAdventureAt) : null;
    const now = new Date();

    if (lastAdventure) {
      const cooldownHours = 1; // 1 hour cooldown between adventures
      const cooldownTime = new Date(lastAdventure.getTime() + (cooldownHours * 60 * 60 * 1000));

      if (now < cooldownTime) {
        const remainingTime = Math.ceil((cooldownTime.getTime() - now.getTime()) / (1000 * 60 * 60));
        return NextResponse.json({
          error: `Hero is resting. Next adventure available in ${remainingTime} hours.`
        }, { status: 400 });
      }
    }

    // Get available adventures
    const availableAdventures = await prisma.adventure.findMany({
      where: {
        isActive: true,
        heroLevelRequired: {
          lte: hero.level
        },
        adventuresCompletedRequired: {
          lte: hero.adventuresCompleted
        }
      }
    });

    if (availableAdventures.length === 0) {
      return NextResponse.json({
        error: "No adventures available for your hero level"
      }, { status: 400 });
    }

    // Select random adventure
    const adventure = availableAdventures[Math.floor(Math.random() * availableAdventures.length)];

    // Calculate adventure duration in hours (speed scaled)
    const durationHours = adventure.durationHours / (gameWorld.speed || 1);

    // Start adventure
    const heroAdventure = await prisma.heroAdventure.create({
      data: {
        heroId: hero.id,
        adventureId: adventure.id,
        startedAt: now,
        completedAt: new Date(now.getTime() + (durationHours * 60 * 60 * 1000)),
        status: "IN_PROGRESS"
      }
    });

    // Update hero's last adventure time
    await prisma.hero.update({
      where: { id: hero.id },
      data: {
        lastAdventureAt: now
      }
    });

    return NextResponse.json({
      success: true,
      adventure: {
        id: heroAdventure.id,
        name: adventure.name,
        durationHours,
        completedAt: heroAdventure.completedAt
      },
      message: `Hero ${hero.name} has embarked on "${adventure.name}" adventure!`
    });

  } catch (error) {
    console.error("Hero adventure start error:", error);
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 });
  }
}

// Get current adventures
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
        success: true,
        adventures: []
      });
    }

    // Get current adventures
    const adventures = await prisma.heroAdventure.findMany({
      where: {
        heroId: hero.id,
        status: "IN_PROGRESS"
      },
      include: {
        adventure: true
      }
    });

    return NextResponse.json({
      success: true,
      adventures: adventures.map(adv => ({
        id: adv.id,
        name: adv.adventure.name,
        startedAt: adv.startedAt,
        completedAt: adv.completedAt,
        status: adv.status
      }))
    });

  } catch (error) {
    console.error("Hero adventures fetch error:", error);
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 });
  }
}


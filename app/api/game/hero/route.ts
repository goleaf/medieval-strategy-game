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

    return NextResponse.json({
      success: true,
      hero
    });

  } catch (error) {
    console.error("Hero fetch error:", error);
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.length < 1 || name.length > 50) {
      return NextResponse.json({
        error: "Invalid hero name"
      }, { status: 400 });
    }

    // Get player
    const player = await prisma.player.findFirst({
      where: { userId: session.user.id },
    });

    if (!player) {
      return NextResponse.json({ error: "Player not found" }, { status: 404 });
    }

    // Check if hero already exists
    const existingHero = await prisma.hero.findUnique({
      where: { playerId: player.id },
    });

    if (existingHero) {
      return NextResponse.json({
        error: "Hero already exists"
      }, { status: 400 });
    }

    // Create hero
    const hero = await prisma.hero.create({
      data: {
        playerId: player.id,
        name: name.trim(),
      },
    });

    return NextResponse.json({
      success: true,
      hero
    });

  } catch (error) {
    console.error("Hero creation error:", error);
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 });
  }
}

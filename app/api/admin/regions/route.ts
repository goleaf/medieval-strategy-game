import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const admin = await prisma.admin.findUnique({
      where: { userId: session.user.id },
    });

    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get all regions
    const regions = await prisma.region.findMany({
      include: {
        controllingPlayer: {
          select: {
            playerName: true
          }
        }
      },
      orderBy: {
        regionCode: "asc"
      }
    });

    return NextResponse.json({
      success: true,
      regions
    });

  } catch (error) {
    console.error("Regions fetch error:", error);
    return NextResponse.json({
      error: "Internal server error"
    }, { status: 500 });
  }
}


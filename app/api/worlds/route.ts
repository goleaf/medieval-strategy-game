import { type NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { successResponse, serverErrorResponse } from "@/lib/utils/api-response"
import { withMetrics } from "@/lib/utils/metrics"

export const GET = withMetrics("GET /api/worlds", async (req: NextRequest) => {
  try {
    const url = new URL(req.url)
    const includeInactive = url.searchParams.get("includeInactive") === "true"
    const worlds = await prisma.gameWorld.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        _count: { select: { players: true } },
      },
      orderBy: [{ createdAt: "desc" }],
    })
    const data = worlds.map((w) => ({
      id: w.id,
      worldName: w.worldName,
      worldCode: w.worldCode,
      isActive: w.isActive,
      isRegistrationOpen: w.isRegistrationOpen,
      worldType: w.worldType,
      version: w.version,
      region: w.region,
      speed: w.speed,
      seasonType: (w as any).seasonType ?? null,
      seasonName: (w as any).seasonName ?? null,
      seasonDescription: (w as any).seasonDescription ?? null,
      estimatedDurationDays: (w as any).estimatedDurationDays ?? null,
      seasonFeatures: (w as any).seasonFeatures ?? {},
      startedAt: w.startedAt?.toISOString() ?? null,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
      playerCount: (w as any)._count?.players ?? 0,
      ageDays: w.startedAt ? Math.max(0, Math.floor((Date.now() - new Date(w.startedAt).getTime()) / 86_400_000)) : 0,
    }))
    return successResponse(data)
  } catch (error) {
    return serverErrorResponse(error)
  }
})

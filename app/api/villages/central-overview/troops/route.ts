import { prisma } from "@/lib/db"
import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"

interface TroopOverviewData {
  // All troops overview
  allTroops: { [key: string]: number }
  // Troops in village
  villages: {
    id: string
    name: string
    troops: { type: string; quantity: number; cropUpkeep: number }[]
    totalCropUpkeep: number
  }[]
  // Smithy research levels
  smithyResearch: {
    villageId: string
    villageName: string
    research: { troopType: string; level: number }[]
  }[]
  // Hospital wounded troops
  hospitalData: {
    villageId: string
    villageName: string
    woundedTroops: { type: string; quantity: number; healingProgress: number }[]
    totalWounded: number
    hospitalLevel: number
  }[]
}

export async function GET(req: NextRequest) {
  try {
    const playerId = req.nextUrl.searchParams.get("playerId")

    if (!playerId) {
      return errorResponse("Player ID required", 400)
    }

    // Get all villages with troops, smithy research, and hospital data
    const villages = await prisma.village.findMany({
      where: { playerId },
      include: {
        troops: true,
        buildings: {
          where: {
            OR: [
              { type: "ACADEMY" }, // Smithy research
              { type: "HOSPITAL" },
            ],
          },
          include: {
            research: true,
          },
        },
      },
      orderBy: { isCapital: "desc" },
    })

    // Aggregate all troops across villages
    const allTroops: { [key: string]: number } = {}
    villages.forEach(village => {
      village.troops.forEach(troop => {
        allTroops[troop.type] = (allTroops[troop.type] || 0) + troop.quantity
      })
    })

    // Process village-specific data
    const villageTroopData = villages.map(village => {
      // Calculate crop upkeep (simplified - different troop types have different upkeep)
      const troopsWithUpkeep = village.troops.map(troop => {
        let cropUpkeep = 0
        switch (troop.type) {
          case "WARRIOR": cropUpkeep = 1; break
          case "SPEARMAN": cropUpkeep = 1; break
          case "BOWMAN": cropUpkeep = 1; break
          case "HORSEMAN": cropUpkeep = 3; break
          case "PALADIN": cropUpkeep = 5; break
          case "EAGLE_KNIGHT": cropUpkeep = 1; break
          case "RAM": cropUpkeep = 3; break
          case "CATAPULT": cropUpkeep = 5; break
          case "KNIGHT": cropUpkeep = 6; break
          case "NOBLEMAN": cropUpkeep = 6; break
          default: cropUpkeep = 1; break
        }
        return {
          type: troop.type,
          quantity: troop.quantity,
          cropUpkeep: cropUpkeep * troop.quantity,
        }
      })

      const totalCropUpkeep = troopsWithUpkeep.reduce((sum, troop) => sum + troop.cropUpkeep, 0)

      return {
        id: village.id,
        name: village.name,
        troops: troopsWithUpkeep,
        totalCropUpkeep,
      }
    })

    // Process smithy research data
    const smithyResearch = villages.map(village => {
      const academyBuilding = village.buildings.find(b => b.type === "ACADEMY")
      const research = academyBuilding?.research || []

      return {
        villageId: village.id,
        villageName: village.name,
        research: research.map(r => ({
          troopType: r.type.replace("_RESEARCH", ""), // Remove _RESEARCH suffix if present
          level: r.level,
        })),
      }
    })

    // Process hospital data (simplified - no wounded troop system implemented yet)
    const hospitalData = villages.map(village => {
      const hospitalBuilding = village.buildings.find(b => b.type === "HOSPITAL")
      const hospitalLevel = hospitalBuilding?.level || 0

      return {
        villageId: village.id,
        villageName: village.name,
        woundedTroops: [], // Placeholder - no wounded troop system yet
        totalWounded: 0,
        hospitalLevel,
      }
    })

    const response: TroopOverviewData = {
      allTroops,
      villages: villageTroopData,
      smithyResearch,
      hospitalData,
    }

    return successResponse(response)
  } catch (error) {
    return serverErrorResponse(error)
  }
}

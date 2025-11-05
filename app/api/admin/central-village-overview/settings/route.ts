import { prisma } from "@/lib/db"
import { type NextRequest } from "next/server"
import { successResponse, errorResponse, serverErrorResponse } from "@/lib/utils/api-response"

interface CentralVillageOverviewSettings {
  isEnabled: boolean
  refreshInterval: number
  maxVillagesPerPlayer: number
  showProductionRates: boolean
  showMerchantCapacity: boolean
  showWarehouseCapacity: boolean
  showCulturePoints: boolean
  showTroopMovements: boolean
  showBuildingActivity: boolean
  showStarvationWarnings: boolean
  enableRealTimeUpdates: boolean
  cacheTimeout: number
}

// For now, we'll store this in memory since there's no specific table for this
// In a production app, you'd want a dedicated settings table
let settingsCache: CentralVillageOverviewSettings | null = null

const DEFAULT_SETTINGS: CentralVillageOverviewSettings = {
  isEnabled: true,
  refreshInterval: 30,
  maxVillagesPerPlayer: 50,
  showProductionRates: true,
  showMerchantCapacity: true,
  showWarehouseCapacity: true,
  showCulturePoints: true,
  showTroopMovements: true,
  showBuildingActivity: true,
  showStarvationWarnings: true,
  enableRealTimeUpdates: false,
  cacheTimeout: 5,
}

export async function GET(req: NextRequest) {
  try {
    // Initialize with defaults if not set
    if (!settingsCache) {
      settingsCache = { ...DEFAULT_SETTINGS }
    }

    return successResponse({
      ...settingsCache,
      id: "central-village-overview-settings",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate required fields
    const requiredFields = [
      'isEnabled', 'refreshInterval', 'maxVillagesPerPlayer',
      'showProductionRates', 'showMerchantCapacity', 'showWarehouseCapacity',
      'showCulturePoints', 'showTroopMovements', 'showBuildingActivity',
      'showStarvationWarnings', 'enableRealTimeUpdates', 'cacheTimeout'
    ]

    for (const field of requiredFields) {
      if (!(field in body)) {
        return errorResponse(`Missing required field: ${field}`, 400)
      }
    }

    // Validate data types and ranges
    if (typeof body.isEnabled !== 'boolean') {
      return errorResponse('isEnabled must be a boolean', 400)
    }

    if (typeof body.refreshInterval !== 'number' || body.refreshInterval < 10 || body.refreshInterval > 300) {
      return errorResponse('refreshInterval must be a number between 10 and 300', 400)
    }

    if (typeof body.maxVillagesPerPlayer !== 'number' || body.maxVillagesPerPlayer < 1 || body.maxVillagesPerPlayer > 100) {
      return errorResponse('maxVillagesPerPlayer must be a number between 1 and 100', 400)
    }

    if (typeof body.cacheTimeout !== 'number' || body.cacheTimeout < 1 || body.cacheTimeout > 60) {
      return errorResponse('cacheTimeout must be a number between 1 and 60', 400)
    }

    // Update settings
    settingsCache = {
      isEnabled: body.isEnabled,
      refreshInterval: body.refreshInterval,
      maxVillagesPerPlayer: body.maxVillagesPerPlayer,
      showProductionRates: body.showProductionRates,
      showMerchantCapacity: body.showMerchantCapacity,
      showWarehouseCapacity: body.showWarehouseCapacity,
      showCulturePoints: body.showCulturePoints,
      showTroopMovements: body.showTroopMovements,
      showBuildingActivity: body.showBuildingActivity,
      showStarvationWarnings: body.showStarvationWarnings,
      enableRealTimeUpdates: body.enableRealTimeUpdates,
      cacheTimeout: body.cacheTimeout,
    }

    return successResponse({
      ...settingsCache,
      id: "central-village-overview-settings",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}


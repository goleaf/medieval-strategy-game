import { authenticateRequest } from "@/app/api/auth/middleware"
import { prisma } from "@/lib/db"
import { MerchantService } from "@/lib/game-services/merchant-service"
import { PlayerTradeService } from "@/lib/game-services/player-trade-service"
import { ShipmentService } from "@/lib/game-services/shipment-service"
import { successResponse, errorResponse, serverErrorResponse, unauthorizedResponse, handleValidationError } from "@/lib/utils/api-response"
import { directResourceSendSchema } from "@/lib/utils/validation"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { ResourceReservationService } from "@/lib/game-services/resource-reservation-service"
import type { ResourceBundle } from "@/lib/game-services/storage-service"

const TRADE_ACTION_SCHEMA = z.object({
  shipmentId: z.string().min(1, "Shipment ID required"),
  action: z.literal("CANCEL"),
})

type ShipmentWithVillages = Awaited<ReturnType<typeof fetchShipments>>[number]
type ShipmentView = ReturnType<typeof serializeShipment>
const RESOURCE_KEYS = ["wood", "stone", "iron", "gold", "food"] as const
type ResourceKey = (typeof RESOURCE_KEYS)[number]

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) {
      return unauthorizedResponse()
    }

    const player = await prisma.player.findUnique({
      where: { id: auth.playerId },
      select: {
        id: true,
        playerName: true,
        hasGoldClubMembership: true,
        goldClubExpiresAt: true,
        gameWorld: { select: { speed: true } },
      },
    })

    if (!player) {
      return unauthorizedResponse()
    }

    const villages = await prisma.village.findMany({
      where: { playerId: auth.playerId },
      select: {
        id: true,
        name: true,
        x: true,
        y: true,
        wood: true,
        stone: true,
        iron: true,
        gold: true,
        food: true,
      },
      orderBy: { name: "asc" },
    })

    const [merchantSnapshots, shipmentsRaw, reservations, recurringTransfers] = await Promise.all([
      Promise.all(villages.map((village) => MerchantService.getSnapshot(village.id))),
      fetchShipments(auth.playerId),
      ResourceReservationService.listActiveReservations(auth.playerId),
      PlayerTradeService.listRecurringTransfers(auth.playerId),
    ])

    const shipmentViews = shipmentsRaw.map((shipment) => serializeShipment(shipment, auth.playerId))

    const outgoing = shipmentViews.filter((shipment) =>
      shipment.direction === "OUTGOING" &&
      ["SCHEDULED", "EN_ROUTE", "RETURNING", "CANCELLED"].includes(shipment.status),
    )

    const incoming = shipmentViews.filter(
      (shipment) => shipment.direction === "INCOMING" && ["SCHEDULED", "EN_ROUTE"].includes(shipment.status),
    )

    const history = shipmentViews
      .filter((shipment) => ["RETURNED", "FAILED"].includes(shipment.status) || !!shipment.cancelledAt)
      .slice(0, 24)

    const reservedMap = buildReservedMap(reservations)
    const snapshotMap = new Map(merchantSnapshots.map((snapshot) => [snapshot.villageId, snapshot]))
    const responseVillages = villages.map((village) => {
      const snapshot = snapshotMap.get(village.id)
      const reserved = reservedMap.get(village.id) ?? emptyBundle()
      const netResources = buildNetResources(village, reserved)
      return {
        ...village,
        merchants: snapshot
          ? {
              total: snapshot.totalMerchants,
              busy: snapshot.busyMerchants,
              reserved: snapshot.reservedMerchants,
              free: snapshot.availableMerchants,
              capacityPerMerchant: snapshot.capacityPerMerchant,
              baseCapacityPerMerchant: snapshot.baseCapacityPerMerchant,
              capacityBonusPercentage: snapshot.capacityBonusPercentage,
              premiumActive: snapshot.premiumActive,
              tilesPerHour: snapshot.tilesPerHour,
            }
          : null,
        reservedResources: reserved,
        netResources,
      }
    })

    const merchantTotals = merchantSnapshots.reduce(
      (acc, snapshot) => {
        acc.total += snapshot.totalMerchants
        acc.free += snapshot.availableMerchants
        return acc
      },
      { total: 0, free: 0 },
    )

    const internalFlows = buildInternalFlows(shipmentViews, auth.playerId)
    const quickTemplates = buildQuickTemplates(shipmentViews, auth.playerId)
    const contacts = await buildContacts(auth.playerId, responseVillages, shipmentViews)
    const balanceSummary = computeBalanceSummary(responseVillages)
    const recurring = recurringTransfers.map((route) => ({
      id: route.id,
      status: route.status,
      source: {
        id: route.sourceVillage.id,
        name: route.sourceVillage.name,
        x: route.sourceVillage.x,
        y: route.sourceVillage.y,
      },
      target: {
        id: route.targetVillage.id,
        name: route.targetVillage.name,
        x: route.targetVillage.x,
        y: route.targetVillage.y,
      },
      bundle: {
        wood: route.wood,
        stone: route.stone,
        iron: route.iron,
        gold: route.gold,
        food: route.food,
      },
      schedule: route.scheduleJson,
      nextRunAt: route.nextRunAt,
      lastRunAt: route.lastRunAt,
      skipIfInsufficient: route.skipIfInsufficient,
    }))

    return successResponse({
      player: {
        id: player.id,
        name: player.playerName,
        premium: {
          hasGoldClub: player.hasGoldClubMembership,
          expiresAt: player.goldClubExpiresAt,
        },
      },
      world: {
        speed: player.gameWorld?.speed ?? 1,
      },
      villages: responseVillages,
      shipments: {
        outgoing,
        incoming,
      },
      history,
      internalFlows,
      recurringTransfers: recurring,
      contacts,
      quickTemplates,
      reservations: reservations.map((reservation) => ({
        id: reservation.id,
        villageId: reservation.villageId,
        villageName: reservation.village.name,
        coords: { x: reservation.village.x, y: reservation.village.y },
        label: reservation.label,
        resources: {
          wood: reservation.wood,
          stone: reservation.stone,
          iron: reservation.iron,
          gold: reservation.gold,
          food: reservation.food,
        },
        reservedAt: reservation.reservedAt,
        expiresAt: reservation.expiresAt,
      })),
      balance: balanceSummary,
      totals: {
        merchants: merchantTotals,
      },
    })
  } catch (error) {
    return serverErrorResponse(error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) {
      return unauthorizedResponse()
    }

    const payload = directResourceSendSchema.parse(await req.json())
    const destination = payload.toVillageId
      ? { villageId: payload.toVillageId }
      : { coordinates: { x: payload.toX!, y: payload.toY! } }

    const trade = await PlayerTradeService.initiateDirectTrade({
      playerId: auth.playerId,
      sourceVillageId: payload.fromVillageId,
      destination,
      resources: payload.resources,
    })

    return successResponse({
      shipmentId: trade.shipment.id,
      eta: trade.shipment.arriveAt,
      merchantsUsed: trade.shipment.merchantsUsed,
      target: {
        villageId: trade.targetVillage.id,
        villageName: trade.targetVillage.name,
        playerName: trade.targetVillage.player?.playerName ?? "Unknown",
        x: trade.targetVillage.x,
        y: trade.targetVillage.y,
      },
    }, 201)
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return errorResponse((error as Error).message, 400)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) {
      return unauthorizedResponse()
    }

    const payload = TRADE_ACTION_SCHEMA.parse(await req.json())
    const shipment = await ShipmentService.cancelShipment(payload.shipmentId, auth.playerId)

    return successResponse({
      shipmentId: shipment.id,
      status: shipment.status,
      cancelledAt: shipment.cancelledAt,
      returnAt: shipment.returnAt,
    })
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return errorResponse((error as Error).message, 400)
  }
}

async function fetchShipments(playerId: string) {
  return prisma.shipment.findMany({
    where: {
      OR: [
        { sourceVillage: { playerId } },
        { targetVillage: { playerId } },
      ],
    },
    include: {
      sourceVillage: {
        select: {
          id: true,
          name: true,
          x: true,
          y: true,
          playerId: true,
          player: { select: { playerName: true } },
        },
      },
      targetVillage: {
        select: {
          id: true,
          name: true,
          x: true,
          y: true,
          playerId: true,
          player: { select: { playerName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  })
}

function serializeShipment(shipment: ShipmentWithVillages, playerId: string) {
  const direction = shipment.sourceVillage.playerId === playerId ? "OUTGOING" : "INCOMING"
  const resources = bundleFromShipment(shipment)
  const travelMinutes = Math.max(
    0,
    Math.round((shipment.arriveAt.getTime() - shipment.departAt.getTime()) / 60000),
  )
  const internal = shipment.sourceVillage.playerId === shipment.targetVillage.playerId

  return {
    id: shipment.id,
    direction,
    status: shipment.status,
    departAt: shipment.departAt,
    arriveAt: shipment.arriveAt,
    returnAt: shipment.returnAt,
    deliveredAt: shipment.deliveredAt,
    cancelledAt: shipment.cancelledAt,
    merchantsUsed: shipment.merchantsUsed,
    travelMinutes,
    totalResources: Object.values(resources).reduce((sum, value) => sum + value, 0),
    resources,
    origin: {
      id: shipment.sourceVillage.id,
      name: shipment.sourceVillage.name,
      x: shipment.sourceVillage.x,
      y: shipment.sourceVillage.y,
      playerId: shipment.sourceVillage.playerId,
      playerName: shipment.sourceVillage.player?.playerName ?? "Unknown",
    },
    destination: {
      id: shipment.targetVillage.id,
      name: shipment.targetVillage.name,
      x: shipment.targetVillage.x,
      y: shipment.targetVillage.y,
      playerId: shipment.targetVillage.playerId,
      playerName: shipment.targetVillage.player?.playerName ?? "Unknown",
    },
    updatedAt: shipment.updatedAt,
    internal,
  }
}

function bundleFromShipment(shipment: ShipmentWithVillages) {
  return {
    wood: shipment.wood,
    stone: shipment.stone,
    iron: shipment.iron,
    gold: shipment.gold,
    food: shipment.food,
  }
}

function buildQuickTemplates(shipments: ShipmentView[], playerId: string) {
  const grouped = new Map<
    string,
    {
      count: number
      shipment: ReturnType<typeof serializeShipment>
    }
  >()

  shipments
    .filter((shipment) => shipment.direction === "OUTGOING" && shipment.origin.playerId === playerId)
    .forEach((shipment) => {
      const bucket = grouped.get(shipment.destination.id)
      if (bucket) {
        bucket.count += 1
        if (shipment.departAt > bucket.shipment.departAt) {
          bucket.shipment = shipment
        }
      } else {
        grouped.set(shipment.destination.id, { count: 1, shipment })
      }
    })

  return Array.from(grouped.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)
    .map(({ shipment, count }) => ({
      key: shipment.id,
      targetVillageId: shipment.destination.id,
      targetName: shipment.destination.name,
      coords: { x: shipment.destination.x, y: shipment.destination.y },
      bundle: shipment.resources,
      merchantsRequired: shipment.merchantsUsed,
      travelMinutes: shipment.travelMinutes,
      recentCount: count,
    }))
}

function buildReservedMap(reservations: Awaited<ReturnType<typeof ResourceReservationService.listActiveReservations>>) {
  const map = new Map<string, ResourceBundle>()
  for (const reservation of reservations) {
    const totals = map.get(reservation.villageId) ?? emptyBundle()
    for (const key of RESOURCE_KEYS) {
      totals[key] = (totals[key] ?? 0) + (reservation[key] ?? 0)
    }
    map.set(reservation.villageId, totals)
  }
  return map
}

function emptyBundle(): ResourceBundle {
  return { wood: 0, stone: 0, iron: 0, gold: 0, food: 0 }
}

function buildNetResources(
  village: { wood: number; stone: number; iron: number; gold: number; food: number },
  reserved: ResourceBundle,
) {
  const net = emptyBundle()
  for (const key of RESOURCE_KEYS) {
    net[key] = (village[key] ?? 0) - (reserved[key] ?? 0)
  }
  return net
}

function buildInternalFlows(shipments: ShipmentView[], playerId: string) {
  const map = new Map<
    string,
    {
      origin: ShipmentView["origin"]
      destination: ShipmentView["destination"]
      resources: ResourceBundle
      shipments: number
    }
  >()

  for (const shipment of shipments) {
    if (shipment.origin.playerId !== playerId || shipment.destination.playerId !== playerId) {
      continue
    }
    const key = `${shipment.origin.id}->${shipment.destination.id}`
    const entry =
      map.get(key) ??
      {
        origin: shipment.origin,
        destination: shipment.destination,
        resources: emptyBundle(),
        shipments: 0,
      }
    entry.shipments += 1
    for (const resource of RESOURCE_KEYS) {
      entry.resources[resource] += shipment.resources[resource]
    }
    map.set(key, entry)
  }

  return Array.from(map.values())
    .map((entry) => ({
      origin: entry.origin,
      destination: entry.destination,
      resources: entry.resources,
      shipments: entry.shipments,
      totalResources: RESOURCE_KEYS.reduce((sum, key) => sum + entry.resources[key], 0),
    }))
    .sort((a, b) => b.totalResources - a.totalResources)
}

function computeBalanceSummary(
  villages: Array<{
    id: string
    name: string
    netResources: ResourceBundle
    reservedResources: ResourceBundle
  }>,
) {
  type ResourceStatus = "SURPLUS" | "DEFICIT" | "BALANCED"
  const perVillage = villages.map((village) => ({
    villageId: village.id,
    villageName: village.name,
    netResources: village.netResources,
    reservedResources: village.reservedResources,
    resourceStatus: {} as Record<ResourceKey, ResourceStatus>,
  }))

  const suggestions: Array<{
    resource: ResourceKey
    fromVillageId: string
    toVillageId: string
    amount: number
  }> = []

  for (const resource of RESOURCE_KEYS) {
    const values = perVillage.map((entry) => entry.netResources[resource])
    const average = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)

    const surpluses = perVillage
      .map((entry) => ({
        entry,
        delta: entry.netResources[resource] - average,
      }))
      .filter((item) => item.delta > 0)
      .sort((a, b) => b.delta - a.delta)

    const deficits = perVillage
      .map((entry) => ({
        entry,
        delta: entry.netResources[resource] - average,
      }))
      .filter((item) => item.delta < 0)
      .sort((a, b) => a.delta - b.delta)

    perVillage.forEach((entry) => {
      const value = entry.netResources[resource]
      entry.resourceStatus[resource] =
        value > average
          ? "SURPLUS"
          : value < average
          ? "DEFICIT"
          : "BALANCED"
    })

    let i = 0
    let j = 0
    while (i < surpluses.length && j < deficits.length && suggestions.length < 5) {
      const give = surpluses[i]
      const need = deficits[j]
      const transfer = Math.min(give.delta, Math.abs(need.delta))
      if (transfer <= 0) break
      suggestions.push({
        resource,
        fromVillageId: give.entry.villageId,
        toVillageId: need.entry.villageId,
        amount: Math.round(transfer),
      })
      give.delta -= transfer
      need.delta += transfer
      if (give.delta <= 0.01) i += 1
      if (need.delta >= -0.01) j += 1
    }
  }

  return { perVillage, suggestions }
}

async function buildContacts(
  playerId: string,
  ownVillages: Array<{
    id: string
    name: string
    x: number
    y: number
  }>,
  shipments: ReturnType<typeof serializeShipment>[],
) {
  const contacts = new Map<
    string,
    {
      villageId: string
      villageName: string
      playerId: string
      playerName: string
      x: number
      y: number
      type: "SELF" | "ALLY" | "RECENT"
    }
  >()

  ownVillages.forEach((village) => {
    contacts.set(village.id, {
      villageId: village.id,
      villageName: village.name,
      playerId,
      playerName: "You",
      x: village.x,
      y: village.y,
      type: "SELF",
    })
  })

  const membership = await prisma.allianceMember.findFirst({
    where: {
      playerId,
      state: { in: ["ACTIVE", "PROBATION"] },
    },
    select: { allianceId: true },
  })

  if (membership?.allianceId) {
    const alliedMembers = await prisma.allianceMember.findMany({
      where: {
        allianceId: membership.allianceId,
        state: { in: ["ACTIVE", "PROBATION"] },
        playerId: { not: playerId },
      },
      select: {
        playerId: true,
        player: { select: { playerName: true } },
      },
    })

    const alliedPlayerIds = alliedMembers.map((member) => member.playerId)
    if (alliedPlayerIds.length > 0) {
      const alliedVillages = await prisma.village.findMany({
        where: { playerId: { in: alliedPlayerIds } },
        select: {
          id: true,
          name: true,
          x: true,
          y: true,
          playerId: true,
          player: { select: { playerName: true } },
        },
      })

      alliedVillages.forEach((village) => {
        if (!contacts.has(village.id)) {
          contacts.set(village.id, {
            villageId: village.id,
            villageName: village.name,
            playerId: village.playerId,
            playerName: village.player?.playerName ?? "Ally",
            x: village.x,
            y: village.y,
            type: "ALLY",
          })
        }
      })
    }
  }

  shipments.forEach((shipment) => {
    const candidate =
      shipment.direction === "OUTGOING" ? shipment.destination : shipment.origin
    if (candidate.playerId === playerId) return
    if (contacts.has(candidate.id)) return

    contacts.set(candidate.id, {
      villageId: candidate.id,
      villageName: candidate.name,
      playerId: candidate.playerId,
      playerName: candidate.playerName,
      x: candidate.x,
      y: candidate.y,
      type: "RECENT",
    })
  })

  return Array.from(contacts.values())
}

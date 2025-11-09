import { prisma } from "@/lib/db"
import { MovementService } from "@/lib/game-services/movement-service"
import { EventQueueService } from "@/lib/game-services/event-queue-service"
import { ProtectionService } from "@/lib/game-services/protection-service"
import { CombatService } from "@/lib/game-services/combat-service"
import { NightPolicyService, attackTypeToMission, formatWorldTime } from "@/lib/game-services/night-policy-service"
import { NotificationService } from "@/lib/game-services/notification-service"
import { EmailNotificationService } from "@/lib/notifications/email-notification-service"
import { type NextRequest } from "next/server"
import { attackLaunchSchema } from "@/lib/utils/validation"
import {
  successResponse,
  errorResponse,
  serverErrorResponse,
  notFoundResponse,
  handleValidationError,
} from "@/lib/utils/api-response"
import type { AttackType, EmailNotificationTopic } from "@prisma/client"
import { WorldRulesService } from "@/lib/game-rules/world-rules"
import { getTroopSystemConfig } from "@/lib/troop-system/config"
import { getRallyPointEngine } from "@/lib/rally-point/server"
import { randomUUID } from "node:crypto"
import { authenticateRequest } from "@/app/api/auth/middleware"
import { SitterPermissions } from "@/lib/utils/sitter-permissions"
import { SitterDualService } from "@/lib/game-services/sitter-dual-service"
import type { AccountActorType } from "@prisma/client"

function looksLikeUnitTypeId(id: string): boolean {
  const config = getTroopSystemConfig()
  return Boolean(config.units[id])
}

function shouldUseRallyEngine(
  selections: Array<{ troopId: string; quantity: number }>,
  legacyTroops: { id: string }[],
): boolean {
  if (selections.length === 0) return false
  const legacyIds = new Set(legacyTroops.map((troop) => troop.id))
  return selections.every((selection) => !legacyIds.has(selection.troopId) && looksLikeUnitTypeId(selection.troopId))
}

const attackTypeToRallyMission = (attackType: AttackType): "attack" | "raid" => {
  if (attackType === "RAID") return "raid"
  return "attack"
}
export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req)
    if (!auth?.playerId) return errorResponse("Unauthorized", 401)
    const body = await req.json()
    
    // Validate basic structure first
    const validated = attackLaunchSchema.safeParse({
      fromVillageId: body.fromVillageId,
      toVillageId: body.toVillageId,
      toX: body.toX,
      toY: body.toY,
      type: body.attackType,
      units: Object.entries(body.troopSelection || {}).map(([troopId, quantity]) => ({
        troopId,
        quantity: quantity as number,
      })),
      catapultTargets: body.catapultTargets,
      arriveAt: body.arriveAt,
    })

    if (!validated.success) {
      return errorResponse(validated.error, 400)
    }

    const { fromVillageId, toX, toY, type, units, arriveAt } = validated.data
    const catapultTargets: string[] | undefined = Array.isArray(body.catapultTargets)
      ? (body.catapultTargets as string[])
      : undefined
    const attackType = type as AttackType

    const fromVillage = await prisma.village.findUnique({
      where: { id: fromVillageId },
      include: { troops: true, player: true },
    })

    if (!fromVillage) {
      return notFoundResponse()
    }

    // Enforcement: check attacking restriction
    {
      const { checkPermission } = await import("@/lib/moderation/enforcement")
      const permission = await checkPermission(fromVillage.playerId, "ATTACK")
      if (!permission.allowed) {
        return errorResponse(permission.reason || "Attacking restricted", 403)
      }
    }

    // Find target village
    const targetVillage = await prisma.village.findUnique({
      where: { x_y: { x: toX, y: toY } },
      include: { player: true },
    })

    // Check if attacker has beginner protection
    const attackerIsProtected = await ProtectionService.isPlayerProtected(fromVillage.playerId)

    if (targetVillage) {
      // Check if target village is protected (except for scouting and when attacking Natars)
      if (type !== "SCOUT") {
        const isTargetProtected = await ProtectionService.isVillageProtected(targetVillage.id)
        const isNatar = targetVillage.player?.playerName.toLowerCase().includes('natar')

        if (isTargetProtected && !isNatar) {
          return errorResponse("Target village is protected by beginner protection", 403)
        }

        // If attacker is protected and target is not protected (and not Natar), allow but drop protection early.
        if (attackerIsProtected && !isTargetProtected && !isNatar) {
          const confirm = Boolean(body.confirmProtectionDrop)
          if (!confirm) {
            return errorResponse(
              "Attacking this player will end your beginner protection immediately. Resubmit with confirmProtectionDrop=true to proceed.",
              409,
            )
          }
          await prisma.player.update({
            where: { id: fromVillage.playerId },
            data: { beginnerProtectionUntil: new Date() },
          })
          try {
            const { NotificationService } = await import("@/lib/game-services/notification-service")
            await NotificationService.emit({
              playerId: fromVillage.playerId,
              type: "GAME_UPDATE",
              priority: "MEDIUM",
              title: "Beginner protection ended",
              message: "Your attack on a non-protected player ended your protection early.",
              actionUrl: "/rules",
              metadata: { reason: "attack_non_protected" },
            })
          } catch {}
        }
      }

      // Check if attacking own village
      if (targetVillage.playerId === fromVillage.playerId) {
        return errorResponse("Cannot attack your own village", 400)
      }
    }

    if (attackType === "SCOUT" && targetVillage) {
      const scoutingConfig = await WorldRulesService.getScoutingConfig()
      const totalScouts = units.reduce((sum, unit) => sum + unit.quantity, 0)
      if (totalScouts <= scoutingConfig.spam.minScoutsPerReport) {
        const windowStart = new Date(Date.now() - scoutingConfig.spam.windowSeconds * 1000)
        const recentPings = await prisma.attack.count({
          where: {
            fromVillageId,
            toVillageId: targetVillage.id,
            type: "SCOUT",
            createdAt: { gte: windowStart },
          },
        })
        if (recentPings >= scoutingConfig.spam.maxReportsPerWindow) {
          return errorResponse(
            "Scout spam protection: please wait before sending another minimal probe to this village.",
            429,
          )
        }
      }
    }

    const useRallyEngine =
      attackType !== "SCOUT" &&
      shouldUseRallyEngine(units, fromVillage.troops)

    if (useRallyEngine) {
      const engine = getRallyPointEngine()
      const mission = attackTypeToRallyMission(attackType)
      const unitsByType = units.reduce<Record<string, number>>((acc, unit) => {
        if (unit.quantity > 0) {
          acc[unit.troopId] = (acc[unit.troopId] ?? 0) + unit.quantity
        }
        return acc
      }, {})
      const target = targetVillage
        ? { type: "village" as const, villageId: targetVillage.id }
        : { type: "coords" as const, x: toX, y: toY }

      const rallyResult = await engine.sendMission({
        sourceVillageId: fromVillage.id,
        sourceAccountId: fromVillage.playerId,
        mission,
        target,
        units: unitsByType,
        catapultTargets,
        arriveAt: arriveAt ? new Date(arriveAt) : undefined,
        idempotencyKey: randomUUID(),
      })

      // Log sitter/dual action
      {
        const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined
        const ua = req.headers.get("user-agent") || undefined
        if (sitterContext.isSitter) {
          await SitterDualService.logAction({
            playerId: auth.playerId!,
            actorType: "SITTER" as AccountActorType,
            actorUserId: auth.userId,
            actorPlayerId: sitterContext.sitterId,
            actorLabel: "Sitter",
            action: "ATTACK_LAUNCH",
            metadata: { mission, target, units: unitsByType, catapultTargets, arriveAt },
            ipAddress: ip,
            userAgent: ua,
          })
        } else if (auth.isDual && auth.dualFor) {
          await SitterDualService.logAction({
            playerId: auth.playerId!,
            actorType: "DUAL" as AccountActorType,
            actorUserId: auth.userId,
            actorLabel: "Dual",
            action: "ATTACK_LAUNCH",
            metadata: { mission, target, units: unitsByType, catapultTargets, arriveAt },
            ipAddress: ip,
            userAgent: ua,
          })
        }
      }

      return successResponse(
        {
          movement: rallyResult.movement,
          warnings: rallyResult.warnings,
        },
        201,
      )
    }

    // Legacy (troopId-based) handling
    const troopSpeeds: number[] = []
    for (const unit of units) {
      const troop = fromVillage.troops.find((t) => t.id === unit.troopId)
      if (!troop || troop.quantity < unit.quantity) {
        return errorResponse("Invalid troop selection", 400)
      }
      troopSpeeds.push(troop.speed)
    }

    // Calculate distance and travel time
    const distance = MovementService.distance(fromVillage.x, fromVillage.y, toX, toY)
    const slowestSpeed = MovementService.getSlowestSpeed(
      units.map((u) => {
        const troop = fromVillage.troops.find((t) => t.id === u.troopId)!
        return { speed: troop.speed, quantity: u.quantity }
      }),
    )
    const travelTimeMs = await MovementService.calculateTravelTime(distance, [slowestSpeed])
    const mission = attackTypeToMission(attackType)
    let arrivalAt = new Date(Date.now() + travelTimeMs)
    const arrivalPolicy = await NightPolicyService.evaluateArrival(arrivalAt, mission)

    if (!arrivalPolicy.allowed) {
      const targetTime =
        arrivalPolicy.delayedUntil && arrivalPolicy.state.config.timezone
          ? formatWorldTime(arrivalPolicy.delayedUntil, arrivalPolicy.state.config.timezone)
          : "the end of the current night window"
      return errorResponse(
        `Night truce is active for ${mission} missions. Earliest possible landing: ${targetTime}.`,
        409,
      )
    }

    if (arrivalPolicy.delayedUntil) {
      arrivalAt = arrivalPolicy.delayedUntil
    }

    // Create movement
    const path = MovementService.findPath(fromVillage.x, fromVillage.y, toX, toY)

    const movement = await prisma.movement.create({
      data: {
        kind: "TROOP",
        fromVillageId: fromVillage.id,
        toVillageId: targetVillage?.id ?? null,
        fromX: fromVillage.x,
        fromY: fromVillage.y,
        toX,
        toY,
        path: JSON.stringify(path),
        totalSteps: Math.max(1, path.length),
        arrivalAt,
        payload: catapultTargets && catapultTargets.length ? ({ catapultTargets } as any) : undefined,
      },
    })

    await EventQueueService.scheduleEvent(
      "TROOP_MOVEMENT",
      arrivalAt,
      { movementId: movement.id },
      { dedupeKey: `movement:${movement.id}` },
    )

    // Deduct troops from village
    for (const unit of units) {
      await prisma.troop.update({
        where: { id: unit.troopId },
        data: { quantity: { decrement: unit.quantity } },
      })
    }

    // Create attack
    const attack = await prisma.attack.create({
      data: {
        fromVillageId,
        toVillageId: targetVillage?.id || null,
        movementId: movement.id,
        type: attackType,
        arrivalAt,
        attackUnits: {
          create: units.map((unit) => ({
            troopId: unit.troopId,
            quantity: unit.quantity,
          })),
        },
      },
      include: { attackUnits: { include: { troop: true } } },
    })

    // Send alliance attack notifications (Reign of Fire feature)
    if (targetVillage) {
      try {
        await CombatService.sendAllianceAttackNotifications(attack.id);
      } catch (error) {
        console.error("Failed to send alliance attack notifications:", error);
        // Don't fail the attack launch if notifications fail
      }
    }

    if (targetVillage?.playerId) {
      NotificationService.emit({
        playerId: targetVillage.playerId,
        type: attackType === "CONQUEST" ? "NOBLE_ATTACK_INCOMING" : "ATTACK_INCOMING",
        title: attackType === "CONQUEST" ? "Incoming noble attack" : "Incoming attack detected",
        message: `${fromVillage.player.playerName} is sending troops from ${fromVillage.name} to ${targetVillage.name}. Landing ETA: ${attack.arrivalAt.toISOString()}`,
        metadata: {
          attackId: attack.id,
          attackType,
          fromVillageId: fromVillage.id,
          toVillageId: targetVillage.id,
          arrivalAt: attack.arrivalAt.toISOString(),
        },
        actionUrl: `/village/${targetVillage.id}/rally-point`,
      }).catch((error) => {
        console.error("Failed to enqueue player notification for attack launch:", error)
      })

      const unitCount = units.reduce((sum, unit) => sum + unit.quantity, 0)
      await EmailNotificationService.queueEvent({
        playerId: targetVillage.playerId,
        topic: EmailNotificationTopic.ATTACK_INCOMING,
        payload: {
          attackId: attack.id,
          attackType,
          arrivalAt: attack.arrivalAt.toISOString(),
          attacker: {
            id: fromVillage.playerId,
            name: fromVillage.player.playerName,
            village: fromVillage.name,
            coords: { x: fromVillage.x, y: fromVillage.y },
          },
          defender: {
            id: targetVillage.playerId,
            village: targetVillage.name,
            coords: { x: targetVillage.x, y: targetVillage.y },
          },
          unitCount,
        },
        linkTarget: `/village/${targetVillage.id}/rally-point`,
      })
    }

    // Log sitter/dual action for legacy engine case
    {
      const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || undefined
      const ua = req.headers.get("user-agent") || undefined
      if (sitterContext.isSitter) {
        await SitterDualService.logAction({
          playerId: auth.playerId!,
          actorType: "SITTER" as AccountActorType,
          actorUserId: auth.userId,
          actorPlayerId: sitterContext.sitterId,
          actorLabel: "Sitter",
          action: "ATTACK_LAUNCH",
          metadata: { attackId: attack.id, attackType, fromVillageId, toVillageId: targetVillage?.id },
          ipAddress: ip,
          userAgent: ua,
        })
      } else if (auth.isDual && auth.dualFor) {
        await SitterDualService.logAction({
          playerId: auth.playerId!,
          actorType: "DUAL" as AccountActorType,
          actorUserId: auth.userId,
          actorLabel: "Dual",
          action: "ATTACK_LAUNCH",
          metadata: { attackId: attack.id, attackType, fromVillageId, toVillageId: targetVillage?.id },
          ipAddress: ip,
          userAgent: ua,
        })
      }
    }

    return successResponse(attack, 201)
  } catch (error) {
    const validationError = handleValidationError(error)
    if (validationError) return validationError
    return serverErrorResponse(error)
  }
}
    // Sitter enforcement: sending raids/attacks requires permission
    const sitterContext = await SitterPermissions.getSitterContext(auth)
    if (sitterContext.isSitter) {
      // Require 'launchConquest' for CONQUEST; otherwise 'sendRaids'
      const action = attackType === 'CONQUEST' ? 'launchConquest' : 'sendRaids'
      const permissionCheck = await SitterPermissions.enforcePermission(
        req,
        sitterContext.sitterId!,
        sitterContext.ownerId!,
        action
      )
      if (permissionCheck) return permissionCheck
    }

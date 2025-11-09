import { prisma } from "@/lib/db"
import { ENFORCEMENT_DEFAULTS } from "./config"
import type { EnforcementRequest } from "./types"

export async function applyEnforcement(req: EnforcementRequest, adminId?: string) {
  const now = new Date()
  const endAt = req.durationHours ? new Date(now.getTime() + req.durationHours * 3600 * 1000) : null

  const actions: Promise<unknown>[] = []

  if (req.playerIds?.length) {
    for (const playerId of req.playerIds) {
      if (req.action === "WARNING") {
        actions.push(createPlayerWarning(playerId, req.reason))
      }
      if (req.action === "ATTACK_RESTRICT") {
        actions.push(
          prisma.player.update({ where: { id: playerId }, data: { attackRestrictedUntil: endAt } }),
        )
      }
      if (req.action === "TRADE_RESTRICT") {
        actions.push(
          prisma.player.update({ where: { id: playerId }, data: { tradeRestrictedUntil: endAt } }),
        )
      }
      if (req.action === "BAN") {
        actions.push(
          prisma.player.update({
            where: { id: playerId },
            data: { isDeleted: true, deletedAt: now, banReason: req.reason },
          }),
        )
      }
      if (req.action === "POINT_RESET") {
        // Minimal implementation: zero recent gains by setting totalPoints to minimum of current villages.
        // In a real system we'd compute and subtract the illicit gains. Here we record the action.
        actions.push(
          prisma.enforcementAction.create({
            data: {
              targetType: "PLAYER",
              targetId: playerId,
              action: "POINT_RESET",
              reason: req.reason,
              startAt: now,
              endAt,
              createdByAdminId: adminId ?? null,
            },
          }),
        )
      }
      actions.push(
        prisma.enforcementAction.create({
          data: {
            targetType: "PLAYER",
            targetId: playerId,
            action: req.action,
            reason: req.reason,
            startAt: now,
            endAt,
            createdByAdminId: adminId ?? null,
          },
        }),
      )
    }
  }

  if (req.userIds?.length) {
    for (const userId of req.userIds) {
      if (req.action === "SUSPEND") {
        actions.push(prisma.user.update({ where: { id: userId }, data: { suspendedUntil: endAt } }))
      }
      if (req.action === "BAN") {
        // Hard ban: mark suspension far in future
        actions.push(
          prisma.user.update({ where: { id: userId }, data: { suspendedUntil: new Date("2999-01-01") } }),
        )
      }
      actions.push(
        prisma.enforcementAction.create({
          data: {
            targetType: "USER",
            targetId: userId,
            action: req.action,
            reason: req.reason,
            startAt: now,
            endAt,
            createdByAdminId: adminId ?? null,
          },
        }),
      )
    }
  }

  if (req.ipAddresses?.length && req.action === "IP_BAN") {
    for (const ip of req.ipAddresses) {
      actions.push(
        prisma.ipBan.upsert({
          where: { ipAddress: ip },
          update: { expiresAt: endAt ?? undefined },
          create: { ipAddress: ip, reason: req.reason, expiresAt: endAt ?? undefined },
        }),
      )
      actions.push(
        prisma.enforcementAction.create({
          data: {
            targetType: "IP",
            targetId: ip,
            action: "IP_BAN",
            reason: req.reason,
            startAt: now,
            endAt,
            createdByAdminId: adminId ?? null,
          },
        }),
      )
    }
  }

  await Promise.all(actions)
}

export async function createPlayerWarning(playerId: string, reason?: string) {
  const player = await prisma.player.findUnique({ where: { id: playerId } })
  if (!player) return
  return prisma.playerNotification.create({
    data: {
      playerId,
      type: "GAME_UPDATE",
      priority: "HIGH",
      title: "Warning: Multi-accounting rules",
      message: reason || ENFORCEMENT_DEFAULTS.warningMessage,
      requiresAcknowledgement: true,
      actionUrl: "/support/appeals",
      metadata: { category: "moderation", kind: "warning" },
    },
  })
}

export async function checkPermission(playerId: string, kind: "ATTACK" | "TRADE") {
  const p = await prisma.player.findUnique({
    where: { id: playerId },
    select: { attackRestrictedUntil: true, tradeRestrictedUntil: true, suspendedUntil: true },
  })
  if (!p) return { allowed: false, reason: "Player not found" }
  const now = new Date()
  if (p.suspendedUntil && p.suspendedUntil > now) {
    return { allowed: false, reason: "Account suspended" }
  }
  if (kind === "ATTACK" && p.attackRestrictedUntil && p.attackRestrictedUntil > now) {
    return { allowed: false, reason: "Attacking temporarily restricted" }
  }
  if (kind === "TRADE" && p.tradeRestrictedUntil && p.tradeRestrictedUntil > now) {
    return { allowed: false, reason: "Trading temporarily restricted" }
  }
  return { allowed: true }
}

export async function isIpBanned(ip?: string | null) {
  if (!ip) return false
  const ban = await prisma.ipBan.findUnique({ where: { ipAddress: ip } })
  if (!ban) return false
  if (!ban.expiresAt) return true
  return ban.expiresAt > new Date()
}

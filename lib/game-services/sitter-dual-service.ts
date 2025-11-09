import { prisma } from "@/lib/db"
import type { Player, Sitter, Dual, AccountActorType, SitterSession } from "@prisma/client"

export class SitterDualService {
  /**
   * Update inactivity allowance for all players
   * Runs daily to calculate inactivity allowance based on owner and sitter activity
   */
  static async updateInactivityAllowance(): Promise<void> {
    const players = await prisma.player.findMany({
      include: {
        sittersAsOwner: {
          where: { isActive: true },
          include: { sitter: true }
        }
      }
    })

    for (const player of players) {
      await this.updatePlayerInactivityAllowance(player)
    }
  }

  /**
   * Update inactivity allowance for a specific player
   */
  static async updatePlayerInactivityAllowance(player: Player & { sittersAsOwner: (Sitter & { sitter: Player })[] }): Promise<void> {
    const now = new Date()
    const lastActivity = player.lastActiveAt
    const lastOwnerActivity = player.lastOwnerActivityAt || lastActivity

    // Check if owner was active in the last 24 hours
    const ownerActiveToday = this.isActiveToday(lastOwnerActivity)

    // Check if any active sitters were active in the last 24 hours
    const sitterActiveToday = player.sittersAsOwner.some(sitter =>
      this.isActiveToday(sitter.sitter.lastActiveAt)
    )

    // Calculate inactivity allowance change
    let allowanceChange = 0

    if (ownerActiveToday && sitterActiveToday) {
      // Both owner and sitter active: +1 day
      allowanceChange = 1
    } else if (ownerActiveToday && !sitterActiveToday) {
      // Only owner active: +1 day
      allowanceChange = 1
    } else if (!ownerActiveToday && sitterActiveToday) {
      // Only sitter active: -1 day
      allowanceChange = -1
    }
    // If neither active: no change (allowanceChange = 0)

    // Update allowance (clamp between 0 and 14)
    const newAllowance = Math.max(0, Math.min(14, player.inactivityAllowanceDays + allowanceChange))

    // Update player
    await prisma.player.update({
      where: { id: player.id },
      data: {
        inactivityAllowanceDays: newAllowance
      }
    })

    // If allowance hits 0, deactivate all sitters
    if (newAllowance === 0 && player.inactivityAllowanceDays > 0) {
      await this.deactivateAllSitters(player.id)
    }

    // Send warning if allowance drops to 3 days
    if (newAllowance === 3 && player.inactivityAllowanceDays > 3) {
      await this.sendInactivityWarning(player)
    }
  }

  /**
   * Check if a timestamp represents activity within the last 24 hours
   */
  private static isActiveToday(lastActivity: Date): boolean {
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    return lastActivity >= yesterday
  }

  /**
   * Deactivate all sitters for a player
   */
  static async deactivateAllSitters(ownerId: string): Promise<void> {
    await prisma.sitter.updateMany({
      where: { ownerId, isActive: true },
      data: { isActive: false }
    })

    // Notify owner via system message
    await prisma.message.create({
      data: {
        senderId: ownerId,
        recipientId: ownerId,
        type: "SYSTEM",
        subject: "Sitters Deactivated",
        content: "All sitters were deactivated because inactivity allowance reached 0.",
      }
    })
  }

  /**
   * Send inactivity warning to player
   */
  private static async sendInactivityWarning(player: Player): Promise<void> {
    await prisma.message.create({
      data: {
        senderId: player.id,
        recipientId: player.id,
        type: "SYSTEM",
        subject: "Inactivity Warning",
        content: "Your inactivity allowance has dropped to 3 days. If it reaches 0, all your sitters will be deactivated.",
      }
    })
  }

  /**
   * Record owner activity (call this when owner performs any game action)
   */
  static async recordOwnerActivity(playerId: string): Promise<void> {
    await prisma.player.update({
      where: { id: playerId },
      data: {
        lastOwnerActivityAt: new Date()
      }
    })
  }

  /**
   * Add a sitter for a player
   */
  static async addSitter(
    ownerId: string,
    sitterId: string,
    permissions: {
      canSendRaids: boolean
      canUseResources: boolean
      canBuyAndSpendGold: boolean
      canDemolishBuildings?: boolean
      canRecallReinforcements?: boolean
      canLaunchConquest?: boolean
      canDismissTroops?: boolean
    }
  ): Promise<Sitter> {
    // Validate that sitter is in the same tribe/confederacy
    const owner = await prisma.player.findUnique({
      where: { id: ownerId },
      include: { tribe: true }
    })

    const sitter = await prisma.player.findUnique({
      where: { id: sitterId },
      include: { tribe: true }
    })

    if (!owner || !sitter) {
      throw new Error("Player not found")
    }

    if (!owner.tribe || !sitter.tribe || owner.tribeId !== sitter.tribeId) {
      throw new Error("Sitter must be in the same tribe")
    }

    // Check if sitter limit reached (max 2)
    const activeSitters = await prisma.sitter.count({
      where: { ownerId, isActive: true }
    })

    if (activeSitters >= 2) {
      throw new Error("Maximum of 2 sitters allowed per player")
    }

    // Check if already a sitter
    const existingSitter = await prisma.sitter.findUnique({
      where: { ownerId_sitterId: { ownerId, sitterId } }
    })

    if (existingSitter) {
      // Reactivate if exists
      return await prisma.sitter.update({
        where: { id: existingSitter.id },
        data: {
          ...permissions,
          isActive: true,
          addedAt: new Date()
        }
      })
    }

    // Create new sitter
    return await prisma.sitter.create({
      data: {
        ownerId,
        sitterId,
        ...permissions
      }
    })
  }

  /**
   * Remove a sitter
   */
  static async removeSitter(ownerId: string, sitterId: string): Promise<void> {
    await prisma.sitter.updateMany({
      where: { ownerId, sitterId },
      data: { isActive: false }
    })
  }

  /**
   * Create a time-bound sitter session and return its record
   */
  static async beginSitterSession(params: {
    ownerId: string
    sitterId: string
    durationHours: number
    ipAddress?: string | null
    userAgent?: string | null
  }): Promise<SitterSession> {
    const sitRel = await prisma.sitter.findFirst({
      where: { ownerId: params.ownerId, sitterId: params.sitterId, isActive: true }
    })

    if (!sitRel) {
      throw new Error("Active sitter relationship not found")
    }

    const expiresAt = new Date(Date.now() + params.durationHours * 60 * 60 * 1000)
    const session = await prisma.sitterSession.create({
      data: {
        sitterRelId: sitRel.id,
        ownerId: params.ownerId,
        sitterId: params.sitterId,
        startedAt: new Date(),
        expiresAt,
        permissionSnapshot: {
          canSendRaids: sitRel.canSendRaids,
          canUseResources: sitRel.canUseResources,
          canBuyAndSpendGold: sitRel.canBuyAndSpendGold,
        },
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      }
    })

    // Notify tribe (if any) that sitting has begun
    try {
      const owner = await prisma.player.findUnique({ where: { id: params.ownerId }, include: { tribe: { include: { members: true } }, user: true } })
      const sitter = await prisma.player.findUnique({ where: { id: params.sitterId }, include: { user: true } })
      if (owner?.tribe) {
        const notifications = owner.tribe.members.map(member => ({
          senderId: owner.id,
          recipientId: member.id,
          type: "TRIBE_BROADCAST" as const,
          subject: "Sitting Activated",
          content: `${sitter?.playerName ?? "A player"} is now sitting for ${owner.playerName}.`,
        }))
        if (notifications.length) {
          await prisma.message.createMany({ data: notifications })
        }
      }
    } catch (e) {
      console.error("Failed to send tribe sitting notification", e)
    }

    return session
  }

  /**
   * Invite a dual
   */
  static async inviteDual(playerId: string, lobbyUserId: string, lobbyUsername: string): Promise<Dual> {
    // Check if dual already exists
    const existingDual = await prisma.dual.findFirst({
      where: {
        playerId,
        lobbyUserId,
        isActive: true
      }
    })

    if (existingDual) {
      throw new Error("Dual invitation already exists")
    }

    return await prisma.dual.create({
      data: {
        playerId,
        lobbyUserId,
        lobbyUsername
      }
    })
  }

  /**
   * Accept a dual invitation
   */
  static async acceptDual(playerId: string, lobbyUserId: string): Promise<Dual> {
    const dual = await prisma.dual.findFirst({
      where: {
        playerId,
        lobbyUserId,
        isActive: true,
        acceptedAt: null
      }
    })

    if (!dual) {
      throw new Error("Dual invitation not found")
    }

    return await prisma.dual.update({
      where: { id: dual.id },
      data: { acceptedAt: new Date() }
    })
  }

  /**
   * Remove a dual
   */
  static async removeDual(playerId: string, lobbyUserId: string): Promise<void> {
    await prisma.dual.updateMany({
      where: { playerId, lobbyUserId },
      data: { isActive: false }
    })
  }

  /**
   * Validate sitter permissions for an action
   */
  static async validateSitterPermissions(
    sitterId: string,
    ownerId: string,
    action:
      | 'sendRaids'
      | 'useResources'
      | 'buyAndSpendGold'
      | 'demolishBuildings'
      | 'recallReinforcements'
      | 'launchConquest'
      | 'dismissTroops'
  ): Promise<boolean> {
    const sitter = await prisma.sitter.findFirst({
      where: {
        sitterId,
        ownerId,
        isActive: true
      }
    })

    if (!sitter) {
      return false
    }

    switch (action) {
      case 'sendRaids':
        return sitter.canSendRaids
      case 'useResources':
        return sitter.canUseResources
      case 'buyAndSpendGold':
        return sitter.canBuyAndSpendGold
      case 'demolishBuildings':
        return sitter.canDemolishBuildings
      case 'recallReinforcements':
        return sitter.canRecallReinforcements
      case 'launchConquest':
        return sitter.canLaunchConquest
      case 'dismissTroops':
        return sitter.canDismissTroops
      default:
        return false
    }
  }

  /**
   * Check if a player can access another player's account as a sitter
   */
  static async canAccessAsSitter(sitterId: string, ownerId: string): Promise<boolean> {
    // Check if sitter relationship exists and is active
    const sitter = await prisma.sitter.findFirst({
      where: {
        sitterId,
        ownerId,
        isActive: true
      }
    })

    if (!sitter) {
      return false
    }

    // Check if owner's inactivity allowance is > 0
    const owner = await prisma.player.findUnique({
      where: { id: ownerId },
      select: { inactivityAllowanceDays: true }
    })

    return (owner?.inactivityAllowanceDays ?? 0) > 0
  }

  /**
   * Check if a lobby user can access a player account as a dual
   */
  static async canAccessAsDual(lobbyUserId: string, playerId: string): Promise<boolean> {
    const dual = await prisma.dual.findFirst({
      where: {
        lobbyUserId,
        playerId,
        isActive: true,
        acceptedAt: { not: null }
      }
    })

    return !!dual
  }

  /**
   * Validate dual access - ensure dual can only access one avatar per gameworld
   */
  static async validateDualAccess(lobbyUserId: string, playerId: string): Promise<{
    canAccess: boolean;
    reason?: string;
  }> {
    // Check if this dual relationship exists and is active
    const dual = await prisma.dual.findFirst({
      where: {
        lobbyUserId,
        playerId,
        isActive: true,
        acceptedAt: { not: null }
      },
      include: {
        player: {
          select: { gameWorldId: true }
        }
      }
    })

    if (!dual) {
      return { canAccess: false, reason: "Dual relationship not found or not accepted" }
    }

    // Check if this lobby user already has an active dual session in the same gameworld
    const existingDualInWorld = await prisma.dual.findFirst({
      where: {
        lobbyUserId,
        player: {
          gameWorldId: dual.player.gameWorldId
        },
        isActive: true,
        acceptedAt: { not: null },
        playerId: { not: playerId } // Exclude the current player
      }
    })

    if (existingDualInWorld) {
      return {
        canAccess: false,
        reason: "Dual can only access one avatar per gameworld"
      }
    }

    return { canAccess: true }
  }

  /**
   * Create a dual session token
   */
  static async createDualSession(lobbyUserId: string, playerId: string): Promise<{
    token: string;
    player: any;
  }> {
    // Validate dual access
    const validation = await this.validateDualAccess(lobbyUserId, playerId)
    if (!validation.canAccess) {
      throw new Error(validation.reason)
    }

    // Get player info
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: {
        user: true,
        villages: true
      }
    })

    if (!player) {
      throw new Error("Player not found")
    }

    // Create dual session token
    const { sign } = await import("jsonwebtoken")
    const dualToken = sign(
      {
        userId: lobbyUserId,
        playerId: playerId,
        isDual: true,
        dualFor: playerId
      },
      process.env.JWT_SECRET || "secret",
      { expiresIn: "24h" }
    )

    return {
      token: dualToken,
      player: {
        id: player.id,
        playerName: player.playerName,
        villages: player.villages.length
      }
    }
  }

  /** Log an account action (owner/sitter/dual) */
  static async logAction(params: {
    playerId: string
    actorType: AccountActorType
    actorUserId?: string | null
    actorPlayerId?: string | null
    actorLabel?: string | null
    action: string
    metadata?: any
    ipAddress?: string | null
    userAgent?: string | null
  }): Promise<void> {
    await prisma.accountActionLog.create({
      data: {
        playerId: params.playerId,
        actorType: params.actorType,
        actorUserId: params.actorUserId ?? null,
        actorPlayerId: params.actorPlayerId ?? null,
        actorLabel: params.actorLabel ?? null,
        action: params.action,
        metadata: params.metadata ?? null,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      }
    })
  }
}

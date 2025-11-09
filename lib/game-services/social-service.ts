import { prisma } from "@/lib/db"
import { FriendshipStatus, MentorshipStatus, EndorsementStatus, SocialActivityVisibility, SocialActivityType } from "@prisma/client"

export class SocialService {
  static async requestFriendship(requesterId: string, addresseeId: string) {
    if (requesterId === addresseeId) throw new Error("Cannot friend yourself")
    const existing = await prisma.playerFriendship.findFirst({
      where: {
        OR: [
          { requesterId, addresseeId },
          { requesterId: addresseeId, addresseeId: requesterId },
        ],
      },
    })
    if (existing) {
      if (existing.status === "ACCEPTED") return existing
      // Update to PENDING if previously declined/revoked
      return prisma.playerFriendship.update({
        where: { id: existing.id },
        data: { status: "PENDING", requestedAt: new Date(), respondedAt: null },
      })
    }
    return prisma.playerFriendship.create({
      data: { requesterId, addresseeId, status: FriendshipStatus.PENDING },
    })
  }

  static async acceptFriendship(addresseeId: string, requesterId: string) {
    const fr = await prisma.playerFriendship.findFirst({ where: { requesterId, addresseeId } })
    if (!fr) throw new Error("Request not found")
    return prisma.playerFriendship.update({ where: { id: fr.id }, data: { status: "ACCEPTED", respondedAt: new Date() } })
  }

  static async declineFriendship(addresseeId: string, requesterId: string) {
    const fr = await prisma.playerFriendship.findFirst({ where: { requesterId, addresseeId } })
    if (!fr) throw new Error("Request not found")
    return prisma.playerFriendship.update({ where: { id: fr.id }, data: { status: "DECLINED", respondedAt: new Date() } })
  }

  static async removeFriendship(aId: string, bId: string) {
    const fr = await prisma.playerFriendship.findFirst({
      where: {
        OR: [
          { requesterId: aId, addresseeId: bId },
          { requesterId: bId, addresseeId: aId },
        ],
      },
    })
    if (!fr) return null
    await prisma.playerFriendship.delete({ where: { id: fr.id } })
    return fr
  }

  static async upsertContactNote(ownerId: string, targetId: string, stance: string, note: string, tags: string[]) {
    if (!note.trim()) throw new Error("Note cannot be empty")
    return prisma.playerContactNote.upsert({
      where: { ownerId_targetId: { ownerId, targetId } },
      update: { stance: stance as any, note, tags },
      create: { ownerId, targetId, stance: stance as any, note, tags },
    })
  }

  static async toggleBlock(actorId: string, targetId: string, action: "BLOCK" | "UNBLOCK") {
    if (actorId === targetId) throw new Error("Cannot block yourself")
    const composite = { playerId: actorId, blockedPlayerId: targetId }
    if (action === "BLOCK") {
      return prisma.playerBlock.upsert({
        where: { playerId_blockedPlayerId: composite },
        update: {},
        create: composite,
      })
    }
    // UNBLOCK
    try {
      await prisma.playerBlock.delete({ where: { playerId_blockedPlayerId: composite } })
    } catch {
      // ignore
    }
    return { ok: true }
  }

  static async endorsementAction(actorId: string, targetId: string, action: "ENDORSE" | "REVOKE", message?: string, strength?: number) {
    if (actorId === targetId) throw new Error("Cannot endorse yourself")
    if (action === "ENDORSE") {
      return prisma.playerEndorsement.upsert({
        where: { endorserId_targetId: { endorserId: actorId, targetId } },
        update: { status: EndorsementStatus.PUBLISHED, message: message ?? null, strength: strength ?? 1 },
        create: { endorserId: actorId, targetId, status: EndorsementStatus.PUBLISHED, message: message ?? null, strength: strength ?? 1 },
      })
    }
    // REVOKE
    return prisma.playerEndorsement.update({
      where: { endorserId_targetId: { endorserId: actorId, targetId } },
      data: { status: EndorsementStatus.REVOKED },
    })
  }

  static async mentorshipAction(actorId: string, targetId: string, action: "REQUEST" | "ACCEPT" | "DECLINE" | "CANCEL" | "END") {
    if (actorId === targetId) throw new Error("Invalid mentorship action")
    if (action === "REQUEST") {
      return prisma.playerMentorship.upsert({
        where: { mentorId_menteeId: { mentorId: actorId, menteeId: targetId } } as any, // composite unique might not exist; fallback by query if needed
        update: { status: MentorshipStatus.PENDING },
        create: { mentorId: actorId, menteeId: targetId, status: MentorshipStatus.PENDING },
      })
    }
    // The remaining actions assume the viewer is the non-initiator
    const m = await prisma.playerMentorship.findFirst({
      where: {
        OR: [
          { mentorId: actorId, menteeId: targetId },
          { mentorId: targetId, menteeId: actorId },
        ],
      },
    })
    if (!m) throw new Error("Mentorship not found")
    switch (action) {
      case "ACCEPT":
        return prisma.playerMentorship.update({ where: { id: m.id }, data: { status: MentorshipStatus.ACTIVE, startedAt: new Date() } })
      case "DECLINE":
        return prisma.playerMentorship.update({ where: { id: m.id }, data: { status: MentorshipStatus.DECLINED } })
      case "CANCEL":
        await prisma.playerMentorship.delete({ where: { id: m.id } })
        return m
      case "END":
        return prisma.playerMentorship.update({ where: { id: m.id }, data: { status: MentorshipStatus.COMPLETED, completedAt: new Date() } })
      default:
        throw new Error("Unsupported action")
    }
  }

  static async postActivity(ownerId: string, actorId: string | null, type: SocialActivityType, visibility: SocialActivityVisibility, summary: string, payload?: Record<string, unknown>) {
    return prisma.playerSocialActivity.create({
      data: {
        playerId: ownerId,
        actorId,
        activityType: type,
        visibility,
        summary,
        payload: payload ?? {},
      },
    })
  }
}


import { prisma } from "@/lib/db"

export class MentorshipService {
  static async listMentors({ minPoints = 2000, limit = 20 }: { minPoints?: number; limit?: number } = {}) {
    const mentors = await prisma.player.findMany({
      where: { allowMentorship: true, totalPoints: { gte: minPoints }, isDeleted: false },
      select: { id: true, playerName: true, totalPoints: true },
      orderBy: { totalPoints: "desc" },
      take: limit,
    })
    const counts = await prisma.playerMentorship.groupBy({
      by: ["mentorId"],
      _count: true,
      where: { status: { in: ["PENDING", "ACTIVE"] } },
    })
    const countMap = new Map(counts.map((c) => [c.mentorId, c._count]))
    return mentors.map((m) => ({ ...m, activeMentees: countMap.get(m.id) ?? 0 }))
  }

  static async requestMentor(menteeId: string, preferredMentorId?: string) {
    const mentee = await prisma.player.findUnique({ where: { id: menteeId }, select: { id: true, totalPoints: true, userId: true } })
    if (!mentee) throw new Error("Mentee not found")

    let mentor = null as null | { id: string; playerName: string; userId: string | null }
    if (preferredMentorId) {
      mentor = await prisma.player.findUnique({ where: { id: preferredMentorId }, select: { id: true, playerName: true, userId: true } })
    }
    if (!mentor) {
      const list = await prisma.player.findMany({
        where: { allowMentorship: true, totalPoints: { gte: Math.max(2000, (mentee.totalPoints ?? 0) + 1000) }, isDeleted: false },
        select: { id: true, playerName: true, userId: true },
        orderBy: { totalPoints: "desc" },
        take: 50,
      })
      if (!list.length) throw new Error("No mentors available")
      mentor = list[Math.floor(Math.random() * list.length)]
    }

    const record = await prisma.playerMentorship.create({
      data: { mentorId: mentor.id, menteeId, status: "PENDING" },
    })

    // Notify both parties (best effort)
    try {
      const { NotificationService } = await import("@/lib/game-services/notification-service")
      await Promise.all([
        NotificationService.emit({
          playerId: mentor.id,
          type: "TRIBE_LEADERSHIP_MESSAGE",
          priority: "MEDIUM",
          title: "New mentee request",
          message: "A new player requested your mentorship. Review in the Mentorship panel.",
          actionUrl: "/mentor",
          metadata: { mentorshipId: record.id },
        }),
        NotificationService.emit({
          playerId: mentee.id,
          type: "TRIBE_LEADERSHIP_MESSAGE",
          priority: "LOW",
          title: "Mentor request sent",
          message: `We contacted ${mentor.playerName}. You'll be notified when they accept.",
          actionUrl: "/mentor",
          metadata: { mentorshipId: record.id },
        }),
      ])
    } catch {}

    return record
  }

  static async setMentorOptIn(playerId: string, allow: boolean) {
    return prisma.player.update({ where: { id: playerId }, data: { allowMentorship: allow } })
  }

  static async accept(mentorshipId: string, mentorId: string) {
    const ms = await prisma.playerMentorship.findUnique({ where: { id: mentorshipId } })
    if (!ms || ms.mentorId !== mentorId) throw new Error("Mentorship not found")
    return prisma.playerMentorship.update({ where: { id: mentorshipId }, data: { status: "ACTIVE", startedAt: new Date() } })
  }

  static async decline(mentorshipId: string, mentorId: string) {
    const ms = await prisma.playerMentorship.findUnique({ where: { id: mentorshipId } })
    if (!ms || ms.mentorId !== mentorId) throw new Error("Mentorship not found")
    return prisma.playerMentorship.update({ where: { id: mentorshipId }, data: { status: "REJECTED" as any } })
  }
}


import { prisma } from "@/lib/db"
import { AllianceMemberState } from "@prisma/client"

const ACTIVE_MEMBER_STATES: AllianceMemberState[] = ["ACTIVE", "PROBATION"]

export class DiplomacyService {
  static async arePlayersAtWar(playerAId: string, playerBId: string): Promise<boolean> {
    if (playerAId === playerBId) return false

    const memberships = await prisma.allianceMember.findMany({
      where: {
        playerId: { in: [playerAId, playerBId] },
        state: { in: ACTIVE_MEMBER_STATES },
      },
      select: {
        playerId: true,
        allianceId: true,
      },
    })

    const membershipMap = new Map(memberships.map((entry) => [entry.playerId, entry]))
    const memberA = membershipMap.get(playerAId)
    const memberB = membershipMap.get(playerBId)

    if (!memberA?.allianceId || !memberB?.allianceId) {
      return false
    }
    if (memberA.allianceId === memberB.allianceId) {
      return false
    }

    const warSnapshot = await prisma.allianceDiplomacySnapshot.findFirst({
      where: {
        relationType: "WAR",
        OR: [
          {
            allianceId: memberA.allianceId,
            targetAllianceId: memberB.allianceId,
          },
          {
            allianceId: memberB.allianceId,
            targetAllianceId: memberA.allianceId,
          },
        ],
      },
      orderBy: { createdAt: "desc" },
    })

    return !!warSnapshot
  }
}

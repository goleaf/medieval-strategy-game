import { prisma } from "@/lib/db";

export class AllianceService {
  /**
   * Get alliance bonuses for a player (Reign of Fire feature)
   */
  static async getPlayerAllianceBonuses(playerId: string): Promise<{
    commerceBonus: number; // Market/trade bonuses
    philosophyBonus: number; // Culture/research bonuses
  }> {
    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { tribe: true }
    });

    if (!player?.tribe) {
      return { commerceBonus: 0, philosophyBonus: 0 };
    }

    // Find active alliances for this player's tribe
    const alliances = await prisma.alliance.findMany({
      where: {
        OR: [
          { tribe1Id: player.tribe.id },
          { tribe2Id: player.tribe.id }
        ],
        OR: [
          { endsAt: null }, // Permanent alliances
          { endsAt: { gt: new Date() } } // Active temporary alliances
        ]
      },
      include: {
        tribe1: { include: { members: true } },
        tribe2: { include: { members: true } },
      }
    });

    if (alliances.length === 0) {
      return { commerceBonus: 0, philosophyBonus: 0 };
    }

    // Calculate bonuses based on alliance size
    let totalAllianceMembers = 0;

    for (const alliance of alliances) {
      totalAllianceMembers += alliance.tribe1.members.length;
      totalAllianceMembers += alliance.tribe2.members.length;
    }

    // Bonuses scale with alliance size (Reign of Fire mechanics)
    // Commerce bonus: +2% per alliance member (max +20%)
    // Philosophy bonus: +1% per alliance member (max +10%)
    const commerceBonus = Math.min(totalAllianceMembers * 2, 20);
    const philosophyBonus = Math.min(totalAllianceMembers * 1, 10);

    return { commerceBonus, philosophyBonus };
  }

  /**
   * Apply alliance bonuses to market prices (commerce bonus)
   */
  static applyCommerceBonus(basePrice: number, commerceBonus: number): number {
    // Commerce bonus reduces market fees by the bonus percentage
    const feeReduction = (commerceBonus / 100);
    return Math.max(0, basePrice * (1 - feeReduction));
  }

  /**
   * Apply alliance bonuses to culture point production (philosophy bonus)
   */
  static applyPhilosophyBonus(baseCulturePoints: number, philosophyBonus: number): number {
    // Philosophy bonus increases culture point production
    return baseCulturePoints * (1 + philosophyBonus / 100);
  }

  /**
   * Check if two players are in the same alliance
   */
  static async areAllied(playerId1: string, playerId2: string): Promise<boolean> {
    if (playerId1 === playerId2) return true;

    const player1 = await prisma.player.findUnique({
      where: { id: playerId1 },
      include: { tribe: true }
    });

    const player2 = await prisma.player.findUnique({
      where: { id: playerId2 },
      include: { tribe: true }
    });

    if (!player1?.tribe || !player2?.tribe) return false;

    const alliance = await prisma.alliance.findFirst({
      where: {
        OR: [
          { tribe1Id: player1.tribe.id, tribe2Id: player2.tribe.id },
          { tribe1Id: player2.tribe.id, tribe2Id: player1.tribe.id }
        ],
        OR: [
          { endsAt: null },
          { endsAt: { gt: new Date() } }
        ]
      }
    });

    return !!alliance;
  }

  /**
   * Get alliance statistics for a player
   */
  static async getAllianceStats(playerId: string): Promise<{
    isAllied: boolean;
    allianceSize: number;
    commerceBonus: number;
    philosophyBonus: number;
    allies: string[];
  }> {
    const bonuses = await this.getPlayerAllianceBonuses(playerId);

    if (bonuses.commerceBonus === 0 && bonuses.philosophyBonus === 0) {
      return {
        isAllied: false,
        allianceSize: 0,
        commerceBonus: 0,
        philosophyBonus: 0,
        allies: []
      };
    }

    const player = await prisma.player.findUnique({
      where: { id: playerId },
      include: { tribe: true }
    });

    if (!player?.tribe) {
      return {
        isAllied: false,
        allianceSize: 0,
        commerceBonus: 0,
        philosophyBonus: 0,
        allies: []
      };
    }

    const alliances = await prisma.alliance.findMany({
      where: {
        OR: [
          { tribe1Id: player.tribe.id },
          { tribe2Id: player.tribe.id }
        ],
        OR: [
          { endsAt: null },
          { endsAt: { gt: new Date() } }
        ]
      },
      include: {
        tribe1: { include: { members: { include: { player: true } } } },
        tribe2: { include: { members: { include: { player: true } } } },
      }
    });

    const allies: string[] = [];
    let allianceSize = 0;

    for (const alliance of alliances) {
      alliance.tribe1.members.forEach(member => {
        if (member.playerId !== playerId) {
          allies.push(member.player.playerName);
          allianceSize++;
        }
      });

      alliance.tribe2.members.forEach(member => {
        if (member.playerId !== playerId) {
          allies.push(member.player.playerName);
          allianceSize++;
        }
      });
    }

    return {
      isAllied: true,
      allianceSize,
      commerceBonus: bonuses.commerceBonus,
      philosophyBonus: bonuses.philosophyBonus,
      allies: [...new Set(allies)] // Remove duplicates
    };
  }
}

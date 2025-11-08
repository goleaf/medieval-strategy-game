import { AlliancePermissionKey } from "./permissions";

export interface AllianceRankDefinition {
  name: string;
  weight: number;
  canLead: boolean;
  isDefault?: boolean;
  permissions: AlliancePermissionKey[];
}

export const baseRankTemplate: Record<string, AllianceRankDefinition> = {
  leader: {
    name: "Leader",
    weight: 100,
    canLead: true,
    permissions: [
      "alliances.manage_governance",
      "alliances.manage_ranks",
      "alliances.invite",
      "alliances.review_applications",
      "alliances.manage_forums",
      "alliances.send_announcements",
      "alliances.manage_squads",
      "alliances.audit_view",
      "alliances.audit_sensitive",
      "alliances.moderate_forum",
      "alliances.moderate_members",
      "alliances.manage_diplomacy"
    ]
  },
  council: {
    name: "Council",
    weight: 80,
    canLead: true,
    permissions: [
      "alliances.manage_governance",
      "alliances.manage_ranks",
      "alliances.invite",
      "alliances.review_applications",
      "alliances.manage_forums",
      "alliances.send_announcements",
      "alliances.manage_squads",
      "alliances.audit_view",
      "alliances.moderate_forum",
      "alliances.manage_diplomacy"
    ]
  },
  captain: {
    name: "Captain",
    weight: 60,
    canLead: false,
    permissions: [
      "alliances.invite",
      "alliances.review_applications",
      "alliances.manage_squads",
      "alliances.send_announcements",
      "alliances.moderate_members"
    ]
  },
  member: {
    name: "Member",
    weight: 10,
    canLead: false,
    isDefault: true,
    permissions: []
  }
};

export function createDefaultRanks(): AllianceRankDefinition[] {
  return Object.values(baseRankTemplate);
}

export function computeInheritedPermissions(
  rank: AllianceRankDefinition,
  inherited: AlliancePermissionKey[] = []
): AlliancePermissionKey[] {
  const merged = new Set([...inherited, ...rank.permissions]);
  return Array.from(merged);
}

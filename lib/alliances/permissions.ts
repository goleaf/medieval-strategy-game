export type AlliancePermissionKey =
  | "alliances.manage_governance"
  | "alliances.invite"
  | "alliances.review_applications"
  | "alliances.manage_ranks"
  | "alliances.manage_forums"
  | "alliances.send_announcements"
  | "alliances.manage_squads"
  | "alliances.audit_view"
  | "alliances.audit_sensitive"
  | "alliances.moderate_forum"
  | "alliances.moderate_members"
  | "alliances.manage_diplomacy";

export interface AlliancePermissionDefinition {
  key: AlliancePermissionKey;
  label: string;
  description: string;
  category: "Governance" | "Recruitment" | "Military" | "Diplomacy" | "Communications" | "Moderation" | "Security";
}

const catalog: AlliancePermissionDefinition[] = [
  {
    key: "alliances.manage_governance",
    label: "Manage Leadership",
    description: "Transfer leadership, configure guardrails, and adjust governance presets",
    category: "Governance"
  },
  {
    key: "alliances.invite",
    label: "Invite Members",
    description: "Send invites and manage invite quotas",
    category: "Recruitment"
  },
  {
    key: "alliances.review_applications",
    label: "Review Applications",
    description: "Access application queue, respond with canned replies, and schedule reminders",
    category: "Recruitment"
  },
  {
    key: "alliances.manage_ranks",
    label: "Edit Ranks",
    description: "Create, clone, and delete ranks plus adjust permission templates",
    category: "Governance"
  },
  {
    key: "alliances.manage_forums",
    label: "Configure Forums",
    description: "Create boards, adjust visibility, and manage performance levers",
    category: "Communications"
  },
  {
    key: "alliances.send_announcements",
    label: "Send Announcements",
    description: "Compose announcements, set quiet hours, and trigger overrides",
    category: "Communications"
  },
  {
    key: "alliances.manage_squads",
    label: "Manage Squads",
    description: "Create squads, assign members, and configure squad-specific boards",
    category: "Military"
  },
  {
    key: "alliances.audit_view",
    label: "View Audit Logs",
    description: "View alliance audit logs with standard data",
    category: "Security"
  },
  {
    key: "alliances.audit_sensitive",
    label: "View Sensitive Audit Logs",
    description: "View IP/device details in the audit explorer",
    category: "Security"
  },
  {
    key: "alliances.moderate_forum",
    label: "Moderate Forum",
    description: "Pin, lock, move, merge, and delete threads or posts",
    category: "Moderation"
  },
  {
    key: "alliances.moderate_members",
    label: "Moderate Members",
    description: "Apply mutes, probation extensions, or bans",
    category: "Moderation"
  },
  {
    key: "alliances.manage_diplomacy",
    label: "Manage Diplomacy",
    description: "Create diplomacy snapshots and control visibility",
    category: "Diplomacy"
  }
];

export function getPermissionCatalog(): AlliancePermissionDefinition[] {
  return catalog;
}

export function groupPermissionsByCategory(): Record<string, AlliancePermissionDefinition[]> {
  return catalog.reduce<Record<string, AlliancePermissionDefinition[]>>((acc, perm) => {
    acc[perm.category] = acc[perm.category] || [];
    acc[perm.category].push(perm);
    return acc;
  }, {});
}

export interface BoardVisibilityRule {
  ranks?: string[];
  squads?: string[];
  allowlist?: string[];
}

export interface BoardConfig {
  name: string;
  description?: string;
  visibility: "ALL" | "MEMBERSHIP_RANK" | "SQUAD" | "ALLOWLIST";
  rules: BoardVisibilityRule;
  pinLimit: number;
  archiveAfterDays?: number;
  quotaPerDay?: number;
}

export const defaultBoards: BoardConfig[] = [
  {
    name: "Announcements",
    description: "System announcements and leadership posts",
    visibility: "ALL",
    rules: {},
    pinLimit: 3
  },
  {
    name: "Strategy",
    description: "Operations planning",
    visibility: "MEMBERSHIP_RANK",
    rules: { ranks: ["Leader", "Council", "Captain"] },
    pinLimit: 5,
    quotaPerDay: 20
  },
  {
    name: "Diplomacy",
    description: "External relations",
    visibility: "ALLOWLIST",
    rules: { ranks: ["Leader", "Council", "Diplomat"] },
    pinLimit: 5
  }
];

export function createBoard(config: BoardConfig): BoardConfig {
  if (config.pinLimit < 1 || config.pinLimit > 10) {
    throw new Error("Pin limit must be between 1 and 10");
  }
  return config;
}

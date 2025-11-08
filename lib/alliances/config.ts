import { z } from "zod";

export const allianceConfigSchema = z.object({
  creationCost: z.object({
    wood: z.number().nonnegative(),
    clay: z.number().nonnegative(),
    iron: z.number().nonnegative(),
    crop: z.number().nonnegative()
  }),
  probationLengthHours: z.number().min(12).max(168),
  cooldownBetweenCreationsHours: z.number().min(24).max(336),
  maxMembers: z.number().min(20).max(75),
  softCapWarning: z.number().min(15).max(70),
  allowMultiAllianceMembership: z.boolean(),
  creationQuestRequirement: z.enum([
    "TUTORIAL_COMPLETE",
    "ADVANCED_ADMINISTRATION",
    "WONDER_ACCESS"
  ]),
  disbandDebtLimit: z.number().min(0).max(200_000),
  inactiveLeaderTimeoutHours: z.number().min(48).max(240),
  announcementQuietHours: z.string().regex(/^(\d{2}:\d{2})-(\d{2}:\d{2})|disabled$/),
  questionnaireTemplates: z.array(z.string()),
  autoSeedForumPreset: z.string(),
  maxConcurrentInvitesMultiplier: z.number().min(1).max(3),
  maxPendingApplications: z.number().min(10).max(250)
});

export type AllianceWorldConfig = z.infer<typeof allianceConfigSchema>;

export const defaultAllianceConfig: AllianceWorldConfig = {
  creationCost: { wood: 450_000, clay: 450_000, iron: 450_000, crop: 250_000 },
  probationLengthHours: 72,
  cooldownBetweenCreationsHours: 168,
  maxMembers: 60,
  softCapWarning: 54,
  allowMultiAllianceMembership: false,
  creationQuestRequirement: "ADVANCED_ADMINISTRATION",
  disbandDebtLimit: 50_000,
  inactiveLeaderTimeoutHours: 120,
  announcementQuietHours: "22:00-08:00",
  questionnaireTemplates: ["ONBOARDING_V1", "RAID_FOCUS", "DEFENSE_SPECIALISTS"],
  autoSeedForumPreset: "DEFAULT_GLOBAL",
  maxConcurrentInvitesMultiplier: 1.5,
  maxPendingApplications: 100
};

export function resolveAllianceConfig(
  overrides: Partial<AllianceWorldConfig> | null | undefined
): AllianceWorldConfig {
  const payload = { ...defaultAllianceConfig, ...overrides };
  return allianceConfigSchema.parse(payload);
}

export function pendingInviteLimit(config: AllianceWorldConfig, memberCount: number): number {
  const multiplier = config.maxConcurrentInvitesMultiplier;
  return Math.ceil(Math.max(memberCount, 1) * multiplier);
}

export function quietHoursToRange(config: AllianceWorldConfig): [string, string] | null {
  if (config.announcementQuietHours === "disabled") {
    return null;
  }
  const [start, end] = config.announcementQuietHours.split("-");
  return [start, end];
}

export interface AllianceEligibilityInput {
  hasCompletedQuest: "TUTORIAL_COMPLETE" | "ADVANCED_ADMINISTRATION" | "WONDER_ACCESS";
  playerLevel: number;
  cooldownHoursRemaining: number;
  outstandingDebt: number;
}

export function canCreateAlliance(
  input: AllianceEligibilityInput,
  requiredQuest: AllianceEligibilityInput["hasCompletedQuest"],
  debtLimit: number
): boolean {
  if (input.outstandingDebt > debtLimit) return false;
  if (input.cooldownHoursRemaining > 0) return false;
  const priority = ["TUTORIAL_COMPLETE", "ADVANCED_ADMINISTRATION", "WONDER_ACCESS"];
  const playerIndex = priority.indexOf(input.hasCompletedQuest);
  const requirementIndex = priority.indexOf(requiredQuest);
  return playerIndex >= requirementIndex && input.playerLevel >= 5;
}

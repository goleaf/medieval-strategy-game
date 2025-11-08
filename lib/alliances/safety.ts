type GuardrailWarning = {
  code: "ORPHANED_LEADER" | "PRIVILEGE_ESCALATION" | "INSUFFICIENT_SUCCESSORS";
  message: string;
};

interface SimulationInput {
  currentLeaders: number;
  proposedLeaders: number;
  memberCount: number;
  hardCap: number;
}

export function simulateLeadershipChange(input: SimulationInput): GuardrailWarning[] {
  const warnings: GuardrailWarning[] = [];
  if (input.proposedLeaders === 0) {
    warnings.push({ code: "ORPHANED_LEADER", message: "At least one leader is required." });
  }
  if (input.proposedLeaders < 2 && input.memberCount > input.hardCap - 5) {
    warnings.push({
      code: "INSUFFICIENT_SUCCESSORS",
      message: "Large alliances need at least two leaders near the hard cap."
    });
  }
  if (input.proposedLeaders > input.currentLeaders + 3) {
    warnings.push({
      code: "PRIVILEGE_ESCALATION",
      message: "Too many leadership promotions in a single change."
    });
  }
  return warnings;
}

export function assertNoBlockingWarnings(warnings: GuardrailWarning[]) {
  const blockers = warnings.filter(warning => warning.code !== "INSUFFICIENT_SUCCESSORS");
  if (blockers.length > 0) {
    throw new Error(blockers.map(w => w.message).join("\n"));
  }
}

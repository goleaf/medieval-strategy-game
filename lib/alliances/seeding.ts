import { createDefaultRanks } from "./ranks";
import { defaultBoards } from "./forums";

export interface AllianceSeedPlan {
  ranks: ReturnType<typeof createDefaultRanks>;
  boards: typeof defaultBoards;
  squads: Array<{ name: string; type: string; isDefault: boolean }>;
  motd: string;
}

export function createSeedPlan(): AllianceSeedPlan {
  return {
    ranks: createDefaultRanks(),
    boards: defaultBoards,
    squads: [
      { name: "Defense", type: "DEFENSE", isDefault: true },
      { name: "Offense", type: "OFFENSE", isDefault: true }
    ],
    motd: "Welcome to your new alliance. Configure ranks, review applicants, and set your story."
  };
}

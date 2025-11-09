import { AchievementCategory, AchievementProgressMode } from "@prisma/client"

export type AchievementDef = {
  key: string
  title: string
  description?: string
  category: AchievementCategory
  mode?: AchievementProgressMode
  target: number
  reward?: {
    premiumPoints?: number
    badgeKey?: string
    title?: string
  }
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // Economic
  { key: "econ_total_production_1k", title: "Budding Economy", description: "Produce 1,000 total resources", category: AchievementCategory.ECONOMIC, target: 1_000, reward: { premiumPoints: 5, badgeKey: "econ_1k" } },
  { key: "econ_total_production_10k", title: "Growing Industry", description: "Produce 10,000 total resources", category: AchievementCategory.ECONOMIC, target: 10_000, reward: { premiumPoints: 10, badgeKey: "econ_10k" } },
  { key: "econ_total_production_100k", title: "Thriving Empire", description: "Produce 100,000 total resources", category: AchievementCategory.ECONOMIC, target: 100_000, reward: { premiumPoints: 25, badgeKey: "econ_100k" } },
  { key: "econ_building_lvl30", title: "Master of Harvest", description: "Reach level 30 in any resource building", category: AchievementCategory.ECONOMIC, target: 30 },
  { key: "econ_villages_owned_5", title: "Regional Power", description: "Own 5 villages simultaneously", category: AchievementCategory.ECONOMIC, target: 5 },
  { key: "econ_trades_completed_20", title: "Trusted Trader", description: "Complete 20 trades", category: AchievementCategory.ECONOMIC, target: 20 },
  { key: "econ_single_village_stock_50k", title: "Overflowing Storehouses", description: "Accumulate 50,000 resources in a single village", category: AchievementCategory.ECONOMIC, target: 50_000 },

  // Military
  { key: "mil_units_trained_1000", title: "Quartermaster", description: "Train 1,000 units", category: AchievementCategory.MILITARY, target: 1_000 },
  { key: "mil_units_destroyed_1000", title: "Battle Proven", description: "Destroy 1,000 enemy units", category: AchievementCategory.MILITARY, target: 1_000 },
  { key: "mil_attacks_won_10", title: "Relentless Raider", description: "Win 10 attacks", category: AchievementCategory.MILITARY, target: 10 },
  { key: "mil_od_rank_top100", title: "Feared Commander", description: "Reach OD rank Top 100", category: AchievementCategory.MILITARY, target: 100, mode: AchievementProgressMode.MANUAL },
  { key: "mil_conquests_1", title: "First Conquest", description: "Conquer your first village", category: AchievementCategory.MILITARY, target: 1 },
  { key: "mil_conquests_5", title: "Growing Banner", description: "Conquer 5 villages", category: AchievementCategory.MILITARY, target: 5 },
  { key: "mil_conquests_10", title: "Warlord", description: "Conquer 10 villages", category: AchievementCategory.MILITARY, target: 10 },
  { key: "mil_conquests_25", title: "Conqueror", description: "Conquer 25 villages", category: AchievementCategory.MILITARY, target: 25 },
  { key: "mil_defend_noble", title: "Noble Slayer", description: "Successfully defend against a nobleman attack", category: AchievementCategory.MILITARY, target: 1 },

  // Social
  { key: "soc_join_tribe", title: "United Colors", description: "Join a tribe", category: AchievementCategory.SOCIAL, target: 1 },
  { key: "soc_founder", title: "Founder", description: "Become a tribe founder", category: AchievementCategory.SOCIAL, target: 1 },
  { key: "soc_recruit_5", title: "Recruiter", description: "Recruit 5 members to your tribe", category: AchievementCategory.SOCIAL, target: 5 },
  { key: "soc_diplomacy", title: "Diplomat", description: "Maintain diplomatic relations", category: AchievementCategory.SOCIAL, target: 1, mode: AchievementProgressMode.MANUAL },
  { key: "soc_tribal_warfare", title: "War Council", description: "Participate in tribal warfare", category: AchievementCategory.SOCIAL, target: 1 },

  // Progression
  { key: "prog_points_1k", title: "Rising", description: "Reach 1,000 points", category: AchievementCategory.PROGRESSION, target: 1_000 },
  { key: "prog_points_10k", title: "Established", description: "Reach 10,000 points", category: AchievementCategory.PROGRESSION, target: 10_000 },
  { key: "prog_points_100k", title: "Renowned", description: "Reach 100,000 points", category: AchievementCategory.PROGRESSION, target: 100_000 },
  { key: "prog_points_1m", title: "Legend", description: "Reach 1,000,000 points", category: AchievementCategory.PROGRESSION, target: 1_000_000 },
  { key: "prog_rank_top1000", title: "Top 1000", description: "Reach Top 1000 rank", category: AchievementCategory.PROGRESSION, target: 1000, mode: AchievementProgressMode.MANUAL },
  { key: "prog_rank_top100", title: "Top 100", description: "Reach Top 100 rank", category: AchievementCategory.PROGRESSION, target: 100, mode: AchievementProgressMode.MANUAL },
  { key: "prog_rank_top10", title: "Top 10", description: "Reach Top 10 rank", category: AchievementCategory.PROGRESSION, target: 10, mode: AchievementProgressMode.MANUAL },
  { key: "prog_rank_1", title: "Number One", description: "Reach Rank 1", category: AchievementCategory.PROGRESSION, target: 1, mode: AchievementProgressMode.MANUAL },
  { key: "prog_survive_7d", title: "Enduring", description: "Survive 7 days", category: AchievementCategory.PROGRESSION, target: 7 },
  { key: "prog_beginner_complete", title: "Graduated", description: "Complete beginner protection", category: AchievementCategory.PROGRESSION, target: 1 },

  // Special
  { key: "spec_conquer_barbarian", title: "Tamer of Wilds", description: "Conquer a barbarian village", category: AchievementCategory.SPECIAL, target: 1 },
  { key: "spec_solo_conquer", title: "Lone Banner", description: "Solo conquer without tribal help", category: AchievementCategory.SPECIAL, target: 1 },
  { key: "spec_win_against_odds", title: "Against All Odds", description: "Win a battle with an outnumbered army", category: AchievementCategory.SPECIAL, target: 1 },
  { key: "spec_noble_snipe", title: "Noble Snipe", description: "Kill an attacking nobleman", category: AchievementCategory.SPECIAL, target: 1 },
]


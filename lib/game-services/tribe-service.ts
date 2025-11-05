import type { GameTribe, TroopType, BuildingType } from "@prisma/client"

export interface TribeData {
  name: string
  description: string
  troops: TroopType[]
  buildings: BuildingType[]
  specialFeatures: {
    name: string
    description: string
  }[]
  playstyle: string
  strengths: string[]
  weaknesses: string[]
}

export const TRIBE_DATA: Record<GameTribe, TribeData> = {
  ROMANS: {
    name: "Romans",
    description: "A disciplined and advanced civilization known for their social organization, technological achievements, and elite troops.",
    troops: ["LEGIONNAIRE", "PRAETORIAN", "IMPERIAN", "SENATOR", "KNIGHT", "NOBLEMAN"],
    buildings: ["CITY_WALL", "HORSE_DRINKING_TROUGH"],
    specialFeatures: [
      {
        name: "Simultaneous Construction",
        description: "Can build one resource field and one building at the same time."
      },
      {
        name: "City Wall",
        description: "Provides the highest defense bonus of all tribes."
      },
      {
        name: "Merchants",
        description: "Carry 500 resources at 16 fields/hour."
      }
    ],
    playstyle: "The Romans are ideal for new players who prefer balanced gameplay and want to learn both offense and defense effectively. Focus on infantry strength for both offense and defense early in the game.",
    strengths: [
      "Strong infantry for both offense and defense",
      "Best defensive wall in the game",
      "Balanced army composition",
      "Great for beginners learning the game"
    ],
    weaknesses: [
      "High costs and long training times",
      "Lower cavalry defense against mounted units",
      "Requires careful resource management"
    ]
  },
  TEUTONS: {
    name: "Teutons",
    description: "The most aggressive and fearless of all tribes. Their warriors are infamous for their rage in battle and relentless pillage raids.",
    troops: ["CLUBSWINGER", "SPEARMAN_TEUTONIC", "AXEMAN", "SCOUT", "PALADIN_TEUTONIC", "TEUTONIC_KNIGHT", "CHIEF"],
    buildings: ["EARTH_WALL", "BREWERY"],
    specialFeatures: [
      {
        name: "Earth Wall",
        description: "Nearly indestructible, but provides only a small defensive bonus."
      },
      {
        name: "Brewery",
        description: "Increases attacking strength of Teutonic troops. Cannot build Residence, Palace, or Command Center in the same village."
      },
      {
        name: "Merchants",
        description: "Can carry 1,000 resources at 12 fields/hour."
      },
      {
        name: "Chief",
        description: "Lowers enemy village loyalty by 20-25%."
      },
      {
        name: "Hero Bonus",
        description: "+20% Cranny dip (Plunder bonus) for all troops attacking with the hero."
      }
    ],
    playstyle: "Focus on raiding early and often — your troops are cheap, expendable, and perfect for resource theft. Use your Brewery to increase your attack power when planning major assaults. Your Earth Wall is hard to destroy but offers limited defense — rely on offense, not fortifications.",
    strengths: [
      "Cheap and fast troops",
      "Best raiders in the game",
      "Strong early aggression",
      "High carrying capacity",
      "Excellent plunder bonuses"
    ],
    weaknesses: [
      "Weak defense and slower units",
      "Struggles in prolonged defensive wars",
      "Limited building options when Brewery is built"
    ]
  },
  GAULS: {
    name: "Gauls",
    description: "The Gauls are a versatile and defensive-focused tribe known for their druidic traditions and powerful siege weapons.",
    troops: [], // TODO: Implement Gaul troops
    buildings: [], // TODO: Implement Gaul buildings
    specialFeatures: [
      {
        name: "Pathfinder",
        description: "Fast movement and excellent scouting capabilities."
      },
      {
        name: "Druidrider",
        description: "Special mounted units with defensive bonuses."
      }
    ],
    playstyle: "Gauls excel at hit-and-run tactics and defensive warfare.",
    strengths: ["Strong defense", "Excellent pathfinders", "Powerful siege weapons"],
    weaknesses: ["Slower troop production", "High resource costs"]
  },
  HUNS: {
    name: "Huns",
    description: "The Huns are a fierce, cavalry-focused tribe known for their speed, aggression, and devastating raids.",
    troops: ["STEPPE_ARCHER", "HUN_WARRIOR", "LOGADES"] as TroopType[],
    buildings: ["COMMAND_CENTER", "MAKEShift_WALL"] as BuildingType[],
    specialFeatures: [
      {
        name: "Cavalry Power",
        description: "The Huns have fast and powerful mounted units, ideal for aggressive tactics."
      },
      {
        name: "Makeshift Wall",
        description: "Provides weak defensive bonuses, so it should not be relied upon."
      },
      {
        name: "Logades",
        description: "Administrator unit that lowers enemy village loyalty by 15-30%."
      },
      {
        name: "Command Center",
        description: "Expands settlement options and improves village management."
      }
    ],
    playstyle: "Focus on offense and raiding — the Huns thrive on quick strikes and resource raids. Maintain strong alliances for defense; their units are not designed for holding ground.",
    strengths: [
      "Lightning-fast cavalry with high mobility",
      "Exceptional offensive capability and raiding potential",
      "Strong hit-and-run tactics",
      "Loyalty reduction capabilities"
    ],
    weaknesses: [
      "Poor defensive capabilities",
      "Weak wall protection",
      "Reliance on teamwork for village defense"
    ]
  },
  EGYPTIANS: {
    name: "Egyptians",
    description: "The Egyptians are master builders and economic experts, famed for their monumental pyramids and ingenious use of the River Nile to improve agriculture. Their civilization thrives on organization and efficiency, making them one of the strongest tribes in terms of resource production and defense.",
    troops: [
      { name: "Nubian", attack: 8, defense: 12, speed: 6, health: 90 },
      { name: "Mummy", attack: 10, defense: 18, speed: 4, health: 120 },
      { name: "Anubite", attack: 15, defense: 25, speed: 5, health: 160 },
      { name: "Pharaoh", attack: 25, defense: 35, speed: 6, health: 220 },
      { name: "Nomarch", attack: 45, defense: 30, speed: 6, health: 350 }
    ],
    buildings: [
      { name: "Stone Wall", description: "Extremely durable defensive wall with 25% higher defense bonus and 50% damage resistance." },
      { name: "Waterworks", description: "Increases oasis bonuses, boosting resource production across the empire." }
    ],
    specialFeatures: [
      {
        name: "Stone Wall",
        description: "Extremely durable and difficult to destroy - provides 25% higher defense bonus and takes 50% less siege damage."
      },
      {
        name: "Waterworks",
        description: "Increases oasis bonuses, boosting resource production by 3 per level for all resources."
      },
      {
        name: "Nomarch",
        description: "Egyptian administrator; lowers enemy village loyalty by 20-25% during conquest attacks."
      },
      {
        name: "Merchants",
        description: "Carry 750 resources at 16 fields/hour."
      },
      {
        name: "Hero Bonus",
        description: "Grants increased resource production across the empire."
      }
    ],
    playstyle: "Egyptians focus on resource production and defense. Build strong defenses to make the most of your durable Stone Wall. Use your economic advantage to support allies with resources or reinforcements. Avoid relying too much on offense - Egyptian troops are not built for aggressive warfare.",
    strengths: ["Strong economy", "Durable defenses", "Excellent support potential", "Cheap and fast-training basic units"],
    weaknesses: ["Weak offense", "Limited mobility compared to other tribes"]
  },
  SPARTANS: {
    name: "Spartans",
    description: "The Spartans are a disciplined warrior tribe known for their unbreakable defense and tactical superiority.",
    troops: [], // TODO: Implement Spartan troops
    buildings: [], // TODO: Implement Spartan buildings
    specialFeatures: [
      {
        name: "Spartan Training",
        description: "Elite warriors with exceptional defensive capabilities."
      }
    ],
    playstyle: "Spartans focus on unbreakable defense and counter-attacks.",
    strengths: ["Superior defense", "Tactical warfare", "Elite troops"],
    weaknesses: ["Slow troop production", "Limited offensive capabilities"]
  },
  VIKINGS: {
    name: "Vikings",
    description: "The Vikings are fierce Norse warriors known for their berserker rage and naval superiority.",
    troops: ["BERSERKER", "VALKYRIES_BLESSING", "JARL"],
    buildings: ["HARBOR", "BARRICADE"],
    specialFeatures: [
      {
        name: "Berserker Rage",
        description: "Special units that become more powerful as they take damage."
      },
      {
        name: "Valkyrie's Blessing",
        description: "Mythical units with enhanced combat abilities."
      },
      {
        name: "Harbor",
        description: "Allows construction of naval units and faster overseas movement."
      }
    ],
    playstyle: "Vikings excel at naval warfare and berserker charges. Use their rage ability wisely in combat.",
    strengths: ["Naval superiority", "Berserker combat", "Strong raiding capabilities"],
    weaknesses: ["High food consumption", "Limited defensive options"]
  }
}

export class TribeService {
  /**
   * Get tribe data by tribe type
   */
  static getTribeData(tribe: GameTribe): TribeData {
    return TRIBE_DATA[tribe]
  }

  /**
   * Check if a troop type belongs to a specific tribe
   */
  static isTroopOfTribe(troopType: TroopType, tribe: GameTribe): boolean {
    return TRIBE_DATA[tribe].troops.includes(troopType)
  }

  /**
   * Check if a building type belongs to a specific tribe
   */
  static isBuildingOfTribe(buildingType: BuildingType, tribe: GameTribe): boolean {
    return TRIBE_DATA[tribe].buildings.includes(buildingType)
  }

  /**
   * Get all troops available to a tribe
   */
  static getTribeTroops(tribe: GameTribe): TroopType[] {
    return TRIBE_DATA[tribe].troops
  }

  /**
   * Get all buildings available to a tribe
   */
  static getTribeBuildings(tribe: GameTribe): BuildingType[] {
    return TRIBE_DATA[tribe].buildings
  }

  /**
   * Get tribe-specific troop stats (overrides default stats)
   */
  static getTribeTroopStats(troopType: TroopType, tribe: GameTribe) {
    // For now, return null to use default stats
    // This can be extended to provide tribe-specific stat overrides
    return null
  }

  /**
   * Get tribe-specific building effects
   */
  static getBuildingEffects(buildingType: BuildingType, level: number, tribe: GameTribe) {
    const effects: Record<string, any> = {}

    if (buildingType === "EARTH_WALL" && tribe === "TEUTONS") {
      // Earth Wall: Nearly indestructible but weak defense
      effects.defenseBonus = Math.floor(level * 0.5) // Very weak defense bonus
      effects.durabilityBonus = level * 10 // High durability bonus
    }

    if (buildingType === "BREWERY" && tribe === "TEUTONS") {
      // Brewery: Attack bonus for Teutonic troops
      effects.attackBonus = level * 5 // 5% attack bonus per level
      effects.buildingRestrictions = ["RESIDENCE", "PALACE", "COMMAND_CENTER"]
    }

    return effects
  }

  /**
   * Get merchant capacity for a tribe
   */
  static getMerchantCapacity(tribe: GameTribe): number {
    switch (tribe) {
      case "TEUTONS":
        return 1000
      case "EGYPTIANS":
        return 750
      case "ROMANS":
      case "HUNS":
        return 500
      default:
        return 500
    }
  }

  /**
   * Get merchant speed for a tribe (fields per hour)
   */
  static getMerchantSpeed(tribe: GameTribe): number {
    switch (tribe) {
      case "TEUTONS":
        return 12
      case "ROMANS":
      case "EGYPTIANS":
        return 16
      case "HUNS":
        return 20
      default:
        return 16
    }
  }

  /**
   * Get hero plunder bonus for a tribe
   */
  static getHeroPlunderBonus(tribe: GameTribe): number {
    switch (tribe) {
      case "TEUTONS":
        return 0.2 // 20% bonus
      default:
        return 0 // No bonus
    }
  }

  /**
   * Get hero resource production bonus for a tribe
   */
  static getHeroResourceProductionBonus(tribe: GameTribe): number {
    switch (tribe) {
      case "EGYPTIANS":
        return 0.15 // 15% bonus to resource production
      default:
        return 0 // No bonus
    }
  }

  /**
   * Get loyalty reduction for chief/administrator units
   */
  static getChiefLoyaltyReduction(tribe: GameTribe): { min: number; max: number } {
    switch (tribe) {
      case "TEUTONS":
        return { min: 20, max: 25 }
      case "HUNS":
        return { min: 15, max: 30 }
      case "ROMANS":
        return { min: 20, max: 30 }
      default:
        return { min: 20, max: 25 }
    }
  }
}

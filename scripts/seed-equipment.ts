import { prisma } from "@/lib/db"
import { ItemRarity, ItemCategory, EquipmentSlot } from "@prisma/client"

// Travian equipment data from https://support.travian.com/en/support/solutions/articles/7000094923-special-servers-common-uncommon-rare-and-epic-items
const TRAVIAN_EQUIPMENT_DATA = [
  // ARMOR ITEMS
  // Tier 1 Armor
  { name: "Armour of Regeneration", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 1, rarity: ItemRarity.COMMON, effects: { hpRegeneration: 20 } },
  { name: "Armour of Regeneration", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 1, rarity: ItemRarity.UNCOMMON, effects: { hpRegeneration: 24 } },
  { name: "Armour of Regeneration", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 1, rarity: ItemRarity.RARE, effects: { hpRegeneration: 30 } },
  { name: "Armour of Regeneration", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 1, rarity: ItemRarity.EPIC, effects: { hpRegeneration: 40 } },

  { name: "Light scale Armour", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 1, rarity: ItemRarity.COMMON, effects: { damageReduction: 4, hpRegeneration: 10 } },
  { name: "Light scale Armour", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 1, rarity: ItemRarity.UNCOMMON, effects: { damageReduction: 5, hpRegeneration: 12 } },
  { name: "Light scale Armour", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 1, rarity: ItemRarity.RARE, effects: { damageReduction: 6, hpRegeneration: 15 } },
  { name: "Light scale Armour", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 1, rarity: ItemRarity.EPIC, effects: { damageReduction: 7, hpRegeneration: 20 } },

  { name: "Light Breast-plate", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 1, rarity: ItemRarity.COMMON, effects: { fightingStrength: 250 } },
  { name: "Light Breast-plate", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 1, rarity: ItemRarity.UNCOMMON, effects: { fightingStrength: 500 } },
  { name: "Light Breast-plate", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 1, rarity: ItemRarity.RARE, effects: { fightingStrength: 1000 } },
  { name: "Light Breast-plate", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 1, rarity: ItemRarity.EPIC, effects: { fightingStrength: 1750 } },

  { name: "Light Segmented-armour", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 1, rarity: ItemRarity.COMMON, effects: { fightingStrength: 125, damageReduction: 3 } },
  { name: "Light Segmented-armour", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 1, rarity: ItemRarity.UNCOMMON, effects: { fightingStrength: 250, damageReduction: 4 } },
  { name: "Light Segmented-armour", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 1, rarity: ItemRarity.RARE, effects: { fightingStrength: 500, damageReduction: 5 } },
  { name: "Light Segmented-armour", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 1, rarity: ItemRarity.EPIC, effects: { fightingStrength: 875, damageReduction: 6 } },

  // Tier 2 Armor
  { name: "Armour of Health", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 2, rarity: ItemRarity.COMMON, effects: { hpRegeneration: 30 } },
  { name: "Armour of Health", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 2, rarity: ItemRarity.UNCOMMON, effects: { hpRegeneration: 34 } },
  { name: "Armour of Health", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 2, rarity: ItemRarity.RARE, effects: { hpRegeneration: 40 } },
  { name: "Armour of Health", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 2, rarity: ItemRarity.EPIC, effects: { hpRegeneration: 50 } },

  { name: "Scale Armour", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 2, rarity: ItemRarity.COMMON, effects: { damageReduction: 6, hpRegeneration: 15 } },
  { name: "Scale Armour", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 2, rarity: ItemRarity.UNCOMMON, effects: { damageReduction: 7 } },
  { name: "Scale Armour", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 2, rarity: ItemRarity.RARE, effects: { damageReduction: 8, hpRegeneration: 20 } },
  { name: "Scale Armour", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 2, rarity: ItemRarity.EPIC, effects: { damageReduction: 10, hpRegeneration: 25 } },

  { name: "Breast-plate", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 2, rarity: ItemRarity.COMMON, effects: { fightingStrength: 1000 } },
  { name: "Breast-plate", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 2, rarity: ItemRarity.UNCOMMON, effects: { fightingStrength: 2000 } },
  { name: "Breast-plate", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 2, rarity: ItemRarity.RARE, effects: { fightingStrength: 4000 } },
  { name: "Breast-plate", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 2, rarity: ItemRarity.EPIC, effects: { fightingStrength: 7000 } },

  { name: "Segmented-armour", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 2, rarity: ItemRarity.COMMON, effects: { fightingStrength: 500, damageReduction: 4 } },
  { name: "Segmented-armour", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 2, rarity: ItemRarity.UNCOMMON, effects: { fightingStrength: 1000, damageReduction: 5 } },
  { name: "Segmented-armour", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 2, rarity: ItemRarity.RARE, effects: { fightingStrength: 2000, damageReduction: 6 } },
  { name: "Segmented-armour", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 2, rarity: ItemRarity.EPIC, effects: { fightingStrength: 3500, damageReduction: 7 } },

  // Tier 3 Armor
  { name: "Armour of Healing", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 3, rarity: ItemRarity.COMMON, effects: { hpRegeneration: 40 } },
  { name: "Armour of Healing", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 3, rarity: ItemRarity.UNCOMMON, effects: { hpRegeneration: 44 } },
  { name: "Armour of Healing", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 3, rarity: ItemRarity.RARE, effects: { hpRegeneration: 50 } },
  { name: "Armour of Healing", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 3, rarity: ItemRarity.EPIC, effects: { hpRegeneration: 60 } },

  { name: "Heavy scale Armour", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 3, rarity: ItemRarity.COMMON, effects: { damageReduction: 8, hpRegeneration: 20 } },
  { name: "Heavy scale Armour", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 3, rarity: ItemRarity.UNCOMMON, effects: { damageReduction: 9, hpRegeneration: 22 } },
  { name: "Heavy scale Armour", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 3, rarity: ItemRarity.RARE, effects: { damageReduction: 10, hpRegeneration: 25 } },
  { name: "Heavy scale Armour", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 3, rarity: ItemRarity.EPIC, effects: { damageReduction: 12, hpRegeneration: 30 } },

  { name: "Heavy Breast-plate", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 3, rarity: ItemRarity.COMMON, effects: { fightingStrength: 4000 } },
  { name: "Heavy Breast-plate", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 3, rarity: ItemRarity.UNCOMMON, effects: { fightingStrength: 5000 } },
  { name: "Heavy Breast-plate", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 3, rarity: ItemRarity.RARE, effects: { fightingStrength: 7000 } },
  { name: "Heavy Breast-plate", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 3, rarity: ItemRarity.EPIC, effects: { fightingStrength: 10000 } },

  { name: "Heavy Segmented-armour", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 3, rarity: ItemRarity.COMMON, effects: { fightingStrength: 2000, damageReduction: 5 } },
  { name: "Heavy Segmented-armour", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 3, rarity: ItemRarity.UNCOMMON, effects: { fightingStrength: 2500, damageReduction: 6 } },
  { name: "Heavy Segmented-armour", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 3, rarity: ItemRarity.RARE, effects: { fightingStrength: 3500, damageReduction: 7 } },
  { name: "Heavy Segmented-armour", category: ItemCategory.ARMOR, slot: EquipmentSlot.ARMOR, qualityTier: 3, rarity: ItemRarity.EPIC, effects: { fightingStrength: 5000, damageReduction: 8 } },

  // HELMET ITEMS
  // Tier 1 Helmets
  { name: "Helmet of Awareness", category: ItemCategory.HELMET, slot: EquipmentSlot.HELMET, qualityTier: 1, rarity: ItemRarity.COMMON, effects: { bonusXP: 15 } },
  { name: "Helmet of Awareness", category: ItemCategory.HELMET, slot: EquipmentSlot.HELMET, qualityTier: 1, rarity: ItemRarity.UNCOMMON, effects: { bonusXP: 17 } },
  { name: "Helmet of Awareness", category: ItemCategory.HELMET, slot: EquipmentSlot.HELMET, qualityTier: 1, rarity: ItemRarity.RARE, effects: { bonusXP: 20 } },
  { name: "Helmet of Awareness", category: ItemCategory.HELMET, slot: EquipmentSlot.HELMET, qualityTier: 1, rarity: ItemRarity.EPIC, effects: { bonusXP: 25 } },

  { name: "Helmet of Regeneration", category: ItemCategory.HELMET, slot: EquipmentSlot.HELMET, qualityTier: 1, rarity: ItemRarity.COMMON, effects: { hpRegeneration: 10 } },
  { name: "Helmet of Regeneration", category: ItemCategory.HELMET, slot: EquipmentSlot.HELMET, qualityTier: 1, rarity: ItemRarity.UNCOMMON, effects: { hpRegeneration: 12 } },
  { name: "Helmet of Regeneration", category: ItemCategory.HELMET, slot: EquipmentSlot.HELMET, qualityTier: 1, rarity: ItemRarity.RARE, effects: { hpRegeneration: 15 } },
  { name: "Helmet of Regeneration", category: ItemCategory.HELMET, slot: EquipmentSlot.HELMET, qualityTier: 1, rarity: ItemRarity.EPIC, effects: { hpRegeneration: 20 } },

  // BOOTS ITEMS
  // Tier 1 Boots
  { name: "Boots of Regeneration", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 1, rarity: ItemRarity.COMMON, effects: { healthRegenerationPercent: 10 } },
  { name: "Boots of Regeneration", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 1, rarity: ItemRarity.UNCOMMON, effects: { healthRegenerationPercent: 12 } },
  { name: "Boots of Regeneration", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 1, rarity: ItemRarity.RARE, effects: { healthRegenerationPercent: 15 } },
  { name: "Boots of Regeneration", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 1, rarity: ItemRarity.EPIC, effects: { healthRegenerationPercent: 20 } },

  { name: "Boots of the Mercenary", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 1, rarity: ItemRarity.COMMON, effects: { speedBonusAfter20Tiles: 25 } },
  { name: "Boots of the Mercenary", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 1, rarity: ItemRarity.UNCOMMON, effects: { speedBonusAfter20Tiles: 35 } },
  { name: "Boots of the Mercenary", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 1, rarity: ItemRarity.RARE, effects: { speedBonusAfter20Tiles: 50 } },
  { name: "Boots of the Mercenary", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 1, rarity: ItemRarity.EPIC, effects: { speedBonusAfter20Tiles: 75 } },

  { name: "Small Spurs", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 1, rarity: ItemRarity.COMMON, effects: { heroSpeedWithHorse: 3 } },
  { name: "Small Spurs", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 1, rarity: ItemRarity.UNCOMMON, effects: { heroSpeedWithHorse: 4 } },
  { name: "Small Spurs", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 1, rarity: ItemRarity.RARE, effects: { heroSpeedWithHorse: 5 } },
  { name: "Small Spurs", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 1, rarity: ItemRarity.EPIC, effects: { heroSpeedWithHorse: 6 } },

  // Tier 2 Boots
  { name: "Boots of Health", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 2, rarity: ItemRarity.COMMON, effects: { healthRegenerationPercent: 15 } },
  { name: "Boots of Health", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 2, rarity: ItemRarity.UNCOMMON, effects: { healthRegenerationPercent: 17 } },
  { name: "Boots of Health", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 2, rarity: ItemRarity.RARE, effects: { healthRegenerationPercent: 20 } },
  { name: "Boots of Health", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 2, rarity: ItemRarity.EPIC, effects: { healthRegenerationPercent: 25 } },

  { name: "Boots of the Warrior", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 2, rarity: ItemRarity.COMMON, effects: { speedBonusAfter20Tiles: 50 } },
  { name: "Boots of the Warrior", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 2, rarity: ItemRarity.UNCOMMON, effects: { speedBonusAfter20Tiles: 60 } },
  { name: "Boots of the Warrior", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 2, rarity: ItemRarity.RARE, effects: { speedBonusAfter20Tiles: 75 } },
  { name: "Boots of the Warrior", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 2, rarity: ItemRarity.EPIC, effects: { speedBonusAfter20Tiles: 100 } },

  { name: "Spurs", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 2, rarity: ItemRarity.COMMON, effects: { heroSpeedWithHorse: 4 } },
  { name: "Spurs", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 2, rarity: ItemRarity.UNCOMMON, effects: { heroSpeedWithHorse: 5 } },
  { name: "Spurs", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 2, rarity: ItemRarity.RARE, effects: { heroSpeedWithHorse: 6 } },
  { name: "Spurs", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 2, rarity: ItemRarity.EPIC, effects: { heroSpeedWithHorse: 7 } },

  // Tier 3 Boots
  { name: "Boots of Healing", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 3, rarity: ItemRarity.COMMON, effects: { healthRegenerationPercent: 20 } },
  { name: "Boots of Healing", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 3, rarity: ItemRarity.UNCOMMON, effects: { healthRegenerationPercent: 22 } },
  { name: "Boots of Healing", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 3, rarity: ItemRarity.RARE, effects: { healthRegenerationPercent: 25 } },
  { name: "Boots of Healing", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 3, rarity: ItemRarity.EPIC, effects: { healthRegenerationPercent: 30 } },

  { name: "Boots of the Archon", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 3, rarity: ItemRarity.COMMON, effects: { speedBonusAfter20Tiles: 75 } },
  { name: "Boots of the Archon", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 3, rarity: ItemRarity.UNCOMMON, effects: { speedBonusAfter20Tiles: 85 } },
  { name: "Boots of the Archon", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 3, rarity: ItemRarity.RARE, effects: { speedBonusAfter20Tiles: 100 } },
  { name: "Boots of the Archon", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 3, rarity: ItemRarity.EPIC, effects: { speedBonusAfter20Tiles: 125 } },

  { name: "Nasty Spurs", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 3, rarity: ItemRarity.COMMON, effects: { heroSpeedWithHorse: 5 } },
  { name: "Nasty Spurs", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 3, rarity: ItemRarity.UNCOMMON, effects: { heroSpeedWithHorse: 6 } },
  { name: "Nasty Spurs", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 3, rarity: ItemRarity.RARE, effects: { heroSpeedWithHorse: 7 } },
  { name: "Nasty Spurs", category: ItemCategory.BOOTS, slot: EquipmentSlot.BOOTS, qualityTier: 3, rarity: ItemRarity.EPIC, effects: { heroSpeedWithHorse: 8 } },

  // WEAPON ITEMS (Tier 3 only, based on available data)
  { name: "Composite longbow of the Marksman", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.COMMON, effects: { fightingStrength: 4000 } },
  { name: "Composite longbow of the Marksman", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.UNCOMMON, effects: { fightingStrength: 5000 } },
  { name: "Composite longbow of the Marksman", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.RARE, effects: { fightingStrength: 7000 } },
  { name: "Composite longbow of the Marksman", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.EPIC, effects: { fightingStrength: 10000 } },

  { name: "Long Spatha sword of the Marauder", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.COMMON, effects: { fightingStrength: 4000 } },
  { name: "Long Spatha sword of the Marauder", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.UNCOMMON, effects: { fightingStrength: 5000 } },
  { name: "Long Spatha sword of the Marauder", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.RARE, effects: { fightingStrength: 7000 } },
  { name: "Long Spatha sword of the Marauder", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.EPIC, effects: { fightingStrength: 10000 } },

  { name: "Long Spatha sword of the Steppe Rider", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.COMMON, effects: { fightingStrength: 4000 } },
  { name: "Long Spatha sword of the Steppe Rider", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.UNCOMMON, effects: { fightingStrength: 5000 } },
  { name: "Long Spatha sword of the Steppe Rider", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.RARE, effects: { fightingStrength: 7000 } },
  { name: "Long Spatha sword of the Steppe Rider", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.EPIC, effects: { fightingStrength: 10000 } },

  // Spartan-specific weapons
  { name: "Lance of the Hoplite", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.COMMON, effects: { fightingStrength: 4000, tribeRestriction: "SPARTANS" } },
  { name: "Lance of the Hoplite", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.UNCOMMON, effects: { fightingStrength: 5000, tribeRestriction: "SPARTANS" } },
  { name: "Lance of the Hoplite", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.RARE, effects: { fightingStrength: 7000, tribeRestriction: "SPARTANS" } },
  { name: "Lance of the Hoplite", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.EPIC, effects: { fightingStrength: 10000, tribeRestriction: "SPARTANS" } },

  { name: "Lance of the Shieldsman", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.COMMON, effects: { fightingStrength: 4000, tribeRestriction: "SPARTANS" } },
  { name: "Lance of the Shieldsman", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.UNCOMMON, effects: { fightingStrength: 5000, tribeRestriction: "SPARTANS" } },
  { name: "Lance of the Shieldsman", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.RARE, effects: { fightingStrength: 7000, tribeRestriction: "SPARTANS" } },
  { name: "Lance of the Shieldsman", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.EPIC, effects: { fightingStrength: 10000, tribeRestriction: "SPARTANS" } },

  { name: "Long Sword of the Twinsteel Therion", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.COMMON, effects: { fightingStrength: 4000, tribeRestriction: "SPARTANS" } },
  { name: "Long Sword of the Twinsteel Therion", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.UNCOMMON, effects: { fightingStrength: 5000, tribeRestriction: "SPARTANS" } },
  { name: "Long Sword of the Twinsteel Therion", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.RARE, effects: { fightingStrength: 7000, tribeRestriction: "SPARTANS" } },
  { name: "Long Sword of the Twinsteel Therion", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.EPIC, effects: { fightingStrength: 10000, tribeRestriction: "SPARTANS" } },

  { name: "Long Sword of the Elpida Rider", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.COMMON, effects: { fightingStrength: 4000, tribeRestriction: "SPARTANS" } },
  { name: "Long Sword of the Elpida Rider", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.UNCOMMON, effects: { fightingStrength: 5000, tribeRestriction: "SPARTANS" } },
  { name: "Long Sword of the Elpida Rider", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.RARE, effects: { fightingStrength: 7000, tribeRestriction: "SPARTANS" } },
  { name: "Long Sword of the Elpida Rider", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.EPIC, effects: { fightingStrength: 10000, tribeRestriction: "SPARTANS" } },

  { name: "Lance of the Corinthian Crusher", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.COMMON, effects: { fightingStrength: 4000, tribeRestriction: "SPARTANS" } },
  { name: "Lance of the Corinthian Crusher", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.UNCOMMON, effects: { fightingStrength: 5000, tribeRestriction: "SPARTANS" } },
  { name: "Lance of the Corinthian Crusher", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.RARE, effects: { fightingStrength: 7000, tribeRestriction: "SPARTANS" } },
  { name: "Lance of the Corinthian Crusher", category: ItemCategory.WEAPON, slot: EquipmentSlot.WEAPON, qualityTier: 3, rarity: ItemRarity.EPIC, effects: { fightingStrength: 10000, tribeRestriction: "SPARTANS" } },
]

async function main() {
  console.log("[equipment] Starting equipment template seed...")

  let createdCount = 0
  let skippedCount = 0

  for (const itemData of TRAVIAN_EQUIPMENT_DATA) {
    try {
      // Check if item template already exists
      const existing = await prisma.itemTemplate.findUnique({
        where: {
          name_rarity_qualityTier: {
            name: itemData.name,
            rarity: itemData.rarity,
            qualityTier: itemData.qualityTier,
          }
        }
      })

      if (existing) {
        console.log(`[equipment] Skipping existing item: ${itemData.name} (${itemData.rarity})`)
        skippedCount++
        continue
      }

      // Create the item template
      await prisma.itemTemplate.create({
        data: {
          name: itemData.name,
          category: itemData.category,
          slot: itemData.slot,
          qualityTier: itemData.qualityTier,
          rarity: itemData.rarity,
          effects: JSON.stringify(itemData.effects),
          description: `${itemData.name} (${itemData.rarity.toLowerCase()}) - Quality Tier ${itemData.qualityTier}`,
        }
      })

      console.log(`[equipment] Created item: ${itemData.name} (${itemData.rarity})`)
      createdCount++
    } catch (error) {
      console.error(`[equipment] Error creating item ${itemData.name}:`, error)
    }
  }

  console.log(`[equipment] Equipment template seed completed: ${createdCount} created, ${skippedCount} skipped`)
}

main()
  .catch((e) => {
    console.error("[equipment] Seed error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

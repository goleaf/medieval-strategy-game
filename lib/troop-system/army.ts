import { getTroopSystemConfig, requireUnitDefinition } from "./config"
import type { ArmyComposition, ArmyStack, TechLevels, TroopSystemConfig } from "./types"

export interface ArmyStackSpec {
  unitType: string
  count: number
  tech?: TechLevels
}

export interface BuildArmyInput {
  label?: string
  stacks: ArmyStackSpec[]
  config?: TroopSystemConfig
}

export function buildArmyComposition(input: BuildArmyInput): ArmyComposition {
  const config = input.config ?? getTroopSystemConfig()
  const armyStacks: ArmyStack[] = input.stacks
    .filter((stack) => stack.count > 0)
    .map((stack) => {
      const definition = requireUnitDefinition(stack.unitType, config)
      return {
        unitType: stack.unitType,
        role: definition.role,
        count: stack.count,
        attack: definition.attack,
        defInf: definition.defInf,
        defCav: definition.defCav,
        defArch: definition.defArch,
        carry: definition.carry,
        smithyAttackLevel: stack.tech?.attackLevel,
        smithyDefenseLevel: stack.tech?.defenseLevel,
      }
    })

  return {
    label: input.label,
    stacks: armyStacks,
  }
}

/*
  Balance simulation harness
  - Runs repeated combat resolutions and prints summary statistics as JSON.
  Usage:
    BATTLES=2000 SEED=123 npx tsx scripts/balance/simulate-combat.ts
*/

import { resolveBattle, type ArmyInput, type CombatEnvironment } from "@/lib/combat"

const BATTLES = Number(process.env.BATTLES || 1000)
const BASE_SEED = process.env.SEED || "balance-sim"

function attackerArmy(): ArmyInput {
  return {
    label: "attacker",
    stacks: [
      { unitId: "sw", role: "inf", count: 1200, attack: 65, defInf: 35, defCav: 30 },
      { unitId: "hc", role: "cav", count: 300, attack: 150, defInf: 40, defCav: 30 },
      { unitId: "ram", role: "ram", count: 30, attack: 65, defInf: 50, defCav: 50 },
    ],
  }
}

function defenderArmy(): ArmyInput {
  return {
    label: "defender",
    stacks: [
      { unitId: "sp", role: "inf", count: 1500, attack: 50, defInf: 55, defCav: 30 },
      { unitId: "ar", role: "inf", count: 600, attack: 80, defInf: 40, defCav: 40 },
      { unitId: "ca", role: "cav", count: 150, attack: 100, defInf: 50, defCav: 60 },
    ],
  }
}

function environment(iteration: number): CombatEnvironment {
  return {
    mission: "attack",
    wallType: "city_wall",
    wallLevel: 10,
    nightActive: false,
    attackerSize: 1500,
    defenderSize: 2250,
    luck: { range: 0.25 },
    seedComponents: [BASE_SEED, iteration],
  }
}

async function main() {
  let attackerWins = 0
  let defenderWins = 0
  let mutualDestruction = 0
  let totalAttackerLoss = 0
  let totalDefenderLoss = 0
  let avgRounds = 0
  let avgWallAfter = 0

  for (let i = 0; i < BATTLES; i += 1) {
    const report = resolveBattle({ attacker: attackerArmy(), defender: defenderArmy(), environment: environment(i) })
    if (report.outcome === "attacker_victory") attackerWins += 1
    else if (report.outcome === "defender_victory") defenderWins += 1
    else mutualDestruction += 1

    totalAttackerLoss += report.attacker.totalCasualties
    totalDefenderLoss += report.defender.totalCasualties
    avgRounds += report.rounds.length
    avgWallAfter += report.preCombat?.wallAfter ?? 0
  }

  const result = {
    runs: BATTLES,
    outcomes: {
      attacker_victory: attackerWins,
      defender_victory: defenderWins,
      mutual_destruction: mutualDestruction,
    },
    rates: {
      attacker: attackerWins / BATTLES,
      defender: defenderWins / BATTLES,
      mutual: mutualDestruction / BATTLES,
    },
    averages: {
      attacker_casualties: totalAttackerLoss / BATTLES,
      defender_casualties: totalDefenderLoss / BATTLES,
      rounds: avgRounds / BATTLES,
      wall_after: avgWallAfter / BATTLES,
    },
  }

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(result, null, 2))
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exit(1)
})


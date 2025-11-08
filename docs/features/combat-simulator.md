# Combat Simulator

## Overview

The Combat Simulator is a strategic planning tool that helps players predict and analyze battle outcomes before committing troops to real combat. It simulates various attack scenarios, allowing players to optimize their troop compositions and understand the impact of different defensive setups.

## Location

The Combat Simulator is accessible from the **Attacks** page via the **"🎯 Combat Simulator"** tab, located alongside the main attack planning interface.

## Features

### Battle Simulation
- **Attack Types**: Support for both Raid and Conquest attacks
- **Troop Composition**: Input custom troop quantities for both attacker and defender
- **Defensive Bonuses**: Wall level consideration with automatic defense bonuses
- **Hero Bonuses**: Optional hero attack bonuses (percentage-based)
- **Resource Estimation**: Defender resource inputs for accurate loot calculations

### Real-time Results
- **Battle Outcome**: Clear win/loss determination
- **Casualty Reports**: Detailed breakdown of losses for both sides
- **Loot Calculation**: Resource capture estimates for successful attacks
- **Combat Statistics**: Total offense/defense values and carry capacity

### Supported Troop Types

#### Basic Troops
- **WARRIOR**: Basic infantry unit
- **SPEARMAN**: Anti-cavalry infantry
- **BOWMAN**: Ranged unit, scout capability
- **HORSEMAN**: Fast cavalry unit
- **PALADIN**: Heavy cavalry unit
- **EAGLE_KNIGHT**: Elite mounted unit

#### Siege Units
- **RAM**: Wall-breaking unit
- **CATAPULT**: Building-damaging unit

#### Elite Units
- **KNIGHT**: Noble cavalry unit
- **NOBLEMAN**: Conquest specialist

#### Tribal Units
- **BERSERKER** (Vikings): High-attack infantry
- **VALKYRIES_BLESSING** (Vikings): Fast cavalry
- **JARL** (Vikings): Elite commander
- **LEGIONNAIRE** (Romans): Balanced unit
- **PRAETORIAN** (Romans): Elite defender
- **IMPERIAN** (Romans): Heavy cavalry
- **SENATOR** (Romans): Noble equivalent
- **CLUBSWINGER** (Teutons): Cheap infantry
- **SPEARMAN_TEUTONIC** (Teutons): Defender
- **AXEMAN** (Teutons): High-attack unit
- **SCOUT** (Teutons): Fast reconnaissance
- **PALADIN_TEUTONIC** (Teutons): Elite cavalry
- **TEUTONIC_KNIGHT** (Teutons): Heavy knight
- **CHIEF** (Teutons): Noble equivalent

## How to Use

### 1. Setup Phase

#### Attack Configuration
- **Attack Type**: Choose between "Raid" (resource stealing) or "Conquest" (village capture)
- **Wall Level**: Set defender's wall level (0-20). Each level provides +50 defense
- **Hero Bonus**: Optional percentage bonus to attacker offense (0-100%)

#### Defender Resources
Input the defender's resource amounts for accurate loot calculations:
- Wood, Stone, Iron, Gold, Food
- Used only for loot estimation in successful attacks

#### Troop Deployment
- **Attacker Troops**: Specify quantities for each troop type you're sending
- **Defender Troops**: Specify quantities for each troop type defending the village
- All troop types are supported, including tribal-specific units

### 2. Simulation Phase

Click **"Run Simulation"** to execute the combat calculation. The simulator uses the same combat engine as real battles, including:

- **Wall Bonuses**: Defense bonus = wall_level × 50
- **Hero Effects**: Attack bonus applied to total offense
- **Randomness**: ±5% combat variation (same as real battles)
- **Casualty Logic**: Different for raids vs conquests
- **Siege Effects**: RAM/CATAPULT impact on walls and buildings

### 3. Results Analysis

#### Battle Outcome
- **Winner Declaration**: Clear attacker/defender victory
- **Combat Statistics**:
  - Total attacker offense (including hero bonus)
  - Total defender defense (including wall bonus)
  - Attacker carry capacity
  - Wall damage (if siege units present)

#### Casualty Breakdown
- **Attacker Losses**: Per troop type casualty counts
- **Defender Losses**: Per troop type casualty counts
- **Color Coding**: Red text for casualty numbers

#### Loot Results (Attacker Victory Only)
- **Resource Distribution**: Shows captured amounts for each resource type
- **Carry Capacity Limits**: Respects total carrying capacity
- **Color Coding**: Green text for captured resources

## Combat Mechanics

### Offense/Defense Calculation
- **Total Offense**: Sum of (troop.attack × quantity) for all attacker units
- **Total Defense**: Sum of (troop.defense × quantity) for all defender units
- **Hero Bonus**: Applied as percentage multiplier to total offense
- **Wall Bonus**: Added as flat defense bonus (level × 50)

### Morale Scaling
- **Purpose**: Softens blows from much larger attackers by scaling down their effective strength instead of rewarding defenders.
- **Formula**: Uses the Travian/Tribal Wars-style ratio `(defender_points ÷ attacker_points)^exponent`, capped between the configured **min** (30% by default) and **max** (100%).
- **Default Slope**: With the tuned exponent of **0.45**, bullying a target with one sixth of your points lands near the official **45% morale** example.
- **Points-Based**: The simulator compares attacker vs. defender points; bullying vastly smaller accounts typically lands in the **30–50%** range depending on the ratio and exponent.
- **Optional Time Floor**: Worlds that opt-in can gradually raise the morale floor toward **50%** as the defender's account ages, preventing veteran low-point players from being farmed indefinitely.
- **No Underdog Boosts**: Hitting larger opponents never exceeds **100%** morale; smaller → larger attacks stay at full strength.
- **Exclusions**: Barbarian or abandoned villages always defend at **100%** morale, and scout-vs-scout intel runs ignore morale entirely.
- **Visibility**: The attack screen and simulator footer show the exact morale multiplier being applied, so you can plan clears and backtimes accurately.

### Casualty Determination
- **Win/Loss**: Determined by offense vs defense comparison
- **Casualty Rates**:
  - **Raids**: Lower attacker casualties (1 survivor guarantee per type)
  - **Conquests**: Standard casualty rates
- **Random Factor**: ±5% variation in power calculations

### Loot Mechanics
- **Eligibility**: Only calculated for attacker victories
- **Capacity Limits**: Cannot exceed total carry capacity
- **Distribution**: Proportional to defender's resource amounts
- **Resource Priority**: Wood → Stone → Iron → Gold → Food

### Siege Effects
- **Wall Damage**: RAM/CATAPULT units can reduce wall levels
- **Building Damage**: Potential for future building destruction
- **Conquest Only**: Siege damage only applies to conquest attacks

## Strategic Applications

### Pre-Attack Planning
- **Troop Optimization**: Test different unit combinations
- **Risk Assessment**: Evaluate casualty expectations
- **Loot Estimation**: Plan resource targets

### Defensive Analysis
- **Wall Effectiveness**: Test wall level impact
- **Troop Balance**: Optimize defensive compositions
- **Resource Protection**: Understand loot vulnerability

### Experimental Scenarios
- **What-if Analysis**: Test hypothetical troop setups
- **Upgrade Planning**: See smithy/academy upgrade benefits
- **Tribal Comparisons**: Compare different tribe effectiveness

## API Integration

### Endpoint: `/api/combat/simulate`
- **Method**: POST
- **Authentication**: Player session required
- **Input Validation**: Comprehensive Zod schema validation

### Request Format
```typescript
{
  attackType: "RAID" | "CONQUEST",
  attackerTroops: Array<{ type: string, quantity: number }>,
  defenderTroops: Array<{ type: string, quantity: number }>,
  wallLevel: number, // 0-20
  heroBonus: number, // 0-100
  defenderResources: {
    wood: number,
    stone: number,
    iron: number,
    gold: number,
    food: number
  }
}
```

### Response Format
```typescript
{
  success: boolean,
  data: {
    attackerWon: boolean,
    attackerCasualties: Record<string, number>,
    defenderCasualties: Record<string, number>,
    lootWood: number,
    lootStone: number,
    lootIron: number,
    lootGold: number,
    lootFood: number,
    wallDamage?: number,
    attackerOffense: number,
    defenderDefense: number,
    carryCapacity: number
  }
}
```

## Technical Implementation

### Frontend Components
- **CombatSimulator**: Main simulation interface with tabbed layout
- **Troop Inputs**: Dynamic form generation for all troop types
- **Results Display**: Comprehensive battle outcome visualization
- **Integration**: Embedded in attacks page as dedicated tab

### Backend Services
- **Combat Service**: Core battle resolution logic
- **Troop Service**: Unit statistics and power calculations
- **Validation**: Input sanitization and type checking

### Data Flow
1. **Input Collection**: User configures battle parameters
2. **API Request**: Frontend sends simulation data
3. **Combat Resolution**: Backend processes using existing battle engine
4. **Result Formatting**: Structured response with detailed outcomes
5. **UI Update**: Frontend displays comprehensive results

## Future Enhancements

### Planned Features
- **Hero System Integration**: Detailed hero stat consideration
- **Building Effects**: Barracks/stables/academy bonuses
- **Tribal Advantages**: Race-specific combat modifiers
- **Equipment Integration**: Weapon/armor stat impacts
- **Morale System**: Loyalty and troop experience effects

### Advanced Analytics
- **Battle History**: Save and compare simulation results
- **Optimization Tools**: AI-assisted troop composition suggestions
- **Multi-wave Simulation**: Sequential attack planning
- **Alliance Support**: Coordinate with other players

## Best Practices

### Effective Usage
1. **Start Simple**: Begin with basic troop combinations
2. **Test Variations**: Try different unit ratios
3. **Consider Context**: Factor in travel time and reinforcement timing
4. **Save Results**: Document successful strategies for future reference

### Accuracy Notes
- **Approximation Tool**: Results are estimates, not exact predictions
- **Random Factors**: Real battles include additional variables
- **Context Matters**: Distance, timing, and external factors affect outcomes
- **Learning Tool**: Use for understanding mechanics, not blind following

## Troubleshooting

### Common Issues
- **No Results**: Ensure at least one troop type has quantity > 0
- **Unexpected Outcomes**: Check wall levels and hero bonuses
- **API Errors**: Verify all required fields are provided
- **Performance**: Large troop quantities may take longer to process

### Validation Rules
- **Troop Quantities**: Must be non-negative integers
- **Wall Levels**: 0-20 range enforced
- **Hero Bonus**: 0-100% range enforced
- **Resource Amounts**: Non-negative values required



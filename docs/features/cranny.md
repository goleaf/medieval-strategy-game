# Cranny System

The Cranny system provides resource protection during attacks and raids. Crannies hide a portion of village resources from being looted by attackers, making defense more strategic and rewarding.

## Overview

Crannies are special buildings that protect resources from being stolen during combat. Each cranny has a protection capacity that increases with its level. Multiple crannies can be built in the same village for increased protection.

## Basic Mechanics

### Protection Capacity

- **Level 1 Cranny**: 200 resources per type
- **Level 2 Cranny**: 400 resources per type
- **Level 3 Cranny**: 600 resources per type
- **Level 10 Cranny**: 2,000 resources per type

The protection capacity increases linearly: `200 + (level-1) * 200`

### Multiple Crannies

- Players can build unlimited crannies in their villages
- Each cranny provides independent protection
- Total protection = sum of all cranny capacities

### Loot Calculation

During attacks, loot is calculated as follows:

1. Calculate total cranny protection across all crannies
2. Apply tribe bonuses to protection capacity
3. Subtract protection from available resources
4. Calculate loot based on remaining resources

```javascript
// Example calculation
defenderResources = { wood: 10000, stone: 8000, iron: 5000, gold: 2000, food: 12000 }
crannyProtection = { wood: 1200, stone: 1200, iron: 1200, gold: 1200, food: 1200 }
effectiveResources = {
  wood: Math.max(0, 10000 - 1200),   // 8800
  stone: Math.max(0, 8000 - 1200),   // 6800
  iron: Math.max(0, 5000 - 1200),    // 3800
  gold: Math.max(0, 2000 - 1200),    // 800
  food: Math.max(0, 12000 - 1200),   // 10800
}
// Loot calculated from effectiveResources
```

## Tribe Bonuses

### Gauls
- **Bonus**: 1.5x cranny capacity
- **Effect**: All crannies in Gaul villages provide 50% more protection
- **Example**: Level 1 cranny protects 300 resources instead of 200

### Teutons
- **Bonus**: Reduce enemy cranny effectiveness during raids
- **Effect**: When Teuton hero joins a raid, enemy crannies only provide 20% of their normal protection
- **Requirement**: Hero must be equipped for the attack

### Other Tribes
- No special cranny bonuses or penalties

## Construction

### Building Costs

| Level | Wood | Stone | Iron | Gold | Food | Time |
|-------|------|-------|------|------|------|------|
| 1     | 40   | 50    | 30   | 0    | 40   | 30m  |
| 2     | 48   | 60    | 36   | 0    | 48   | 36m  |
| 3     | 58   | 72    | 43   | 0    | 58   | 43m  |
| 4     | 69   | 86    | 52   | 0    | 69   | 52m  |
| 5     | 83   | 103   | 62   | 0    | 83   | 62m  |
| 10    | 230  | 287   | 172  | 0    | 230  | 172m |

Costs increase by 20% per level. Time increases by 10% per level.

### Construction Queue

- Crannies follow the standard construction queue system
- Only one construction project per village at a time
- Queue limit configurable per world (default: 3)

### Cancellation

- Level 1 upgrades can be fully refunded
- Higher level upgrades refund the difference between current and target levels
- Cannot cancel cranny construction if academy research is active

## Scouting Information

### Revealed Data

Successful scouting missions reveal:

- Number of crannies in the village
- Total protection capacity
- Active tribe bonuses

### Example Scouting Report

```
🛡️ Cranny Count: 3
🛡️ Total Capacity: 2,400 per resource
🎯 Gaul bonus: 1.5x capacity
```

### Failed Scouting

- No cranny information revealed on failed scouting missions
- Defender receives notification of failed scouting attempt

## Admin Management

### Admin Interface

Administrators can:

- View all crannies across all villages
- Filter by village, player, or tribe
- Adjust cranny levels directly
- Bulk update multiple crannies
- Delete crannies
- Monitor cranny distribution and balance

### API Endpoints

#### GET `/api/admin/cranny`
- Retrieve cranny statistics with filtering and pagination
- Parameters: `villageId`, `playerId`, `limit`, `offset`

#### POST `/api/admin/cranny`
- Update individual cranny level
- Body: `{ buildingId: string, newLevel: number }`

#### POST `/api/admin/cranny/bulk`
- Bulk update cranny levels
- Body: `{ buildingIds: string[], newLevel: number }`

#### DELETE `/api/admin/cranny/bulk`
- Bulk delete crannies
- Body: `{ buildingIds: string[] }`

### Audit Logging

All admin actions on crannies are logged:

- Individual level changes
- Bulk operations
- Cranny deletions
- Target village and player information

## Game Balance Considerations

### Early Game
- Crannies are essential for beginner protection
- Low cost makes them accessible early
- Provides basic protection against small raids

### Mid Game
- Multiple crannies become viable
- Protection scales with village size
- Strategic decision: invest in more crannies vs. other defenses

### Late Game
- High-level crannies provide significant protection
- Multiple crannies can protect large resource stockpiles
- Balance between offense (bypassing crannies) and defense

### Counterplay

#### Attacker Strategies
- **Raiding**: Smaller, faster attacks to overwhelm cranny protection
- **Conquest**: Larger attacks where cranny protection is less relevant
- **Teuton Hero**: Use hero to reduce enemy cranny effectiveness

#### Defender Strategies
- **Multiple Crannies**: Build several lower-level crannies for redundancy
- **Resource Distribution**: Keep resources below cranny capacity
- **Active Defense**: Use troops to prevent successful attacks

## Technical Implementation

### Database Schema

```prisma
enum BuildingType {
  // ... other buildings
  CRANNY
}

model Building {
  id        String      @id @default(cuid())
  villageId String
  village   Village     @relation(fields: [villageId], references: [id])
  type      BuildingType
  level     Int         @default(1)
  // ... other fields
}
```

### Service Classes

#### CrannyService
- `calculateCrannyCapacity(level: number)`: Calculate single cranny capacity
- `calculateTotalProtection(villageId, attackerTribe?)`: Calculate village protection
- `calculateEffectiveLoot(resources, protection)`: Apply protection to resources
- `getCrannyInfo(villageId)`: Get scouting information

#### CombatService
- Modified loot calculation to account for cranny protection
- Updated scouting to include cranny information

### Frontend Components

#### Game Components
- `CrannyDisplay`: Shows cranny status and upgrade options
- `BattleReport`: Displays cranny information in scouting reports

#### Admin Components
- `CrannyManager`: Admin interface for cranny management
- Bulk operations and filtering

## Migration Notes

### Database Migration

When deploying the cranny system:

1. Add `CRANNY` to `BuildingType` enum
2. Existing villages can immediately build crannies
3. No data migration required for existing buildings

### Feature Rollout

1. Deploy backend changes
2. Run database migration
3. Deploy frontend changes
4. Update admin interfaces
5. Test combat calculations
6. Monitor for balance issues

## Future Enhancements

### Potential Features
- **Cranny Upgrades**: Special research or items to improve cranny effectiveness
- **Hero Items**: Equipment that affects cranny protection
- **Tribe-specific Crannies**: Unique cranny types per tribe
- **Alliance Bonuses**: Alliance-wide cranny protection bonuses

### Balance Adjustments
- **Capacity Scaling**: Adjust the 200 resources per level formula
- **Tribe Balance**: Modify Gaul/Teuton bonuses based on playtesting
- **Cost Balance**: Adjust construction costs for game pacing

## Troubleshooting

### Common Issues

#### Cranny Protection Not Applying
- Check that crannies are built and not under construction
- Verify tribe bonuses are calculated correctly
- Check combat service loot calculation logic

#### Scouting Not Showing Cranny Info
- Ensure scouting attack succeeds
- Check CrannyService.getCrannyInfo() implementation
- Verify scouting data includes cranny field

#### Admin Interface Issues
- Check API endpoints are responding
- Verify admin authentication
- Check database queries for performance

### Debug Commands

```bash
# Check cranny data for a village
prisma studio
# Filter buildings by type: CRANNY

# Test combat calculations
npm run test combat-simulator
```

## Changelog

### Version 1.0.0
- Initial cranny system implementation
- Basic protection mechanics
- Tribe bonuses (Gaul 1.5x, Teuton raid reduction)
- Admin management interface
- Scouting integration


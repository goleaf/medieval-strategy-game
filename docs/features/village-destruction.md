# Village Destruction Mechanics

## Overview

Village destruction is a core mechanic in medieval strategy games that allows players to conquer enemy territory through sustained military attacks. This implementation follows the Travian: Legends village destruction system where villages can be completely destroyed when their population reaches zero.

## How Village Destruction Works

### Population System

Every village has a population value that determines its ability to function:

- **Population Calculation**: Population is determined by the buildings in the village
- **Building Contributions**:
  - Headquarters: 4 population per level
  - Barracks: 1 population per level
  - Stables: 1 population per level
  - Watchtower: 1 population per level
  - Wall: 2 population per level
  - Other buildings: 0 population contribution

- **Population Capacity**: Limited by Farm levels (Base 100 + 50 per farm level)

### Destruction Process

1. **Attack with Siege Units**: Players must attack with catapults and/or rams
2. **Building Destruction**: Catapults destroy buildings, reducing population
   - Each catapult can destroy buildings worth ~10 population points
   - Buildings are destroyed starting with highest population contribution first
3. **Population Reduction**: When buildings are destroyed, village population decreases
4. **Zero Population**: When population reaches 0, village is automatically destroyed

### Protected Villages

Villages cannot be destroyed under certain conditions:

- **Last Remaining Village**: A player cannot destroy their own last village
- **World Wonder Villages**: Villages containing World Wonders (not implemented yet)
- **Artefact Villages**: Villages holding special artefacts (not implemented yet)

## Combat Mechanics

### Siege Unit Effects

- **Rams**: Reduce wall levels (damage = min(current_wall_level, floor(ram_count / 10)))
- **Catapults**: Destroy buildings and reduce population
  - Target population reduction = catapult_count × 10
  - Buildings destroyed in order of population contribution (highest first)

### Attack Resolution

```typescript
// Population damage calculation
const targetPopulationReduction = catapultCount * 10
const destructionResult = await VillageDestructionService.destroyBuildingsAndReducePopulation(
  villageId,
  targetPopulationReduction
)

// Automatic destruction check
if (village.population <= 0) {
  const canDestroy = await VillageDestructionService.canVillageBeDestroyed(villageId)
  if (canDestroy.canDestroy) {
    await VillageDestructionService.destroyVillage(villageId, attackerId)
  }
}
```

## Village Destruction Effects

When a village is destroyed:

1. **Building Removal**: All buildings are permanently removed
2. **Troop Elimination**: All defending troops are eliminated
3. **Resource Clearing**: All resources (wood, stone, iron, gold, food) are set to 0
4. **Production Halt**: All resource production stops
5. **Attack Cancellation**: All ongoing attacks from the village are cancelled
6. **Reinforcement Cancellation**: All reinforcements from/to the village are cancelled
7. **Market Cancellation**: All ongoing market orders are cancelled
8. **Status Change**: Village is marked as `isDestroyed = true`

## Frontend Display

### Village Overview

The village overview displays destruction status with visual indicators:

- **Destroyed Badge**: Red badge with skull icon for destroyed villages
- **Zero Population Warning**: Alert triangle for villages with 0 population
- **Low Loyalty Warning**: Warning for villages with loyalty < 25%
- **Population Display**: Shows current/max population with warnings

### Destruction State

```typescript
// Visual indicators in village overview
{village.isDestroyed && (
  <Badge variant="destructive">
    <Skull className="h-3 w-3" />
    Destroyed
  </Badge>
)}

{village.population <= 0 && !village.isDestroyed && (
  <Badge variant="destructive">
    <AlertTriangle className="h-3 w-3" />
    Zero Population
  </Badge>
)}
```

## Admin Management

### Admin API Endpoints

#### List Villages
```
GET /api/admin/villages
Query params: page, limit, status (all|active|destroyed), playerName
```

#### Get Village Details
```
GET /api/admin/villages/[id]
```

#### Destroy Village
```
POST /api/admin/villages
Body: { villageId, reason }
```

#### Update Village
```
PUT /api/admin/villages/[id]
Body: { population, isDestroyed, restore }
```

#### Force Destroy Village
```
DELETE /api/admin/villages/[id]
Body: { reason, bypassChecks }
```

### Admin Interface

The admin interface provides:

- **Village Search**: Filter by player name and destruction status
- **Bulk Management**: View and manage multiple villages
- **Destruction Controls**: Manual village destruction with reason logging
- **Restoration Tools**: Restore destroyed villages
- **Audit Logging**: All admin actions are logged

## Database Schema

### Village Model Extensions

```prisma
model Village {
  // ... existing fields ...

  // Village Destruction
  isDestroyed      Boolean @default(false)
  destroyedAt      DateTime?
  destroyedById    String? // Player who destroyed the village

  // ... relations ...
}
```

### Population Tracking

- Population is calculated dynamically based on buildings
- Stored in database for performance
- Updated after building construction/destruction
- Used for destruction checks during combat

## API Integration

### Village Service Updates

```typescript
// Population calculation
const population = await VillageDestructionService.calculateVillagePopulation(villageId)

// Destruction checks
const canDestroy = await VillageDestructionService.canVillageBeDestroyed(villageId)

// Village destruction
await VillageDestructionService.destroyVillage(villageId, destroyerId)
```

### Combat Service Integration

The combat service now includes:

- Building destruction logic during siege attacks
- Population damage calculation
- Automatic village destruction triggers
- Wall damage from ram attacks

## Testing Scenarios

### Basic Destruction Test
1. Create village with buildings
2. Attack with catapults
3. Verify buildings are destroyed
4. Verify population decreases
5. Verify village destruction at population = 0

### Protection Tests
1. Test last village protection
2. Test capital village protection
3. Test World Wonder protection (when implemented)

### Admin Tests
1. Manual village destruction
2. Village restoration
3. Audit log verification
4. Population override functionality

## Performance Considerations

- **Population Calculation**: Cached in database, updated on building changes
- **Destruction Checks**: Lightweight database queries
- **Bulk Operations**: Admin interface supports pagination
- **Combat Performance**: Building destruction optimized for combat resolution

## Future Enhancements

- **World Wonder Protection**: Prevent destruction of villages with World Wonders
- **Artefact System**: Prevent destruction of villages holding artefacts
- **Destruction Animations**: Visual effects for building destruction
- **Abandoned Valley Respawn**: Allow settlement of destroyed villages
- **Destruction Statistics**: Track destruction causes and frequencies

## Migration Notes

When deploying this feature:

1. **Database Migration**: Run `prisma migrate dev` to add destruction fields
2. **Population Initialization**: Run population calculation for existing villages
3. **Building Updates**: Ensure building population contributions are set
4. **Admin Training**: Train admins on destruction management tools

## Security Considerations

- **Admin Permissions**: Only authorized admins can destroy/restore villages
- **Audit Logging**: All destruction actions are logged with reasons
- **Validation**: Input validation for all destruction parameters
- **Rate Limiting**: Prevent rapid-fire destruction actions


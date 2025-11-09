# Unit Balance Management

The Unit Balance system allows administrators to view and modify troop statistics and costs in real-time, providing powerful game balancing capabilities.

## Features

### Database-Backed Storage
- All unit balance data stored in dedicated database table
- Transaction-safe updates with rollback capabilities
- Version history through database timestamps
- Real-time synchronization across all game instances

### Live Editing Interface
- Intuitive form-based editor for all unit properties
- Real-time validation with immediate feedback
- Batch update capabilities for multiple units
- Preview changes before saving

### Validation & Safety
- Automatic stat sum validation (50-200 range)
- Cost validation (non-negative values)
- Health/attack/defense/speed constraints
- Transaction rollback on validation failures

## API Endpoints

### Get Unit Balances
```http
GET /api/admin/units/balance
```

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "WARRIOR",
      "cost": {
        "wood": 50,
        "stone": 30,
        "iron": 20,
        "gold": 10,
        "food": 1
      },
      "stats": {
        "health": 100,
        "attack": 25,
        "defense": 20,
        "speed": 5
      }
    }
  ],
  "source": "database"
}
```

### Update Unit Balances
```http
PUT /api/admin/units/balance
```

**Request Body:**
```json
{
  "balances": [
    {
      "type": "WARRIOR",
      "cost": {
        "wood": 60,
        "stone": 35,
        "iron": 25,
        "gold": 12,
        "food": 1
      },
      "stats": {
        "health": 110,
        "attack": 28,
        "defense": 22,
        "speed": 5
      }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully updated 1 troop balances in database",
  "data": [
    {
      "id": "balance-id",
      "troopType": "WARRIOR",
      "costWood": 60,
      "costStone": 35,
      "costIron": 25,
      "costGold": 12,
      "costFood": 1,
      "health": 110,
      "attack": 28,
      "defense": 22,
      "speed": 5,
      "createdAt": "2025-01-04T12:00:00Z",
      "updatedAt": "2025-01-04T12:30:00Z"
    }
  ]
}
```

## Usage

### Admin Dashboard
1. Navigate to Admin Dashboard → Unit Balance tab
2. View current unit statistics and costs
3. Click "Edit Unit Balance" to enter edit mode
4. Modify unit stats and costs as needed
5. Click "Save Changes" to apply updates
6. Or click "Cancel" to discard changes

### Validation Rules

#### Stat Validation
- **Total Stat Sum**: Attack + Defense + Speed + Health/10 must be 50-200
- **Individual Stats**: All values must be positive integers
- **Health**: Minimum 1, maximum 1000
- **Attack/Defense/Speed**: Minimum 0, maximum 500

#### Cost Validation
- All resource costs must be non-negative integers
- No upper limit on costs (balance at admin discretion)
- Zero costs allowed for special units

## Database Schema

```prisma
model TroopBalance {
  id              String    @id @default(cuid())

  troopType       TroopType @unique

  // Resource costs
  costWood        Int       @default(0)
  costStone       Int       @default(0)
  costIron        Int       @default(0)
  costGold        Int       @default(0)
  costFood        Int       @default(0)

  // Combat stats
  health          Int       @default(100)
  attack          Int       @default(10)
  defense         Int       @default(5)
  speed           Int       @default(5)

  // Metadata
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([troopType])
}
```

## Fallback System

The system includes a fallback mechanism:
1. **Primary**: Check database for custom balances
2. **Fallback**: Use hardcoded troop service values
3. **Migration**: Automatically migrate from service to database

This ensures backward compatibility during the transition period.

## Effects on Gameplay

### Immediate Changes
- Unit costs update instantly for new training operations
- Combat calculations use updated stats immediately
- Existing units continue with old stats until replaced

### Balance Considerations
- **Cost Changes**: Affect player economy and training decisions
- **Stat Changes**: Impact combat outcomes and strategy
- **Balance Testing**: Recommended to test changes in staging environment
- **Player Communication**: Consider announcing major balance changes

## Default Tribal Wars Unit Stats

The JSON blueprint at `config/unit-system.json` now stores a complete “Unit Statistics Database” for the Tribal Wars roster. Each entry matches Travian/Tribal Wars timings and population costs, and exposes optional `worldFeatureFlags` so presets can toggle Archers or Paladins without editing code. The defaults shipped with this repo are summarised below (minutes per field convert directly to the `speedTilesPerHour` values in config):

| Unit | Cost (W/C/I) | Train Time | Pop | Speed (min/field) | Attack | Defense (Inf/Cav/Arch) | Carry | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Spear Fighter | 50 / 30 / 10 | 10 m | 1 | 18 | 10 | 15 / 45 / 20 | 25 | Core infantry starter |
| Swordsman | 30 / 30 / 70 | 17 m | 1 | 22 | 25 | 50 / 15 / 40 | 15 | Defensive infantry |
| Axeman | 60 / 30 / 40 | 12 m | 1 | 18 | 40 | 10 / 5 / 10 | 10 | Glass-cannon infantry |
| Archer* | 100 / 30 / 60 | 18 m | 1 | 18 | 15 | 50 / 40 / 5 | 10 | `worldFeatureFlags: ["archers"]` |
| Scout | 50 / 50 / 20 | 13 m | 2 | 9 | 0 | 2 / 2 / 2 | 0 | Enables spying missions |
| Light Cavalry | 125 / 100 / 250 | 25 m | 4 | 10 | 130 | 30 / 40 / 30 | 80 | Fast raider |
| Mounted Archer* | 250 / 100 / 150 | 30 m | 5 | 10 | 120 | 40 / 30 / 50 | 50 | Requires `archers` flag |
| Heavy Cavalry | 200 / 150 / 600 | 40 m | 6 | 11 | 150 | 200 / 80 / 180 | 50 | High-defense cav |
| Ram | 300 / 200 / 200 | 50 m | 5 | 30 | 2 | 20 / 20 / 20 | 0 | 2% wall drop chance per ram |
| Catapult | 320 / 400 / 100 | 60 m | 8 | 30 | 100 | 100 / 100 / 100 | 0 | 3 catapults per building level |
| Paladin* | 20k / 20k / 40k | 9 h | 10 | 10 | 150 | 250 / 250 / 250 | 100 | `worldFeatureFlags: ["paladin"]`, single per player, respawns |
| Nobleman | 40k / 50k / 50k | 7 h | 100 | 35 | 30 | 100 / 100 / 100 | 0 | Loyalty hit 20–35, coin cost handled by economy systems |

\* Units marked with `worldFeatureFlags` only spawn on worlds that enable the related feature switch (e.g., presets that disable Archers or Paladins automatically hide these definitions).

Crop upkeep mirrors population for all of the above, so starvation simulations and population gating stay consistent with world speed modifiers.

## Audit Logging

All unit balance changes are logged:

### Update Actions
- Action: `UPDATE_TROOP_BALANCE`
- Details: "Updated X troop balances in database"
- Target Type: `TROOP_BALANCE`
- Target ID: `all`

## Performance Impact

### Database Operations
- Upsert operations for efficient updates
- Transaction-based updates for consistency
- Indexed queries for fast retrieval
- Minimal impact on game performance

### Validation Overhead
- Client-side validation for immediate feedback
- Server-side validation for security
- Batch processing for multiple units
- Optimized validation algorithms

## Best Practices

### Balance Changes
- Test changes in development environment first
- Start with small adjustments and monitor impact
- Consider player feedback and meta analysis
- Document reasoning for balance decisions

### Update Strategy
- Schedule balance changes during low-activity periods
- Communicate changes to player community
- Monitor server performance after updates
- Have rollback plan for problematic changes

### Data Management
- Regular backups of balance configurations
- Version control for balance history
- Documentation of balance reasoning
- A/B testing for major balance changes

## Integration Points

Unit balance integrates with:
- **Troop Training System**: Uses updated costs
- **Combat Engine**: Uses updated statistics
- **Resource Management**: Affects player economy
- **Admin Dashboard**: Provides editing interface
- **Audit System**: Tracks all balance changes

## Migration Guide

### From Service-Based to Database
1. System automatically detects missing database entries
2. Falls back to service values during transition
3. Admin can edit and save custom balances
4. Service values remain as fallback for emergencies

### Data Preservation
- Existing hardcoded values preserved as defaults
- Database entries take precedence once created
- No data loss during migration
- Backward compatibility maintained


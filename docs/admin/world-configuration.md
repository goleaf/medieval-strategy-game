# World Configuration

The World Configuration system allows administrators to manage global game settings that affect all players and the overall game balance.

## Features

### Configuration Options

#### Game Speed Settings
- **Speed**: Base game speed multiplier (affects all game mechanics)
- **Unit Speed**: Movement speed multiplier for troops
- **Production Multiplier**: Resource production rate modifier
- **Resource Per Tick**: Base resources added per game tick

#### Time Settings
- **Tick Interval**: How often the game updates (in minutes)
- **Night Bonus Multiplier**: Defense bonus during night time
- **Beginner Protection Hours**: Hours of protection for new players
- **Beginner Protection Enabled**: Toggle for beginner protection system

#### Game State
- **Game Running**: Pause/resume the entire game world
- **World Name**: Display name for the game world
- **Siege Rules Config**: JSON blob merged into `DEFAULT_CATAPULT_RULES` to toggle field targeting, floors, WW caps, etc. (see `docs/features/catapult-targeting.md`)

> ℹ️ **Coordinate bounds**: `maxX` and `maxY` default to `999`, producing a 0–999 grid (1000×1000 tiles) with the canonical 10×10 continent layout (`K00`–`K99`).

## API Endpoints

### Get World Configuration
```http
GET /api/admin/world/config
```

**Response:**
```json
{
  "worldName": "Medieval World",
  "maxX": 999,
  "maxY": 999,
  "speed": 1,
  "unitSpeed": 1.0,
  "resourcePerTick": 10,
  "productionMultiplier": 1.0,
  "tickIntervalMinutes": 5,
  "nightBonusMultiplier": 1.2,
  "beginnerProtectionHours": 72,
  "beginnerProtectionEnabled": true,
  "isRunning": true
}
```

### Update World Configuration
```http
PUT /api/admin/world/config
```

**Request Body:**
```json
{
  "speed": 2,
  "productionMultiplier": 1.5,
  "isRunning": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "worldName": "Medieval World",
    "speed": 2,
    "productionMultiplier": 1.5,
    "isRunning": true
  }
}
```

## Usage

### Admin Dashboard
1. Navigate to Admin Dashboard → World Config tab
2. View current configuration settings
3. Click "Edit Configuration" to modify settings
4. Update desired values
5. Click "Save Changes" to apply

### Speed Templates
For quick configuration changes, use the Speed Templates system:
- **Normal**: Standard game speed (1x)
- **Fast**: Accelerated gameplay (2x)
- **Very Fast**: Quick rounds (3x)
- **Tournament**: Competitive speed (5x)
- **Extreme**: Maximum speed (10x)

## Validation Rules

- Speed must be a positive number
- Unit Speed must be >= 0.1
- Production Multiplier must be >= 0.1
- Tick Interval must be >= 1 minute
- Beginner Protection Hours must be >= 0

## Audit Logging

All world configuration changes are logged to the `AuditLog` table with:
- Action: `UPDATE_WORLD_CONFIG`
- Target Type: `WORLD_CONFIG`
- Target ID: World config record ID

## Database Schema

```prisma
model WorldConfig {
  id              String    @id @default(cuid())

  // World Settings
  worldName       String    @default("Medieval World")
  maxX            Int       @default(999)
  maxY            Int       @default(999)
  speed           Int       @default(1)
  unitSpeed       Float     @default(1.0)

  // Game State
  isRunning       Boolean   @default(true)
  startedAt       DateTime  @default(now())

  // Game Balance
  resourcePerTick Int       @default(10)
  productionMultiplier Float @default(1.0)
  tickIntervalMinutes Int   @default(5)
  constructionQueueLimit Int @default(3)

  // Night Bonus & Protection
  nightBonusMultiplier Float @default(1.2)
  beginnerProtectionHours Int @default(72)
  beginnerProtectionEnabled Boolean @default(true)
  siegeRulesConfig          Json?   @default("{}")

  @@unique([id])
}
```

## Security Considerations

- Only authenticated administrators can access world configuration
- All changes are audited and logged
- Input validation prevents invalid configurations
- Changes take effect immediately across the entire game world

## Performance Impact

- Speed changes affect all game calculations
- Production multiplier impacts resource generation frequency
- Unit speed affects movement calculations
- Changes are applied in real-time without requiring server restart

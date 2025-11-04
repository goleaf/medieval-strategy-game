# Map Tools

Map Tools provide administrators with powerful utilities to manage the game world map, including spawning barbarian villages, relocating tiles, and cleaning up empty villages.

## Features

### Spawn Barbarian Village
Create barbarian villages at specific coordinates with custom troop compositions for testing or game balance purposes.

### Relocate Village
Move any village (player or barbarian) to a new location on the map.

### Wipe Empty Villages
Remove villages that meet specific criteria for being "empty" to clean up the map and improve performance.

## API Endpoints

### Spawn Barbarian Village
```http
POST /api/admin/map/spawn-barbarian
```

**Request Body:**
```json
{
  "x": 50,
  "y": 75,
  "warriors": 100,
  "spearmen": 50,
  "bowmen": 30,
  "horsemen": 10
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "villageId": "village-id",
    "barbarianId": "barbarian-id",
    "x": 50,
    "y": 75
  },
  "message": "Barbarian village spawned successfully"
}
```

### Relocate Village
```http
POST /api/admin/map/relocate-tile
```

**Request Body:**
```json
{
  "oldX": 25,
  "oldY": 30,
  "newX": 75,
  "newY": 80
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "villageId": "village-id",
    "oldX": 25,
    "oldY": 30,
    "newX": 75,
    "newY": 80
  },
  "message": "Village relocated successfully"
}
```

### Wipe Empty Villages
```http
POST /api/admin/map/wipe-empty
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deletedCount": 5,
    "deletedVillages": ["village-id-1", "village-id-2"]
  },
  "message": "Successfully wiped 5 empty villages"
}
```

## Usage

### Admin Dashboard
1. Navigate to Admin Dashboard → Map Tools tab
2. Choose desired tool:

#### Spawn Barbarian
- Enter X and Y coordinates
- Set troop counts for each unit type
- Click "Spawn Barbarian"

#### Relocate Tile
- Enter current village coordinates (From)
- Enter new village coordinates (To)
- Click "Relocate Tile"

#### Wipe Empty
- Type "WIPE_EMPTY_VILLAGES" to confirm
- Click "Wipe Empty Villages"

## Validation Rules

### Coordinates
- Must be within world bounds (0 to maxX/maxY)
- Must be integers
- Target location must not be occupied (for relocation and spawning)

### Troop Counts
- Must be non-negative integers
- Default values provided for convenience

### Wipe Empty Confirmation
- Requires exact text match: "WIPE_EMPTY_VILLAGES"
- Prevents accidental execution

## Empty Village Criteria

Villages are considered "empty" if they meet ALL of these conditions:
- No buildings with level > 1
- No troops in the village
- Minimal resources (wood ≤ 1000, stone ≤ 1000, iron ≤ 500, gold ≤ 200, food ≤ 2000)
- No ongoing constructions
- No active market orders

## Database Schema

```prisma
model Barbarian {
  id              String    @id @default(cuid())
  x               Int
  y               Int
  villageId       String?
  village         Village?  @relation(fields: [villageId], references: [id])

  // Barbarian Troops
  warriors        Int       @default(100)
  spearmen        Int       @default(50)
  bowmen          Int       @default(30)
  horsemen        Int       @default(10)

  spawnedAt       DateTime  @default(now())
  lastAttackAt    DateTime?

  @@index([x, y])
  @@index([villageId])
}

model Village {
  id              String    @id @default(cuid())
  playerId        String
  player          Player    @relation(fields: [playerId], references: [id], onDelete: Cascade)

  x               Int
  y               Int
  name            String    @default("New Village")

  // Resources
  wood            Int       @default(1000)
  stone           Int       @default(1000)
  iron            Int       @default(500)
  gold            Int       @default(200)
  food            Int       @default(2000)

  // Relations
  buildings       Building[]
  troops          Troop[]
  barbarians      Barbarian[]

  @@unique([x, y])
  @@index([playerId])
}
```

## Effects on Gameplay

### Barbarian Spawning
- Creates new barbarian player if none exists
- All barbarian villages share the same player ID
- Barbarians can be attacked by players
- Provides resource loot when conquered

### Village Relocation
- Moves all village data to new coordinates
- Updates all related records (buildings, troops, movements)
- Cancels any ongoing movements to/from the village
- Preserves village ownership and resources

### Empty Village Removal
- Permanently deletes village and all associated data
- Frees up map coordinates for new villages
- Improves database performance
- May affect player rankings and statistics

## Audit Logging

All map tool actions are logged:

### Spawn Barbarian
- Action: `SPAWN_BARBARIAN`
- Details: Coordinates and troop counts
- Target Type: `BARBARIAN`
- Target ID: Barbarian record ID

### Relocate Village
- Action: `RELOCATE_VILLAGE`
- Details: Old → New coordinates
- Target Type: `VILLAGE`
- Target ID: Village ID

### Wipe Empty
- Action: `WIPE_EMPTY_VILLAGES`
- Details: Number of villages deleted
- Target Type: `SYSTEM`
- Target ID: N/A

## Security Considerations

- All actions require administrator authentication
- Coordinate validation prevents invalid map positions
- Confirmation requirements prevent accidental destructive actions
- All actions are logged for accountability

## Performance Impact

### Spawn Barbarian
- Minimal impact on existing game state
- Creates new database records
- May trigger immediate attacks from nearby players

### Village Relocation
- Requires multiple database updates
- May affect ongoing movements and attacks
- Consider transaction isolation for data consistency

### Wipe Empty
- Database cleanup operation
- May improve query performance
- Consider running during low-activity periods
- Large operations may require batching

## Best Practices

### Barbarian Management
- Use consistent troop compositions for balance
- Place barbarians strategically for gameplay flow
- Monitor barbarian village population
- Consider different difficulty levels

### Village Relocation
- Communicate moves to affected players when possible
- Choose unoccupied coordinates
- Consider impact on ongoing gameplay
- Document reasons for relocations

### Map Cleanup
- Run wipe operations regularly
- Monitor empty village accumulation
- Consider player feedback before mass deletions
- Backup database before large cleanup operations

## Monitoring

Track these metrics for map tool usage:
- Number of barbarian villages spawned
- Village relocation frequency
- Empty village cleanup results
- Map density and distribution
- Player complaints about map changes

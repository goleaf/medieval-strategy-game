# Travian: Legends Game World Administration

This document describes the comprehensive admin features implemented to replicate the game world management system from Travian: Legends.

## Overview

The system implements all major features from [Travian: Legends Game Versions and Speed](https://support.travian.com/en/support/solutions/articles/7000068688), including:

- Multiple game worlds with different configurations
- Game versions (Regular, Annual Special, Tournament, etc.)
- Regions (International, America, Arabics, Asia, Europe)
- Detailed speed scaling (x1, x2, x3, x5, x10)
- Tribe management (3, 5, or 6 tribes per world)
- Comprehensive admin UI and API

## Database Schema

### GameWorld Model

```prisma
model GameWorld {
  id              String    @id @default(cuid())

  // World Identity
  worldName       String
  worldCode       String    @unique
  description     String?

  // World Type & Settings
  version         GameVersion
  region          GameRegion
  speed           Int       @default(1)

  // Timing Configuration (speed-scaled)
  registrationClosesAfterDays    Int
  artefactsIntroducedAfterDays   Int
  constructionPlansAfterDays     Int
  natarWonderFinishesAfterDays   Int
  annualSpecialDurationDays      Int

  // Culture Points Configuration
  startingCulturePoints         Int
  townhallCelebrationTimeDivisor Int
  townhallSmallCelebrationLimit Int
  townhallLargeCelebrationLimit Int
  requirementForSecondVillage   Int
  artworkCpProductionDivisor    Float
  artworkLimit                  Int
  artworkUsageCooldownHours     Int

  // Item Availability
  itemTier2AfterDays           Int
  itemTier3AfterDays           Int
  auctionDurationHours         Float
  smeltingTimeHours            Int

  // General Mechanics
  beginnerProtectionDays       Int
  travianPlusDurationDays      Int
  resourceBonusDurationDays    Int
  availableVacationDays        Int
  upgradingToCityCooldownHours Int
  natarAttackDelayHours        Int

  // Tribe Configuration
  availableTribes     GameWorldTribe[]

  // Game State
  isActive          Boolean   @default(true)
  isRegistrationOpen Boolean @default(true)
  startedAt         DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations
  players           Player[]
  worldConfig       WorldConfig?
}
```

### Enums

```prisma
enum GameVersion {
  REGULAR
  ANNUAL_SPECIAL
  NEW_YEAR_SPECIAL
  TOURNAMENT
  COMMUNITY_WEEK
  LOCAL_GAMEWORLD
}

enum GameRegion {
  INTERNATIONAL
  AMERICA
  ARABICS
  ASIA
  EUROPE
}

enum GameTribe {
  ROMANS
  TEUTONS
  GAULS
  HUNS
  EGYPTIANS
  SPARTANS
  VIKINGS
}
```

## API Endpoints

### Game World Management

#### GET /api/admin/game-worlds
Returns all game worlds with player counts and configuration details.

#### POST /api/admin/game-worlds
Creates a new game world with specified configuration.

**Request Body:**
```json
{
  "worldName": "Test World",
  "worldCode": "tw1",
  "description": "A test game world",
  "version": "REGULAR",
  "region": "INTERNATIONAL",
  "speed": 1,
  "availableTribes": ["ROMANS", "TEUTONS", "GAULS"]
}
```

#### GET /api/admin/game-worlds/[id]
Returns detailed information about a specific game world.

#### PUT /api/admin/game-worlds/[id]
Updates game world configuration.

#### DELETE /api/admin/game-worlds/[id]
Deletes a game world (only if no active players).

#### POST /api/admin/game-worlds/[id]/start
Starts a game world, closing registration and beginning gameplay.

### Speed Templates

#### GET /api/admin/speed-templates
Returns all available speed templates with detailed configurations.

#### POST /api/admin/speed-templates
Applies a speed template to update game world mechanics.

**Request Body:**
```json
{
  "templateId": "x2"
}
```

## Speed Templates

The system includes 5 comprehensive speed templates matching Travian's scaling:

### x1 Normal Speed
- Classic Travian experience
- Standard timing for all mechanics
- Balanced for casual players

### x2 Fast Speed
- Everything 2x faster
- Reduced culture point requirements
- Shorter protection periods

### x3 Very Fast
- Quick competition rounds
- Significantly reduced celebration times
- Faster item availability

### x5 Tournament Speed
- High-speed competitive play
- Minimal celebration times
- Very fast item progression

### x10 Extreme Speed
- Maximum speed for testing/special events
- Ultra-fast everything
- Minimal delays

## Admin UI Components

### GameWorldManager
Comprehensive interface for:
- Creating new game worlds
- Viewing world status and player counts
- Starting game worlds
- Configuring tribes and settings

### SpeedConfiguration
Detailed speed template viewer with:
- Tabbed interface for different mechanic categories
- Visual breakdown of scaling effects
- One-click template application
- Real-time preview of changes

## Game Mechanics Implementation

### Speed Scaling
All game mechanics scale according to Travian's formulas:

- **Construction Times**: Divided by speed factor
- **Troop Training**: Divided by speed factor
- **Movement Speed**: Multiplied by speed factor
- **Resource Production**: Multiplied by speed factor
- **Culture Points**: Adjusted based on speed (faster = easier expansion)
- **Item Availability**: Earlier availability on faster servers
- **Event Timing**: Compressed timeline on faster servers

### Culture Points System
Implements Travian's culture point mechanics:
- Speed-scaled starting points
- Celebration time divisors
- Artwork production multipliers
- Expansion requirements

### Item System
Speed-based item availability:
- Tier progression timing
- Auction duration scaling
- Smelting time adjustments

### Event System
Game progression events:
- Registration closure timing
- Artefact introduction
- Construction plan availability
- Game end conditions

## Usage Examples

### Creating a Tournament World

```typescript
const tournamentWorld = await fetch('/api/admin/game-worlds', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    worldName: "Tournament Arena",
    worldCode: "ta1",
    version: "TOURNAMENT",
    region: "INTERNATIONAL",
    speed: 5,
    availableTribes: ["ROMANS", "TEUTONS", "GAULS", "HUNS", "EGYPTIANS", "SPARTANS"]
  })
})
```

### Applying Speed Template

```typescript
await fetch('/api/admin/speed-templates', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    templateId: "x5"
  })
})
```

### Starting a Game World

```typescript
await fetch('/api/admin/game-worlds/world-id/start', {
  method: 'POST'
})
```

## Security & Audit

All admin actions are:
- JWT authenticated
- Role-based permission controlled
- Audit logged with details
- Real-time monitored

## Performance Considerations

- Speed changes affect all game calculations
- Higher speeds increase server load
- Database queries optimized for scaling
- WebSocket updates frequency scales with speed

## Monitoring & Analytics

The system provides:
- Real-time player counts per world
- Game state monitoring
- Performance metrics
- Audit trail of all changes

## Future Enhancements

Potential additions:
- World migration tools
- Bulk configuration updates
- Advanced analytics dashboard
- Automated world lifecycle management
- Cross-world player transfers

---

This implementation provides a complete admin system for managing multiple Travian: Legends-style game worlds with all the speed scaling and configuration options from the original game.


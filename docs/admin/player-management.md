# Player Management

The Player Management system provides administrators with comprehensive tools to manage player accounts, moderate behavior, and maintain game balance.

## Features

### Player Actions

#### Ban Player
- Temporarily or permanently restrict player access
- Requires ban reason for accountability
- Banned players cannot perform game actions

#### Unban Player
- Restore access to previously banned players
- Removes ban restriction and reason

#### Rename Player
- Change player display names
- Validates uniqueness of new names
- Updates all references to the player

#### Move Player Village
- Relocate a player's village to new coordinates
- Validates target location availability
- Updates all related game data

## API Endpoints

### Get All Players
```http
GET /api/admin/players
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "player-id",
      "playerName": "PlayerName",
      "totalPoints": 1250,
      "rank": 15,
      "villages": [
        {
          "id": "village-id",
          "name": "Village Name",
          "x": 50,
          "y": 75
        }
      ],
      "isDeleted": false,
      "banReason": null
    }
  ]
}
```

### Ban Player
```http
POST /api/admin/players/{playerId}/ban
```

**Request Body:**
```json
{
  "reason": "Violation of game rules"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Player banned successfully"
}
```

### Unban Player
```http
POST /api/admin/players/{playerId}/unban
```

**Response:**
```json
{
  "success": true,
  "message": "Player unbanned successfully"
}
```

### Rename Player
```http
POST /api/admin/players/{playerId}/rename
```

**Request Body:**
```json
{
  "newName": "NewPlayerName"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Player renamed successfully"
}
```

### Move Player Village
```http
POST /api/admin/players/{playerId}/move-village
```

**Request Body:**
```json
{
  "x": 75,
  "y": 100
}
```

**Response:**
```json
{
  "success": true,
  "message": "Player village moved successfully"
}
```

## Usage

### Admin Dashboard
1. Navigate to Admin Dashboard → Players tab
2. View player list with current status and statistics
3. Click action buttons next to player names:
   - **Rename**: Change player display name
   - **Move**: Relocate player's village
   - **Ban/Unban**: Toggle player access

### Action Dialogs
- Ban actions require entering a reason
- Rename actions validate name uniqueness
- Move actions require coordinate input
- All actions show confirmation dialogs

## Validation Rules

### Player Names
- Must be 1-20 characters long
- Must be unique across all players
- Cannot contain special characters (basic validation)
- Case-insensitive uniqueness check

### Village Movement
- Target coordinates must be within world bounds
- Target location must not be occupied
- Player must own the village being moved
- Village must exist and be active

### Ban Reasons
- Required for all ban actions
- Stored for audit purposes
- Cannot be empty or whitespace-only

## Database Schema

```prisma
model Player {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  playerName      String    @unique
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  lastActiveAt    DateTime  @default(now())

  // Player Stats
  totalPoints     Int       @default(0)
  rank            Int       @default(0)
  wavesSurvived   Int       @default(0)
  troopsKilled    Int       @default(0)
  troopsLost      Int       @default(0)

  // Status
  isDeleted       Boolean   @default(false)
  deletedAt       DateTime?
  banReason       String?
  beginnerProtectionUntil DateTime?

  // Relations
  villages        Village[]
  tribeId         String?
  tribe           Tribe?    @relation("TribeMembers", fields: [tribeId], references: [id])

  @@index([userId])
  @@index([playerName])
  @@index([totalPoints])
  @@index([rank])
}
```

## Audit Logging

All player management actions are logged:

### Ban Actions
- Action: `BAN_PLAYER`
- Details: Ban reason provided
- Target Type: `PLAYER`
- Target ID: Player ID

### Unban Actions
- Action: `UNBAN_PLAYER`
- Details: Player unbanned
- Target Type: `PLAYER`
- Target ID: Player ID

### Rename Actions
- Action: `RENAME_PLAYER`
- Details: Old name → New name
- Target Type: `PLAYER`
- Target ID: Player ID

### Move Actions
- Action: `MOVE_PLAYER_VILLAGE`
- Details: Old coordinates → New coordinates
- Target Type: `PLAYER`
- Target ID: Player ID

## Effects on Gameplay

### Banned Players
- Cannot perform any game actions
- Existing attacks and movements are cancelled
- Village production continues (consider stopping)
- Cannot access game interface

### Renamed Players
- Display name changes immediately
- All references update automatically
- Tribe memberships and alliances unaffected
- Message history preserves original names

### Village Movement
- All village data moves to new location
- Existing buildings and troops move with village
- Ongoing constructions continue
- Trade routes may be affected

## Security Considerations

- All actions require administrator authentication
- Input validation prevents SQL injection and XSS
- Actions are logged for accountability
- Rate limiting prevents abuse

## Performance Impact

- Player list queries should be optimized with proper indexing
- Bulk operations may require special handling
- Village movement involves multiple database updates
- Consider caching frequently accessed player data

## Monitoring

Track these metrics after player management actions:
- Player activity levels
- Ban/unban ratios
- Name change frequency
- Village movement patterns
- Administrator action logs

## Best Practices

### Ban Management
- Always provide clear, specific ban reasons
- Communicate bans through in-game messaging when possible
- Consider appeal processes for serious cases
- Review bans periodically

### Player Support
- Use rename feature for name violations
- Use village movement for griefing resolution
- Document all moderation actions
- Maintain consistent enforcement policies

### Data Integrity
- Validate all data before making changes
- Use database transactions for complex operations
- Backup data before major player modifications
- Test operations on development environment first

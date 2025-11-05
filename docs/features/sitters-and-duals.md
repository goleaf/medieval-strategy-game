# Sitters and Duals

## Overview

The Sitters and Duals feature allows players to grant trusted allies temporary or full access to their accounts when they cannot be online. This system is inspired by the Travian game mechanics and provides account security while enabling account management during absences.

## Key Concepts

### Sitters
- **Definition**: Trusted players who can perform limited actions on another player's account
- **Access Level**: Restricted permissions based on owner settings
- **Limit**: Maximum 2 sitters per account
- **Requirements**: Must be in the same tribe/alliance
- **Activity Impact**: Sitter activity reduces owner's inactivity allowance

### Duals
- **Definition**: Players who can access another player's account with full permissions
- **Access Level**: Complete control over the account
- **Limit**: No limit on number of duals, but only one avatar per gameworld
- **Activity Impact**: Dual activity counts as owner activity (maintains inactivity allowance)

## Inactivity Allowance System

### How It Works
- Every account starts with **14 days** of inactivity allowance
- Daily calculation determines allowance changes:
  - **+1 day**: Owner active OR (owner + sitter active)
  - **-1 day**: Only sitter active (no owner activity)
  - **0 change**: No activity from owner or sitters
- Maximum allowance: 14 days
- When allowance reaches 0, all sitters are automatically deactivated

### Warning System
- **3 days remaining**: Warning notification sent to owner
- **0 days remaining**: All sitters deactivated, audit log created

## Database Schema

### Player Model Extensions
```typescript
model Player {
  // ... existing fields ...

  // Sitters & Duals - Inactivity Allowance System
  inactivityAllowanceDays Int @default(14) // Days of inactivity allowance (max 14)
  lastOwnerActivityAt      DateTime @default(now()) // Last activity by account owner

  // Relations
  sittersAsOwner   Sitter[]          @relation("SitterOwner")
  sittersAsSitter  Sitter[]          @relation("SitterPlayer")
  duals            Dual[]
}
```

### Sitter Model
```typescript
model Sitter {
  id        String   @id @default(cuid())

  // Relationships
  ownerId   String   // Player being sat
  owner     Player   @relation("SitterOwner", fields: [ownerId], references: [id])
  sitterId  String   // Player doing the sitting
  sitter    Player   @relation("SitterPlayer", fields: [sitterId], references: [id])

  // Permissions
  canSendRaids        Boolean @default(false)
  canUseResources     Boolean @default(false)
  canBuyAndSpendGold  Boolean @default(false)

  // Status
  isActive  Boolean   @default(true)
  addedAt   DateTime  @default(now())
}
```

### Dual Model
```typescript
model Dual {
  id        String   @id @default(cuid())

  // Relationships
  playerId  String   // Player avatar being controlled
  player    Player   @relation(fields: [playerId], references: [id])

  // Lobby account
  lobbyUserId String   // User controlling the avatar
  lobbyUsername String // Full lobby account name

  // Status
  isActive  Boolean   @default(true)
  invitedAt DateTime  @default(now())
  acceptedAt DateTime?
}
```

## API Endpoints

### Sitter Management

#### GET `/api/sitters`
Returns current sitters and inactivity allowance for authenticated player.

**Response:**
```json
{
  "success": true,
  "data": {
    "sitters": [
      {
        "id": "sitter-id",
        "sitterId": "player-id",
        "sitterName": "PlayerName",
        "lastActiveAt": "2025-01-01T00:00:00Z",
        "permissions": {
          "canSendRaids": true,
          "canUseResources": false,
          "canBuyAndSpendGold": false
        },
        "addedAt": "2025-01-01T00:00:00Z"
      }
    ],
    "inactivityAllowance": 12,
    "lastOwnerActivity": "2025-01-01T00:00:00Z"
  }
}
```

#### POST `/api/sitters`
Adds a new sitter with specified permissions.

**Request:**
```json
{
  "sitterId": "player-id",
  "permissions": {
    "canSendRaids": true,
    "canUseResources": false,
    "canBuyAndSpendGold": false
  }
}
```

#### POST `/api/sitters/remove`
Removes a sitter relationship.

**Request:**
```json
{
  "sitterId": "player-id"
}
```

#### POST `/api/sitters/permissions`
Validates if a sitter has permission for a specific action.

**Request:**
```json
{
  "sitterId": "sitter-user-id",
  "ownerId": "owner-player-id",
  "action": "sendRaids"
}
```

### Dual Management

#### GET `/api/duals`
Returns current dual relationships for authenticated user.

#### POST `/api/duals`
Invites a new dual.

**Request:**
```json
{
  "lobbyUserId": "lobby-user-id",
  "lobbyUsername": "LobbyUsername"
}
```

#### POST `/api/duals/accept`
Accepts a dual invitation.

#### POST `/api/duals/remove`
Removes a dual relationship.

### Authentication

#### POST `/api/auth/sitter-login`
Creates a sitter session for accessing another player's account.

#### POST `/api/auth/dual-login`
Creates a dual session for full account access.

#### GET `/api/sitters/accounts`
Returns available accounts that the user can sit for.

#### GET `/api/duals/accounts`
Returns available accounts that the user can dual control.

## Permission System

### Sitter Permissions

1. **Send Raids** (`canSendRaids`)
   - Allows launching attacks and raids
   - Requires tribe membership validation

2. **Use Resources** (`canUseResources`)
   - Allows spending resources on buildings, troops, etc.
   - Checked on building upgrades, troop training, etc.

3. **Buy and Spend Gold** (`canBuyAndSpendGold`)
   - Allows purchasing gold and spending it
   - Unlimited spending permission (high trust required)

### Permission Enforcement

Permissions are enforced through middleware and service methods:

```typescript
// Check permission before action
const hasPermission = await SitterPermissions.checkPermission(
  sitterId,
  ownerId,
  'useResources'
)

if (!hasPermission) {
  return NextResponse.json({
    error: "Sitter does not have permission to use resources"
  }, { status: 403 })
}
```

## Activity Tracking

### Automatic Activity Recording

The system automatically tracks activity through:

1. **Authentication Middleware**: Records activity on API calls
2. **Daily Job**: Updates inactivity allowance based on activity patterns
3. **Session Management**: Tracks sitter vs owner activity separately

### Activity Rules

- **Owner Activity**: Any action by the account owner
- **Sitter Activity**: Actions performed while in sitter mode
- **Dual Activity**: Counts as owner activity (maintains allowance)

## UI Components

### SitterManager Component
- Displays current sitters with permissions
- Shows inactivity allowance status
- Allows adding/removing sitters with permission configuration
- Provides warnings for low allowance

### DualManager Component
- Shows pending and accepted dual invitations
- Allows inviting new duals
- Displays dual status and world information

### SitterLogin Component
- Modal for selecting and logging into sitter accounts
- Shows available accounts with allowance status
- Handles sitter session management

## Security Considerations

### Access Validation
- All sitter/dual access requires explicit permission
- Sitter permissions validated on each action
- Dual access limited to one avatar per gameworld
- Session tokens expire after 24 hours

### Audit Logging
- All sitter/dual management actions are logged
- Inactivity allowance depletion triggers audit entries
- Permission changes are tracked

### Account Protection
- Sitter access automatically revoked when allowance reaches 0
- Owner activity always takes precedence
- Clear visual indicators when in sitter/dual mode

## Implementation Details

### Background Jobs
- **Inactivity Allowance Update**: Runs daily at midnight
- Processes all players and updates allowance based on activity rules
- Sends warnings and deactivates sitters when allowance depleted

### Session Management
- Separate JWT tokens for sitter and dual sessions
- Authentication middleware detects session type
- Activity tracking differentiates between owner, sitter, and dual actions

### Permission Checks
- Integrated into key game actions (building, training, attacking)
- Graceful failure with clear error messages
- Owner actions always bypass permission checks

## Usage Examples

### Adding a Sitter
```typescript
const sitter = await SitterDualService.addSitter(ownerId, sitterId, {
  canSendRaids: true,
  canUseResources: false,
  canBuyAndSpendGold: false
})
```

### Checking Sitter Permissions
```typescript
const canUseResources = await SitterDualService.validateSitterPermissions(
  sitterId,
  ownerId,
  'useResources'
)
```

### Creating Dual Session
```typescript
const session = await SitterDualService.createDualSession(lobbyUserId, playerId)
// Returns { token, player }
```

## Future Enhancements

- **Advanced Permissions**: Granular permission controls (specific building types, troop types)
- **Time-based Access**: Temporary sitter access with expiration
- **Activity Reports**: Detailed logs of sitter/dual activities
- **Notification System**: Real-time notifications for sitter actions
- **Multi-world Duals**: Allow duals across different game worlds

## Troubleshooting

### Common Issues

1. **Cannot Add Sitter**: Ensure both players are in the same tribe
2. **Sitter Permissions Denied**: Check permission settings and account allowance
3. **Dual Access Failed**: Verify dual invitation was accepted and no conflicting duals exist
4. **Inactivity Allowance Not Updating**: Check that the daily job is running properly

### Debug Commands

```bash
# Check inactivity allowance status
SELECT id, playerName, inactivityAllowanceDays, lastOwnerActivityAt FROM Player;

# View active sitters
SELECT * FROM Sitter WHERE isActive = true;

# View dual relationships
SELECT * FROM Dual WHERE isActive = true;
```


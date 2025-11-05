# Avatar Respawn Feature

## Overview

The Avatar Respawn feature allows players to abandon their current avatar and start fresh with a new village. This is useful when players want to restart due to poor starting position, wrong tribe selection, or other strategic reasons.

## Feature Based On

This feature is based on the Travian: Legends respawn system as documented in the official support article: [Abandoning Your Avatar and Respawning](https://support.travian.com/en/support/solutions/articles/7000061167-abandoning-your-avatar-and-respawning)

## How to Access

1. Navigate to the **Settings** page from the dashboard (cogwheel icon in navigation)
2. Open the **Avatar** tab
3. Click the **"Respawn Avatar"** button

## Respawn Conditions

Players can only respawn if **all** of the following conditions are met:

### Required Conditions
- ✅ **Game world registration is open** - The game world must still accept new registrations
- ✅ **Avatar is not scheduled for deletion** - The current avatar must not be marked for deletion
- ✅ **Avatar is not banned** - The player account must not have an active ban
- ✅ **Still under Beginner's Protection** - The player's beginner protection period must not have expired
- ✅ **Auction House is not fully unlocked** - The player's hero must not have completed 20+ adventures
- ✅ **Only one village** - The player must have exactly one village (no expansions)

### Condition Checking

The system automatically checks these conditions and displays any blocking reasons in the UI. If any condition is not met, the "Respawn Avatar" button will be disabled with explanatory text.

## Respawn Process

### Step 1: Confirmation Dialog
When clicking "Respawn Avatar", a confirmation dialog appears with:
- Warning about the permanent nature of the action
- Selection of map quarter (NW, NE, SW, SE)
- Selection of tribe (Romans, Teutons, Gauls, Huns, Egyptians, Spartans, Vikings)
- New player name input
- Text confirmation field requiring "respawn" to be typed

### Step 2: Data Transfer
The following data is handled during respawn:

#### Transferred Data
- **Purchased Gold**: Any gold purchased with real money is transferred to the new avatar
- **Materials**: Crafting materials and resources are transferred
- **User Account**: Remains linked to the same user account

#### Non-Transferred Data
- **150 Gold Starter Promo**: The initial promotional gold is not transferred
- **Progress**: All villages, buildings, troops, and progress is lost
- **Hero Adventures**: Adventure progress is reset
- **Tribe Membership**: Any tribe affiliations are lost

### Step 3: Avatar Cleanup
The old avatar is handled as follows:
- If created less than 1 hour ago: Deleted immediately
- If older: Marked as deleted but remains in game world until automatic cleanup
- Player name is changed to free it up (e.g., `OldName_abandoned_1234567890`)

### Step 4: New Avatar Creation
A fresh avatar is created with:
- New player name (as specified)
- New village at a random location in the selected map quarter
- Fresh beginner protection period
- Selected tribe preference (stored for future game mechanics)
- Standard starting resources

## Technical Implementation

### API Endpoints

#### GET `/api/auth/player-data`
Retrieves player information needed for respawn condition checking:
```typescript
{
  player: {
    id: string,
    playerName: string,
    isDeleted: boolean,
    banReason: string | null,
    beginnerProtectionUntil: string | null,
    hero: { adventuresCompleted: number } | null,
    Village: Array<{ id: string }>
  },
  gameWorld: {
    isRegistrationOpen: boolean,
    isActive: boolean
  }
}
```

#### POST `/api/auth/respawn`
Performs the respawn operation:
```typescript
// Request
{
  mapQuarter: "NW" | "NE" | "SW" | "SE",
  tribe: "ROMANS" | "TEUTONS" | "GAULS" | "HUNS" | "EGYPTIANS" | "SPARTANS" | "VIKINGS",
  playerName: string
}

// Response
{
  success: boolean,
  message?: string,
  error?: string
}
```

### Database Transactions

The respawn process uses database transactions to ensure data consistency:

1. **Mark old player as deleted** and rename to free up the player name
2. **Create new player** with fresh data
3. **Transfer materials/gold** from old to new player
4. **Initialize beginner protection** for new player
5. **Create new village** at random location
6. **Log audit trail** (when audit system is implemented)

### Frontend Components

#### Settings Page (`/settings`)
- Displays current player information
- Shows respawn conditions and blocking reasons
- Contains respawn confirmation dialog

#### Confirmation Dialog
- Validates all input fields
- Requires "respawn" text confirmation
- Shows warning about permanent action
- Handles API call and user feedback

### Security Considerations

- **Authentication Required**: Only authenticated users can access respawn
- **Authorization Check**: Users can only respawn their own avatars
- **Input Validation**: All inputs are validated server-side
- **Rate Limiting**: Should be implemented to prevent abuse
- **Audit Logging**: All respawn actions should be logged

### Error Handling

The system handles various error conditions:
- **Unauthorized Access**: Returns 401 if not authenticated
- **Invalid Input**: Returns 400 for missing or invalid fields
- **Condition Not Met**: Returns 400 with specific blocking reasons
- **Name Conflict**: Returns 409 if player name is already taken
- **Server Errors**: Returns 500 for unexpected errors

## UI/UX Design

### Settings Page Layout
```
┌─ Settings ──────────────────┐
│ [Avatar] [Profile] [Other]  │
├─────────────────────────────┤
│ Player Name: John Doe       │
│ Villages: 1                 │
│ Beginner Protection: Active │
│                             │
│ ┌─ Respawn Avatar ───────┐  │
│ │ Abandon current avatar │  │
│ │ and start fresh        │  │
│ │ [Respawn Avatar]       │  │
│ └─────────────────────────┘  │
│                             │
│ ⚠️ Cannot respawn because: │
│ • Auction house unlocked   │
└─────────────────────────────┘
```

### Confirmation Dialog
```
┌─ Confirm Avatar Respawn ──────────────────┐
│ ⚠️ Warning: This cannot be undone!      │
│                                          │
│ Map Quarter: [NW ▼]                      │
│ Tribe:      [Romans ▼]                   │
│ New Name:   [____________]               │
│                                          │
│ Type "respawn" to confirm: [________]    │
│                                          │
│              [Cancel] [Confirm Respawn]  │
└──────────────────────────────────────────┘
```

## Testing

### Unit Tests
- Condition validation logic
- Input sanitization
- Database transaction integrity

### Integration Tests
- Full respawn flow
- Data transfer verification
- Error condition handling

### Manual Testing Checklist
- [ ] Verify all respawn conditions work correctly
- [ ] Test data transfer (materials/gold)
- [ ] Confirm old avatar cleanup
- [ ] Verify new avatar creation
- [ ] Test error scenarios
- [ ] Check UI responsiveness

## Future Enhancements

### Potential Additions
- **Respawn History**: Track previous respawns for players
- **Respawn Cooldown**: Prevent rapid successive respawns
- **Partial Transfer**: Allow selective data transfer
- **Respawn Cost**: Require gold or resources for respawn
- **Map Quarter Preferences**: Allow preferred starting areas

### Analytics
- Track respawn frequency and reasons
- Monitor player retention after respawn
- Analyze optimal starting conditions

## Related Features

- **Beginner Protection**: Works with respawn conditions
- **Hero System**: Adventure completion affects respawn eligibility
- **Tribe System**: Tribe selection during respawn
- **Village System**: New village creation during respawn
- **Audit System**: Logs respawn actions for moderation

## Changelog

### Version 1.0.0
- Initial implementation based on Travian: Legends respawn system
- Basic condition checking and validation
- Complete respawn flow with data transfer
- Frontend UI with confirmation dialog
- API endpoints for player data and respawn
- Database transaction handling
- Documentation and testing guidelines

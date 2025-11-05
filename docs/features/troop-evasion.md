# Troop Evasion (Gold Club Feature)

## Overview

Troop Evasion is a premium Gold Club feature that allows players to automatically save their troops from incoming attacks. When activated, troops temporarily leave the capital village to avoid being destroyed during combat.

## How It Works

### Activation
- Available only for capital villages
- Requires Gold Club membership
- Can be toggled on/off in the Rally Point management tab
- Located at: Village → Manage Troops → Rally Point tab

### Evasion Trigger
- Automatically activates when an incoming attack is detected
- Only triggers if no other troops are returning within 10 seconds before the attack
- Only affects troops trained in the capital village
- Reinforcements from other players will NOT evade

### Evasion Process
1. **Detection**: System detects incoming attack during combat resolution
2. **Validation**: Checks if evasion conditions are met (capital village, Gold Club, no returning troops)
3. **Evasion**: All eligible troops are temporarily removed from the village
4. **Attack Cancellation**: The incoming attack is cancelled and attacker troops are returned
5. **Return Timer**: Evaded troops automatically return after 180 seconds (3 minutes)

### Return Mechanics
- Troops return exactly 3 minutes after evasion
- All troop types and quantities are restored
- Hero (if present) also evades and returns with troops
- Return is processed automatically by the game tick system

## User Interface

### Rally Point Management
Located in the troop management page under the "Rally Point" tab:

```
Village → Manage Troops → Rally Point Tab
```

### Settings
- **Activation Checkbox**: "Activate troop evasion for your capital"
- **Status Display**: Shows current evasion status
- **Incoming Attacks**: Lists all incoming attacks with evasion status
- **Gold Club Check**: Validates premium membership
- **Capital Check**: Ensures village is a capital

### Notifications
Players receive system messages for:
- Evasion activation
- Successful evasion of attacks
- Troop return completion
- Attack cancellation notifications

## Technical Implementation

### Database Schema
```sql
-- Village table additions
ALTER TABLE Village ADD COLUMN troopEvasionEnabled BOOLEAN DEFAULT FALSE;

-- Player table additions
ALTER TABLE Player ADD COLUMN goldClubMembership BOOLEAN DEFAULT FALSE;
```

### API Endpoints

#### Evasion Settings
```
PUT /api/villages/[id]/evasion
```
- Updates evasion settings for a village
- Validates Gold Club membership and capital status

#### Incoming Attacks
```
GET /api/villages/[id]/attacks?type=incoming
```
- Returns list of incoming attacks for a village
- Used to display attack information in rally point UI

### Backend Logic

#### Combat Service (`lib/game-services/combat-service.ts`)
- `processAttackResolution()`: Checks for evasion before combat
- `triggerTroopEvasion()`: Handles evasion activation
- `processTroopReturn()`: Handles troop restoration

#### Game Tick System (`lib/jobs/game-tick.ts`)
- `processTroopEvasionReturns()`: Processes scheduled troop returns
- Runs every game tick to check for completed evasion timers

### Evasion Conditions
```typescript
const shouldEvade = (
  isCapitalVillage &&
  hasGoldClubMembership &&
  village.troopEvasionEnabled &&
  noReturningTroopsWithin10Seconds
)
```

### Timing
- **Detection Window**: Attack must be detected during resolution phase
- **Return Delay**: Exactly 180 seconds (3 minutes) after evasion
- **Validation Window**: 10-second check for returning troops

## Game Balance

### Benefits
- Protects capital troops from farming attacks
- Allows players to be offline during active periods
- Premium feature encourages Gold Club subscriptions

### Limitations
- Only works for capital villages
- Requires Gold Club membership
- 3-minute cooldown for troop return
- Doesn't protect village resources
- Hero always evades (cannot be used for defense)

### Strategic Considerations
- Players should still use crannies for resource protection
- Evasion doesn't prevent loyalty loss from attacks
- Best used during known farming periods
- Consider alliance support as alternative

## Testing Scenarios

### Basic Evasion
1. Activate evasion on capital village
2. Launch attack on village
3. Verify troops evade and attack is cancelled
4. Wait 3 minutes and verify troop return

### Edge Cases
1. **Returning Troops**: Attack during troop return window (should not evade)
2. **Non-Capital**: Attempt evasion on non-capital (should fail)
3. **No Gold Club**: Attempt evasion without premium (should fail)
4. **Multiple Attacks**: Multiple incoming attacks (should handle correctly)

### Integration Tests
1. **UI Integration**: Rally point tab displays correctly
2. **API Integration**: Settings persist and update properly
3. **Notification System**: Messages sent to both attacker and defender
4. **Game Tick Processing**: Automatic troop return works

## Future Enhancements

### Potential Features
- **Evasion Cooldowns**: Prevent spam evasion
- **Selective Evasion**: Choose which troop types to evade
- **Evasion Upgrades**: Reduce return time with premium upgrades
- **Alliance Evasion**: Coordinate evasion across alliance villages

### Technical Improvements
- **Real-time Notifications**: WebSocket updates for evasion events
- **Evasion History**: Track past evasion events
- **Advanced Filtering**: Filter incoming attacks by type/distance
- **Mobile Support**: Optimized UI for mobile devices

## Changelog

### Version 1.0.0
- Initial implementation of troop evasion feature
- Basic evasion mechanics and UI
- Gold Club integration
- System notifications
- Game tick processing for troop returns

## Related Features

- **Gold Club System**: Premium membership management
- **Attack System**: Incoming attack detection and resolution
- **Notification System**: System message delivery
- **Village Management**: Capital village identification
- **Troop System**: Troop training and management

## Support

For issues with troop evasion:
1. Verify Gold Club membership is active
2. Ensure village is set as capital
3. Check rally point settings are enabled
4. Confirm no troops are returning within 10 seconds of attack

## API Reference

### Types
```typescript
interface TroopEvasionSettings {
  villageId: string
  enabled: boolean
  isCapital: boolean
  hasGoldClub: boolean
}

interface EvasionEvent {
  villageId: string
  attackId: string
  evadedTroops: Array<{ type: string; quantity: number }>
  returnAt: Date
  status: 'EVADING' | 'RETURNING' | 'COMPLETED'
}
```

### Error Codes
- `400`: Invalid request parameters
- `403`: Gold Club membership required
- `403`: Evasion only available for capitals
- `404`: Village not found

---

*This feature is part of the Gold Club premium service. Gold Club membership is required to access troop evasion functionality.*


# Beginner Protection

## Overview

Beginner Protection is a safety mechanism that gives new players time to learn the game and build up their villages without being attacked by other players. This feature is based on the Travian: Legends beginner protection system.

## How It Works

### Protection Duration

The duration of beginner protection depends on the game world's speed setting:

- **x1 speed**: 5 days + 3-day extension (8 days total)
- **x2 speed**: 3 days + 3-day extension (6 days total)
- **x3 speed**: 3 days + 3-day extension (6 days total)
- **x5 speed**: 2 days + 2-day extension (4 days total)
- **x10 speed**: 1 day + 1-day extension (2 days total)

### Protection Benefits

While under beginner protection, players:

1. **Cannot be attacked** by other players
2. **Cannot attack** other players (except Natars and unoccupied oases)
3. **Cannot send resources** in marketplace trades
4. **Limited trade acceptance**: Can only accept trades that are 1:1 or better
5. **Safe resource receiving**: Can receive resources from unprotected players

### Extension Option

Players can extend their protection **once** by an additional period (matching the world speed duration). The extension offer appears when protection is about to expire.

## Technical Implementation

### Database Schema

The `Player` model includes beginner protection fields:

```prisma
model Player {
  // ... other fields
  beginnerProtectionUntil DateTime? // When protection expires
  hasExtendedProtection   Boolean  @default(false) // Whether extension was used
}
```

### Core Services

#### ProtectionService

Located in `lib/game-services/protection-service.ts`, this service handles:

- **Initialization**: Sets protection duration based on world speed
- **Status checking**: Determines if a player/village is protected
- **Extension logic**: Allows one-time protection extension
- **Time calculations**: Handles world speed-based durations

Key methods:
- `initializeProtection(playerId)`: Sets up protection for new players
- `isPlayerProtected(playerId)`: Checks if player has active protection
- `extendProtection(playerId)`: Extends protection (once only)
- `canExtendProtection(playerId)`: Checks if extension is available

### API Endpoints

#### Protection Management API

**GET** `/api/protection?playerId={id}`
- Returns protection status, time remaining, and extension availability

**POST** `/api/protection`
- Body: `{ action: "EXTEND", playerId: "..." }`
- Extends protection if eligible

#### Attack Launch API

**POST** `/api/attacks/launch`
- Validates protection rules for attackers and defenders
- Protected players can only attack Natars and unoccupied oases
- Protected villages cannot be attacked (except by Natars)

#### Marketplace API

**POST** `/api/market/orders`
- Prevents protected players from creating sell orders
- Enforces trade restrictions

**PATCH** `/api/market/orders`
- Validates trade acceptance rules for protected players
- Low population players (<200) have same restrictions

### UI Components

#### ProtectionStatus Component

Displays current protection status and extension options.

```tsx
<ProtectionStatus playerId={playerId} />
```

Features:
- Shows protection time remaining
- Extension button (when available)
- Protection benefits explanation
- Visual status indicators

#### ProtectionInfobox Component

Shows notifications for protection expiration and extension offers.

```tsx
<ProtectionInfobox playerId={playerId} />
```

Features:
- Expiration warnings (last 6 hours)
- Extension offers (last 24 hours)
- Dismissible notifications

### Game Logic Integration

#### Combat System

The combat service (`lib/game-services/combat-service.ts`) includes protection checks:

- **Attack Resolution**: Cancels attacks against protected villages
- **Scouting**: Allowed even against protected villages
- **Natar Attacks**: Always allowed regardless of protection status

#### Village System

Villages inherit protection status from their owner:

- Protected villages cannot be attacked
- Protection applies to all villages owned by a player
- Capital and non-capital villages have the same protection

## Usage Examples

### Checking Protection Status

```typescript
import { ProtectionService } from '@/lib/game-services/protection-service'

const isProtected = await ProtectionService.isPlayerProtected(playerId)
const timeLeft = await ProtectionService.getProtectionTimeRemaining(playerId)
const canExtend = await ProtectionService.canExtendProtection(playerId)
```

### Extending Protection

```typescript
const success = await ProtectionService.extendProtection(playerId)
if (success) {
  // Protection extended successfully
}
```

### UI Integration

```tsx
// In village dashboard
<ProtectionInfobox playerId={playerId} />

// In player profile/settings
<ProtectionStatus playerId={playerId} />
```

## Configuration

### World Speed Settings

Protection duration is configured in the `GameWorld` model:

```prisma
model GameWorld {
  speed Int @default(1) // 1, 2, 3, 5, 10
  beginnerProtectionDays Int @default(5)
}
```

### Enabling/Disabling

Protection can be globally enabled/disabled via `WorldConfig`:

```prisma
model WorldConfig {
  beginnerProtectionEnabled Boolean @default(true)
}
```

## Testing

### Unit Tests

Test protection logic with different world speeds:

```typescript
describe('ProtectionService', () => {
  test('x1 world gives 5 days protection', async () => {
    // Test implementation
  })

  test('extension adds correct duration', async () => {
    // Test implementation
  })
})
```

### Integration Tests

Test full attack/trade flows with protection:

```typescript
describe('Protection Integration', () => {
  test('protected player cannot launch attacks', async () => {
    // Test API response
  })

  test('marketplace restrictions work', async () => {
    // Test trade validation
  })
})
```

## Migration Notes

When upgrading existing games:

1. **Database Migration**: Add `hasExtendedProtection` field to Player model
2. **Existing Players**: Set `hasExtendedProtection = false` for all existing players
3. **Protection Calculation**: Recalculate protection end times based on world speed
4. **UI Updates**: Add protection status components to relevant pages

## Related Features

- **Night Bonus**: Defense bonus during night hours
- **Alliance System**: Diplomatic protection options
- **Vacation Mode**: Alternative protection mechanism
- **Marketplace**: Trade restrictions and bonuses

## Support and Maintenance

### Monitoring

Track protection usage metrics:
- Active protection count by world speed
- Extension usage rates
- Attack attempts against protected villages

### Common Issues

1. **Protection not activating**: Check world configuration and player creation flow
2. **Extension not working**: Verify `hasExtendedProtection` flag and world speed settings
3. **UI not updating**: Check API responses and component state management

### Future Enhancements

Potential improvements:
- Configurable protection durations per tribe
- Premium protection extensions
- Protection trading between players
- Advanced protection analytics


# Beginner Protection

## Overview

Beginner Protection shields new accounts while they learn the game loop. The protection window now ends at the **earlier** of:

- A configurable duration (3–7 days depending on world settings).
- A configurable points threshold (default range 1,000–5,000).

This lets fast learners graduate early while still preventing predatory attacks against true beginners.

## How It Works

### Protection Duration & Exit Conditions

| World Speed | Base Duration | Optional Extension | Point Threshold (exit as soon as reached) |
| --- | --- | --- | --- |
| x1 | 7 days | +3 days (once) | 5,000 points |
| x2 | 5 days | +3 days | 4,000 points |
| x3 | 4 days | +2 days | 3,000 points |
| x5 | 3 days | +2 days | 2,000 points |
| x10 | 3 days | +1 day | 1,000 points |

World configs can override any of the values above per environment. Protection always ends immediately when:
- The player exceeds the configured points threshold.
- The player initiates an attack against a **non-protected** player (barbarian/Natar targets remain allowed).
- The optional extension expires.

### Protection Benefits

While protected, players:

1. **Cannot be attacked** or noble-converted by other players (Natar/barbarian attacks still apply).
2. **Can only attack** barbarians, Natars, and unoccupied oases. Attempting to hit a protected or non-protected player shows a warning that confirms early removal.
3. **Cannot attack other protected players**; UI clarifies this when selecting targets.
4. **Exit protection early** if they attack a non-protected player (explicit confirmation required).
5. **Cannot send outgoing resources** to other players (to prevent boosting) but may accept fair offers.
6. **Safe resource receiving**: Can receive shipments from unprotected players, subject to market ratio guardrails.
7. **Visible status indicator** appears on profile, village header, rally point, and world map tooltip.

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

- **Initialization**: Sets protection duration/thresholds based on world speed config.
- **Status checking**: Determines if a player or village is protected.
- **Extension logic**: Allows one-time protection extension.
- **Threshold enforcement**: Ends protection when point cap breached or restricted attack initiated.
- **Time calculations**: Handles world speed-based durations + UI countdown data.

Key methods:
- `initializeProtection(playerId)` — Sets up protection for new players.
- `isPlayerProtected(playerId)` — Checks if player has active protection.
- `extendProtection(playerId)` — Extends protection (once only).
- `canExtendProtection(playerId)` — Checks if extension is available.
- `shouldDropProtection(playerId, targetPlayerId)` — Determines if an action should end protection early.

### API Endpoints

#### Protection Management API

**GET** `/api/protection?playerId={id}`
- Returns protection status, time remaining, and extension availability

**POST** `/api/protection`
- Body: `{ action: "EXTEND", playerId: "..." }`
- Extends protection if eligible

#### Attack Launch API

**POST** `/api/attacks/launch`
- Validates protection rules for attackers and defenders.
- Protected players can only attack barbarians/Natars/unoccupied oases; hitting a normal player forces a confirmation step and drops protection.
- Protected villages cannot be attacked or noble-converted (except by Natars).

#### Marketplace API

**POST** `/api/market/orders`
- Prevents protected players from creating sell orders
- Enforces trade restrictions

**PATCH** `/api/market/orders`
- Validates trade acceptance rules for protected players
- Low population players (<200) have same restrictions

### UI Components

#### ProtectionStatus Component

Displays current protection status, point progress, and extension options.

```tsx
<ProtectionStatus playerId={playerId} />
```

Features:
- Timer showing remaining duration plus point progress bar (e.g., “3,500 / 5,000 points”).
- Extension button (when available).
- Visible badge indicating “Protected” across profile, village header, rally point, and minimap pins.
- Tooltip clarifying what actions will end protection.

#### ProtectionInfobox Component

Shows notifications for protection expiration, early-exit warnings, and tutorial prompts.

```tsx
<ProtectionInfobox playerId={playerId} />
```

Features:
- Expiration warnings (last 6 hours) plus “extend now” CTAs.
- Early removal warnings when queueing an attack on a non-protected player or starting noble research.
- Tutorial callouts linking to beginner quests while protection is active.

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

Protection duration + thresholds are configured in the `GameWorld` model:

```prisma
model GameWorld {
  speed Int @default(1) // 1, 2, 3, 5, 10
  beginnerProtectionDays Int @default(5)
  beginnerProtectionPointThreshold Int @default(5000)
}
```

### Enabling/Disabling

Protection can be globally enabled/disabled via `WorldConfig`:

```prisma
model WorldConfig {
  beginnerProtectionEnabled Boolean @default(true)
  beginnerProtectionMaxDays Int @default(7)
  beginnerProtectionMinDays Int @default(3)
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

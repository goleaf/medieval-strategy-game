# Canceling Actions

This feature implements the canceling actions system based on Travian: Legends mechanics, allowing players to cancel certain in-game actions while preventing others from being canceled to maintain game balance.

## Overview

In the medieval strategy game, some actions can be canceled while others are permanent once started. This prevents players from abusing the system to hide resources during attacks or manipulate game mechanics.

## Cancelable Actions

### Building Construction

**What can be canceled:**
- Building upgrades in the construction queue
- Field upgrades (resource production buildings)

**Cancel Rules:**
- **Level 1 upgrades**: Full refund of all invested resources
- **Higher level upgrades**: Partial refund equal to the cost difference between current and new level
- **Queue position**: Only buildings not in first position can be canceled
- **Research conflict**: Buildings currently researching cannot be canceled

**API Endpoint:**
```
POST /api/buildings/cancel
Body: { "buildingId": "string" }
```

**Refund Calculation:**
```typescript
// Level 1 upgrade: Full refund
refund = constructionCost

// Higher level upgrade: Cost difference
refund = constructionCost - currentLevelCost
```

### Troop Movements

**What can be canceled:**
- Raid attacks
- Conquest attacks
- Reinforcement movements
- Scouting missions

**Cancel Rules:**
- **Time limit**: Only within the first 90 seconds after sending
- **Status**: Must be in progress (not arrived)
- **Troop return**: All troops are automatically returned to the originating village

**API Endpoint:**
```
DELETE /api/attacks/{attackId}
```

## Non-Cancelable Actions

The following actions are permanent once started and cannot be canceled:

### Research Actions
- Academy research
- Smithy research
- Any active research projects

**Reason:** Prevents players from canceling research to hide resources during attacks.

### Marketplace Trades
- Merchant deliveries in transit
- Completed marketplace transactions

**Reason:** Maintains trade reliability and prevents resource hiding.

### Troop Training
- Barracks training queues
- Stable training queues
- Workshop production

**Reason:** Prevents players from canceling training to hide troops during attacks.

### Celebrations (Future Feature)
- Town Hall celebrations
- Cultural events

**Reason:** Celebrations provide permanent benefits and should not be cancelable.

### Auction Bids (Future Feature)
- Bids placed in the Auction House
- Auction house transactions

**Reason:** Maintains auction integrity and prevents bid manipulation.

## Technical Implementation

### Building Cancel Logic

```typescript
// lib/game-services/building-service.ts
static async cancelBuilding(buildingId: string): Promise<void> {
  // Prevent canceling researching buildings
  if (building.research?.isResearching) {
    throw new Error("Cannot cancel building that is currently researching")
  }

  // Calculate refund based on level
  let refund = building.level === 0
    ? building.constructionCost  // Full refund for level 1
    : calculateCostDifference(building.constructionCost, building.level)
}
```

### Movement Cancel Logic

```typescript
// app/api/attacks/[id]/route.ts
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  // Check 90-second rule
  const ninetySecondsAgo = new Date(Date.now() - 90 * 1000)
  if (attack.createdAt < ninetySecondsAgo) {
    return errorResponse("Cannot cancel attack after 90 seconds have passed", 400)
  }

  // Cancel movement and return troops
  await prisma.movement.update({
    where: { id: attack.movementId },
    data: { status: "CANCELLED", cancelledAt: new Date() }
  })
}
```

### UI Components

```typescript
// components/game/building-queue.tsx
{onCancel && building.queuePosition !== 1 && !building.research?.isResearching && (
  <button onClick={() => onCancel(building.id)}>
    Cancel
  </button>
)}
```

## Database Schema

### Movement Status
```prisma
enum MovementStatus {
  IN_PROGRESS
  ARRIVED
  CANCELLED
}

model Movement {
  status      MovementStatus @default(IN_PROGRESS)
  cancelledAt DateTime?
}
```

### Attack Status
```prisma
enum AttackStatus {
  IN_PROGRESS
  ARRIVED
  RESOLVED
  CANCELLED
}
```

## User Experience

### Cancel Buttons
- Cancel buttons appear next to cancelable actions
- Tooltips explain why certain actions cannot be canceled
- Clear feedback messages for successful/failed cancellations

### Error Messages
- "Cannot cancel building that is currently researching"
- "Cannot cancel attack after 90 seconds have passed"
- "Cannot cancel attack that has already arrived"

### Success Messages
- "Building construction cancelled!"
- "Attack cancelled successfully"

## Future Enhancements

### Celebration System
When celebrations are implemented:
- Add celebration cancel prevention
- Update Town Hall building logic
- Add celebration status tracking

### Auction System
When auctions are implemented:
- Add bid cancel prevention
- Update Auction House logic
- Add bid status tracking

### Merchant Deliveries
When merchant system is enhanced:
- Add delivery cancel prevention for in-transit merchants
- Update marketplace logic
- Add delivery status tracking

## Testing

### Unit Tests
- Building cancel refund calculations
- Movement cancel time limits
- Research cancel prevention
- UI component conditional rendering

### Integration Tests
- Full cancel workflow for buildings
- Full cancel workflow for movements
- API endpoint validation
- Database state consistency

## Balance Considerations

### Resource Management
- Refund system prevents resource loss abuse
- Time limits prevent last-second cancellations
- Permanent actions maintain game integrity

### Player Strategy
- Players must plan actions carefully
- Prevents "panic canceling" during attacks
- Encourages commitment to decisions

### Server Performance
- Minimal database updates for cancels
- Efficient queue position recalculation
- Batch troop return operations

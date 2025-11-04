# Bulk Operations

Bulk Operations enable administrators to perform mass actions on multiple players simultaneously, improving efficiency for large-scale moderation tasks.

## Features

### Supported Operations

#### Bulk Ban
- Ban multiple players at once
- Apply same ban reason to all selected players
- Immediate account suspension

#### Bulk Unban
- Remove bans from multiple players
- Restore account access instantly
- Clear ban reasons

#### Bulk Delete
- Soft delete multiple player accounts
- Mark accounts as deleted with timestamp
- Preserve data integrity

## API Endpoint

### Execute Bulk Operation
```http
POST /api/admin/players/bulk
```

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
```

**Request Body:**
```json
{
  "operation": "ban",
  "playerIds": ["player-id-1", "player-id-2", "player-id-3"],
  "reason": "Violation of game rules"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "operation": "ban",
    "affectedCount": 3,
    "affectedPlayers": [
      {
        "id": "player-id-1",
        "playerName": "Player1"
      },
      {
        "id": "player-id-2",
        "playerName": "Player2"
      },
      {
        "id": "player-id-3",
        "playerName": "Player3"
      }
    ]
  },
  "message": "Successfully banned 3 player(s)"
}
```

## Usage

### Admin Dashboard
While bulk operations are designed for API usage, they can be integrated into admin tools:

1. Select multiple players from the player list
2. Choose bulk operation type
3. Provide required parameters (ban reason, etc.)
4. Execute operation

### API Integration

```javascript
// Bulk ban players
const bulkBan = async (playerIds, reason) => {
  const response = await fetch('/api/admin/players/bulk', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      operation: 'ban',
      playerIds,
      reason
    })
  })

  const result = await response.json()
  return result
}

// Usage
const result = await bulkBan(
  ['player-1', 'player-2', 'player-3'],
  'Spamming in global chat'
)
```

## Validation Rules

### Operation Types
- **ban**: Requires `reason` parameter
- **unban**: No additional parameters required
- **delete**: No additional parameters required

### Player IDs
- Must be an array of strings
- All IDs must exist in database
- Players cannot be deleted or already banned (depending on operation)
- Maximum 100 players per operation (for performance)

### Input Validation
- Operation must be one of: "ban", "unban", "delete"
- Player IDs array cannot be empty
- Ban reason required and non-empty for ban operations

## Operation Effects

### Bulk Ban
- Sets `banReason` on all selected players
- Players lose access to game immediately
- Existing attacks and movements are cancelled
- Village production continues

### Bulk Unban
- Clears `banReason` from all selected players
- Players regain immediate access
- No other data is modified

### Bulk Delete
- Sets `isDeleted = true` on all selected players
- Sets `deletedAt` timestamp
- Players lose access permanently
- Data is preserved for audit purposes

## Database Transactions

All bulk operations use database transactions to ensure:
- All-or-nothing execution
- Data consistency
- Rollback on failures
- Performance optimization

```typescript
const result = await prisma.$transaction(async (tx) => {
  // Bulk update operation
  return await tx.player.updateMany({
    where: { id: { in: playerIds } },
    data: { banReason: reason }
  })
})
```

## Performance Considerations

### Batch Processing
- Operations limited to 100 players per request
- Large operations split into batches if needed
- Database indexes optimized for bulk operations

### Monitoring
- Track operation completion times
- Monitor database performance during bulk operations
- Log operation statistics for analysis

## Audit Logging

All bulk operations are comprehensively logged:

### Ban Operations
- Action: `BULK_BAN`
- Details: "ban applied to X players: Player1, Player2, Player3"
- Target Type: `PLAYER`
- Target ID: `bulk-operation`

### Unban Operations
- Action: `BULK_UNBAN`
- Details: "unban applied to X players: Player1, Player2, Player3"
- Target Type: `PLAYER`
- Target ID: `bulk-operation`

### Delete Operations
- Action: `BULK_DELETE`
- Details: "delete applied to X players: Player1, Player2, Player3"
- Target Type: `PLAYER`
- Target ID: `bulk-operation`

## Error Handling

### Validation Errors
- Invalid operation type
- Empty player IDs array
- Non-existent player IDs
- Missing required parameters

### Execution Errors
- Database transaction failures
- Partial operation failures
- Connection timeouts

### Recovery
- Failed operations are rolled back
- Error details logged for investigation
- Partial failures reported to administrator

## Security Considerations

### Access Control
- Only authenticated administrators can perform bulk operations
- Role-based permissions may limit operation types
- All operations logged for accountability

### Data Protection
- Soft deletes preserve data integrity
- Audit trails maintain accountability
- No permanent data destruction without confirmation

### Rate Limiting
- Consider implementing rate limits for bulk operations
- Monitor for abuse patterns
- Alert on unusual operation volumes

## Best Practices

### Operation Planning
- Review player lists before bulk operations
- Test operations on development environment first
- Have rollback plans for critical operations

### Communication
- Notify affected players when possible
- Document operation reasons
- Maintain transparency in moderation actions

### Monitoring
- Track bulk operation frequency
- Monitor player activity after operations
- Review operation effectiveness

## Integration Points

Bulk operations integrate with:
- **Player Management System**: Individual player actions
- **Audit Logging**: Comprehensive operation tracking
- **Admin Dashboard**: Future bulk operation UI
- **Notification System**: Player notifications (future)

## Future Enhancements

- Bulk player messaging
- Bulk resource adjustments
- Bulk village relocations
- Scheduled bulk operations
- Bulk operation templates
- Operation rollback functionality
- Bulk operation approval workflows

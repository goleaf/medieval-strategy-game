# Action Tracking

Action Tracking provides comprehensive monitoring and logging of all administrative activities, ensuring accountability and enabling detailed audit trails.

## Features

### Real-time Action Monitoring
- Track actions per minute across the application
- Monitor system load and usage patterns
- Real-time statistics for performance monitoring

### Error Logging
- Capture and store system errors
- Stack trace preservation for debugging
- Error categorization and filtering

### Audit Logging
- Complete record of all admin actions
- User attribution and timestamp tracking
- Detailed action parameters and results

## API Endpoints

### Get System Statistics
```http
GET /api/admin/stats
```

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "onlineUsers": 25,
    "onlinePlayers": 20,
    "actionsPerMinute": 15,
    "avgActionsPerMinute": 12.5,
    "queuedJobsDepth": 3,
    "totalPlayers": 150,
    "totalVillages": 180,
    "activeAttacks": 5,
    "worldSpeed": 1,
    "gameRunning": true
  },
  "errorLogs": [
    {
      "timestamp": "2025-01-04T10:30:45Z",
      "level": "ERROR",
      "message": "Database connection failed",
      "error": "Error details..."
    }
  ],
  "timestamp": "2025-01-04T10:35:00Z"
}
```

## Action Tracking Implementation

### Action Counter
```typescript
// In-memory action tracking (reset on server restart)
const actionCounts: Map<number, number> = new Map()

export function trackAction() {
  const now = Date.now()
  const minute = Math.floor(now / 60000) // Current minute
  actionCounts.set(minute, (actionCounts.get(minute) || 0) + 1)

  // Clean up old entries (keep last 60 minutes)
  const cutoff = minute - 60
  for (const [key] of actionCounts) {
    if (key < cutoff) {
      actionCounts.delete(key)
    }
  }
}
```

### Usage in API Routes
```typescript
import { trackAction } from '@/app/api/admin/stats/route'

export const POST = requireAdminAuth(async (req: NextRequest, context) => {
  // Perform action
  await performAdminAction()

  // Track the action
  trackAction()

  return NextResponse.json({ success: true })
})
```

## Error Tracking Implementation

### Error Logger
```typescript
const errorLogs: Array<{
  timestamp: Date
  message: string
  error: string
}> = []

export function trackError(message: string, error: string) {
  errorLogs.push({
    timestamp: new Date(),
    message,
    error: error.substring(0, 500), // Limit error length
  })

  // Keep only last 100 errors
  if (errorLogs.length > 100) {
    errorLogs.shift()
  }
}
```

### Error Tracking Usage
```typescript
try {
  await riskyOperation()
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  trackError("Operation failed", errorMessage)

  return NextResponse.json({
    success: false,
    error: "Operation failed"
  }, { status: 500 })
}
```

## Audit Logging Implementation

### Database Schema
```prisma
model AuditLog {
  id              String    @id @default(cuid())

  adminId         String
  admin           Admin     @relation(fields: [adminId], references: [id], onDelete: Cascade)

  action          String
  details         String?
  targetType      String
  targetId        String

  createdAt       DateTime  @default(now())

  @@index([adminId])
  @@index([targetType, targetId])
}
```

### Audit Log Usage
```typescript
await prisma.auditLog.create({
  data: {
    adminId: context.admin.adminId,
    action: "BAN_PLAYER",
    details: `Banned player ${playerName} for: ${reason}`,
    targetType: "PLAYER",
    targetId: playerId,
  },
})
```

## Action Categories

### Administrative Actions
- `BAN_PLAYER`: Player banned with reason
- `UNBAN_PLAYER`: Player ban removed
- `RENAME_PLAYER`: Player name changed
- `MOVE_PLAYER_VILLAGE`: Player village relocated
- `UPDATE_WORLD_CONFIG`: World configuration modified
- `APPLY_SPEED_TEMPLATE`: Speed template applied
- `SPAWN_BARBARIAN`: Barbarian village created
- `RELOCATE_VILLAGE`: Village moved
- `WIPE_EMPTY_VILLAGES`: Empty villages removed
- `CREATE_ADMIN`: New admin user created

### Bulk Actions
- `BULK_BAN`: Multiple players banned
- `BULK_UNBAN`: Multiple players unbanned
- `BULK_DELETE`: Multiple players deleted

### System Actions
- Login attempts and failures
- Configuration changes
- Error occurrences

## Metrics Tracked

### Performance Metrics
- Actions per minute (current)
- Average actions per minute (10-minute rolling average)
- Queued jobs depth
- Database query performance

### User Activity
- Online users count
- Online players count
- Total registered players
- Total villages count

### System Health
- Active attacks count
- World speed status
- Game running status
- Error frequency

## Data Retention

### In-Memory Data
- Action counts: Last 60 minutes
- Error logs: Last 100 entries
- Reset on server restart

### Database Data
- Audit logs: Permanent retention
- Configurable cleanup policies
- Backup and archiving procedures

## Security Considerations

### Log Integrity
- Audit logs cannot be modified after creation
- Admin attribution required for all actions
- Timestamp integrity maintained

### Privacy Protection
- Sensitive data excluded from logs
- User IDs used instead of personal information
- Log access restricted to administrators

### Monitoring
- Suspicious activity detection
- Failed login attempt tracking
- Unusual action pattern alerts

## Performance Impact

### Action Tracking
- Minimal overhead per action
- In-memory operations for speed
- Background cleanup of old data

### Error Tracking
- Lightweight error capture
- Controlled memory usage with limits
- Asynchronous logging to avoid blocking

### Audit Logging
- Database write operations
- Indexed for query performance
- Consider batching for high-volume scenarios

## Best Practices

### Logging Standards
- Consistent action naming conventions
- Detailed but concise log messages
- Include relevant context information
- Avoid logging sensitive data

### Monitoring Setup
- Set up alerts for critical errors
- Monitor action rate trends
- Review audit logs regularly
- Implement log rotation policies

### Analysis
- Use logs for debugging issues
- Track administrator productivity
- Identify system usage patterns
- Support compliance requirements

## Integration

Action tracking integrates with:
- **Admin Authentication**: User attribution
- **Admin Dashboard**: Real-time statistics display
- **Error Monitoring**: System health visibility
- **Audit Compliance**: Regulatory requirements

## Future Enhancements

- Log aggregation and analysis tools
- Real-time alerting system
- Performance trend analysis
- Automated anomaly detection
- Log export and backup functionality
- Advanced querying and filtering
- Integration with external monitoring systems

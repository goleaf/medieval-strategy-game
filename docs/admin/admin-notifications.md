# Admin Notifications

The Admin Notifications system provides a centralized communication platform for important system alerts, player issues, security events, and administrative updates.

## Features

### Notification Types
- **System**: Server status, performance alerts, maintenance notifications
- **Player**: Player behavior issues, ban appeals, special player achievements
- **Security**: Login failures, suspicious activities, security breaches
- **Maintenance**: Scheduled downtime, updates, system maintenance
- **Balance**: Game balance issues, exploit reports, balance adjustments
- **Report**: Administrative reports, analytics, system summaries

### Severity Levels
- **Info**: General information and updates
- **Warning**: Issues requiring attention but not critical
- **Error**: System errors or player issues needing resolution
- **Critical**: Urgent issues requiring immediate action

### Notification Management
- Read/unread status tracking
- Notification creation and management
- Administrative assignment and tracking
- Historical notification archive

## API Endpoints

### Get Notifications
```http
GET /api/admin/notifications
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
    "notifications": [
      {
        "id": "notification-id",
        "type": "SECURITY",
        "title": "Multiple Failed Login Attempts",
        "message": "Player 'BadActor' has 5 failed login attempts in the last hour",
        "severity": "warning",
        "isRead": false,
        "targetId": "player-id",
        "targetType": "PLAYER",
        "createdAt": "2025-01-04T10:30:00Z",
        "createdBy": "System"
      }
    ],
    "unreadCount": 3,
    "total": 25
  }
}
```

### Create Notification
```http
POST /api/admin/notifications
```

**Request Body:**
```json
{
  "type": "PLAYER",
  "title": "Player Report",
  "message": "Player has been reported for griefing",
  "severity": "warning",
  "targetId": "player-id",
  "targetType": "PLAYER"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "notification-id",
    "type": "PLAYER",
    "title": "Player Report",
    "message": "Player has been reported for griefing",
    "severity": "warning",
    "isRead": false,
    "targetId": "player-id",
    "targetType": "PLAYER",
    "createdAt": "2025-01-04T10:30:00Z"
  },
  "message": "Notification created successfully"
}
```

## Usage

### Admin Dashboard
1. Navigate to Admin Dashboard → Notifications tab
2. View unread notification count and severity indicators
3. Browse notifications by type, severity, and date
4. Mark notifications as read
5. Create new notifications for other administrators

### Notification Workflow
1. **Receive**: Notifications appear in dashboard with visual indicators
2. **Review**: Read notification details and assess severity
3. **Action**: Take appropriate administrative action
4. **Mark Read**: Mark notification as handled
5. **Follow-up**: Create additional notifications if needed

## Database Schema

```prisma
model AdminNotification {
  id              String    @id @default(cuid())

  adminId         String
  admin           Admin     @relation(fields: [adminId], references: [id], onDelete: Cascade)

  type            NotificationType
  title           String
  message         String
  severity        NotificationSeverity @default(info)

  targetId        String?
  targetType      String?

  isRead          Boolean   @default(false)
  readAt          DateTime?

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([adminId])
  @@index([type])
  @@index([isRead])
  @@index([createdAt])
}
```

## Notification Categories

### System Notifications
- Server performance alerts
- Database connection issues
- Memory usage warnings
- Scheduled maintenance reminders

### Player Notifications
- Ban/unban actions
- Player reports and appeals
- Achievement milestones
- Special player status changes

### Security Notifications
- Failed login attempts
- Suspicious IP activities
- Permission violations
- Security policy breaches

### Maintenance Notifications
- System updates and patches
- Database migrations
- Service restarts
- Emergency maintenance

### Balance Notifications
- Game balance issues detected
- Exploit reports and investigations
- Balance adjustment recommendations
- Player feedback summaries

## Integration Features

### Automatic Notifications
The system can automatically create notifications for:
- System errors and warnings
- Player moderation actions
- Security events
- Performance issues
- Administrative actions

### Manual Notifications
Administrators can create notifications for:
- Team communication
- Policy announcements
- Action item assignments
- Meeting reminders
- Important updates

## User Interface

### Notification Display
- Color-coded severity indicators
- Unread notification badges
- Timestamp and creator information
- Expandable message content
- Action buttons for related tasks

### Filtering and Search
- Filter by type, severity, and read status
- Search by title, message, or creator
- Sort by date, severity, or type
- Bulk operations for multiple notifications

## Performance Considerations

### Data Management
- Automatic cleanup of old notifications (90 days)
- Indexed queries for fast retrieval
- Paginated results to prevent UI slowdown
- Background processing for notification creation

### Real-time Updates
- WebSocket integration for instant notification delivery
- Push notifications for critical alerts
- Email notifications for important events
- Mobile app notifications (future)

## Security Features

### Access Control
- Admin-only notification access
- Role-based notification visibility
- Secure notification creation
- Audit logging of all notification actions

### Content Security
- Input validation and sanitization
- XSS protection in notification content
- Safe HTML rendering
- Content length limits

## Best Practices

### Notification Creation
- Use clear, descriptive titles
- Include relevant context and details
- Choose appropriate severity levels
- Target specific administrators when possible

### Notification Management
- Regularly review and mark notifications as read
- Archive important notifications for reference
- Use notifications for team communication
- Set up escalation procedures for critical notifications

### System Integration
- Integrate with existing monitoring systems
- Automate notification creation for common events
- Use notifications for workflow management
- Maintain notification templates for consistency

## Future Enhancements

### Advanced Features
- Notification templates and presets
- Notification scheduling and automation
- Notification forwarding and delegation
- Notification analytics and reporting
- Integration with external notification systems

### Communication Features
- Notification threads and conversations
- File attachments and links
- Notification acknowledgments and confirmations
- Notification priority escalation
- Team notification channels

### Analytics and Insights
- Notification volume analysis
- Response time tracking
- Effectiveness measurement
- Administrative workload monitoring
- Notification trend analysis

## Monitoring and Analytics

### Key Metrics
- Total notifications created
- Average response times
- Notification read rates
- Severity distribution
- Type frequency analysis

### Performance Tracking
- Notification delivery success rates
- System impact of notification volume
- User engagement with notifications
- Administrative efficiency improvements

## Troubleshooting

### Common Issues
- Notifications not appearing: Check user permissions and authentication
- High notification volume: Implement filtering and archiving
- Performance issues: Optimize database queries and implement pagination
- Missing notifications: Verify notification creation and delivery systems

### Maintenance Tasks
- Regular cleanup of old notifications
- Database performance optimization
- Index maintenance and updates
- System integration testing



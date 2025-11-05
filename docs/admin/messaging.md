# Admin Messaging System

The Admin Messaging System enables administrators to communicate directly with players through in-game messages and notifications.

## Features

### Direct Player Communication
- Send personalized messages to individual players
- Subject line and rich text message content
- Message history and status tracking
- Integration with in-game message system

### Message Management
- View sent message history
- Track message read/unread status
- Filter messages by player or date
- Message archival and search capabilities

### Player Notification System
- Automatic in-game message delivery
- Message status indicators
- Player communication history
- Bulk messaging capabilities (future)

## API Endpoints

### Get Message History
```http
GET /api/admin/messaging
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Messages per page (default: 20)
- `playerId`: Filter by specific player

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg-123",
        "subject": "Welcome to the Server",
        "message": "Thank you for joining our medieval strategy game...",
        "isRead": true,
        "createdAt": "2025-01-04T10:30:00Z",
        "toPlayer": {
          "id": "player-456",
          "name": "PlayerName",
          "isDeleted": false
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Send Message
```http
POST /api/admin/messaging
```

**Request Body:**
```json
{
  "playerId": "player-123",
  "subject": "Important Game Update",
  "message": "We have released a major update with new features..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Message sent successfully",
  "data": {
    "id": "msg-456",
    "subject": "Important Game Update",
    "message": "We have released a major update...",
    "createdAt": "2025-01-04T12:00:00Z",
    "toPlayer": {
      "id": "player-123",
      "name": "PlayerName"
    }
  }
}
```

## Database Schema

```prisma
model AdminMessage {
  id              String    @id @default(cuid())

  fromAdminId     String
  fromAdmin       Admin     @relation("FromAdmin", fields: [fromAdminId], references: [id], onDelete: Cascade)

  toPlayerId      String
  toPlayer        Player    @relation(fields: [toPlayerId], references: [id], onDelete: Cascade)

  subject         String
  message         String
  isRead          Boolean   @default(false)

  createdAt       DateTime  @default(now())

  @@index([fromAdminId])
  @@index([toPlayerId])
  @@index([isRead])
  @@index([createdAt])
}
```

## Message Types

### Administrative Messages
- **Welcome Messages**: New player introductions and server rules
- **Update Notifications**: Game updates, patches, and new features
- **Policy Communications**: Rule changes, code of conduct updates
- **Event Announcements**: Tournaments, special events, contests

### Support Messages
- **Technical Support**: Bug reports, technical issues, account problems
- **Player Assistance**: Gameplay help, strategy advice, feature explanations
- **Moderation Actions**: Ban notifications, warnings, account status updates

### Community Messages
- **Server Announcements**: General news and community updates
- **Feedback Requests**: Surveys, beta testing invitations, feedback collection
- **Achievement Recognition**: Special player achievements and milestones

## Usage

### Admin Dashboard
1. Navigate to Admin Dashboard → Messaging tab
2. Compose new messages using the message form
3. Enter player ID, subject, and message content
4. Send message and track delivery status
5. View message history and read receipts

### Message Composition
- **Subject Lines**: Clear, descriptive, and attention-grabbing
- **Message Content**: Professional, helpful, and informative
- **Tone**: Friendly but authoritative
- **Length**: Concise but comprehensive

### Player Communication
- **Timing**: Send during appropriate hours for player's timezone
- **Personalization**: Address players by name when possible
- **Follow-up**: Track responses and provide additional support
- **Documentation**: Log important communications for reference

## Message Delivery

### In-Game Integration
When an admin sends a message:
1. **AdminMessage** record is created in database
2. **Message** record is created for player's inbox
3. **WebSocket notification** sent if player is online
4. **Email notification** sent if configured (future)

### Delivery Status
- **Sent**: Message successfully delivered to database
- **Delivered**: Message available in player's inbox
- **Read**: Player has opened and read the message
- **Failed**: Delivery failed (player not found, deleted, etc.)

## Safety and Security

### Content Validation
- Message length limits (subject: 200 chars, message: 5000 chars)
- HTML sanitization and XSS protection
- Profanity and spam filtering
- Content appropriateness checks

### Access Control
- Admin-only message sending capabilities
- Player ID validation before sending
- Message history access restrictions
- Audit logging of all communications

### Privacy Protection
- No sensitive player data in messages
- Message content encryption at rest
- Secure transmission protocols
- Privacy policy compliance

## Performance Considerations

### Database Optimization
- Indexed queries for message retrieval
- Pagination for large message histories
- Efficient message status updates
- Background message processing

### Scalability Features
- Message queuing for high-volume sending
- Batch message operations
- Caching for frequently accessed messages
- Database connection pooling

## Analytics and Reporting

### Message Metrics
- Total messages sent per admin
- Message read rates and response times
- Player engagement with admin communications
- Communication effectiveness analysis

### Usage Statistics
- Most active communicating admins
- Message volume by category
- Player response patterns
- Communication channel preferences

## Best Practices

### Communication Guidelines
- **Clarity**: Use clear, simple language
- **Professionalism**: Maintain professional tone in all communications
- **Timeliness**: Respond promptly to player inquiries
- **Consistency**: Use consistent messaging style across admins

### Message Templates
- Create standard templates for common scenarios
- Customize templates for specific situations
- Include contact information for follow-up
- Update templates based on player feedback

### Follow-up Procedures
- Track player responses and satisfaction
- Follow up on unresolved issues
- Document important conversations
- Learn from successful communication patterns

## Integration Features

### Game Integration
- Messages appear in player's in-game inbox
- Message notifications via WebSocket
- Integration with player profile and history
- Cross-reference with other admin actions

### External Systems
- Email notification integration (future)
- Discord/Slack notifications (future)
- CRM system integration (future)
- Support ticket system linking (future)

## Future Enhancements

### Advanced Features
- **Bulk Messaging**: Send messages to multiple players
- **Message Templates**: Pre-defined message templates
- **Scheduled Messages**: Send messages at specific times
- **Message Categories**: Organize messages by type/purpose

### Communication Tools
- **Rich Text Editor**: Enhanced message formatting
- **File Attachments**: Attach documents or images
- **Message Threads**: Conversation threading
- **Translation Support**: Multi-language message support

### Analytics Improvements
- **Response Tracking**: Detailed response analytics
- **A/B Testing**: Test different message approaches
- **Sentiment Analysis**: Message effectiveness measurement
- **Communication Insights**: Advanced reporting and insights

### Automation Features
- **Automated Responses**: AI-powered response suggestions
- **Smart Scheduling**: Optimal message timing
- **Follow-up Automation**: Automatic follow-up messages
- **Personalization**: Dynamic message customization


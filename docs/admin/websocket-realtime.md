# WebSocket Real-time Statistics

The WebSocket Real-time Statistics system provides live, streaming data updates to the admin dashboard, enabling real-time monitoring of game activity, server performance, and player interactions.

## Overview

The WebSocket system establishes persistent connections between admin clients and the server, broadcasting real-time statistics every 5 seconds. This enables administrators to monitor the game state without manual refreshes.

## Architecture

### Server Components
- **WebSocket Server**: Handles client connections and authentication
- **Statistics Engine**: Collects and broadcasts real-time metrics
- **Heartbeat System**: Maintains connection health and detects dead clients
- **Authentication Layer**: JWT-based admin verification

### Client Components
- **WebSocket Hook**: React hook for connection management
- **Real-time Updates**: Automatic UI updates from server broadcasts
- **Connection Status**: Visual indicators for connection state
- **Error Handling**: Automatic reconnection and error recovery

## Features

### Real-time Metrics
- Online user and player counts
- Server performance indicators
- Recent administrative actions
- System health monitoring

### Connection Management
- Automatic connection establishment
- Authentication-based access control
- Heartbeat and health monitoring
- Automatic reconnection on failure

### Live Dashboard Updates
- Real-time statistics display
- Activity monitoring indicators
- System status visualization
- Instant notification delivery

## Server Implementation

### WebSocket Server Setup
```typescript
// lib/websocket/admin-websocket.ts
import { WebSocketServer, WebSocket } from 'ws'

class AdminWebSocketServer {
  private wss: WebSocketServer | null = null
  private clients: Set<AdminWebSocket> = new Set()

  start(port: number = 8080) {
    this.wss = new WebSocketServer({ port })
    this.wss.on('connection', this.handleConnection.bind(this))
    this.startStatsBroadcasting()
    this.startHeartbeat()
  }
}
```

### Statistics Broadcasting
```typescript
private async startStatsBroadcasting() {
  setInterval(async () => {
    const stats = await this.getRealTimeStats()
    const message = JSON.stringify({
      type: 'stats_update',
      data: stats,
      timestamp: new Date().toISOString()
    })

    // Broadcast to all connected clients
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message)
      }
    }
  }, 5000) // Every 5 seconds
}
```

## Client Implementation

### React Hook Usage
```typescript
// lib/hooks/use-admin-websocket.ts
import { useAdminWebSocket } from '@/lib/hooks/use-admin-websocket'

function AdminDashboard() {
  const { isConnected, stats, connectionError } = useAdminWebSocket({
    enabled: true,
    url: 'ws://localhost:8080'
  })

  return (
    <div>
      {/* Connection status indicator */}
      <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
        {isConnected ? '🟢 Live' : '🔴 Offline'}
      </div>

      {/* Real-time stats */}
      <div>Online Users: {stats?.online?.users ?? 0}</div>
    </div>
  )
}
```

### Connection States
- **Connecting**: Establishing WebSocket connection
- **Connected**: Active connection with real-time updates
- **Disconnected**: Connection lost, attempting reconnection
- **Error**: Connection failed with error details

## API Reference

### Server Messages

#### Connection Established
```json
{
  "type": "connected",
  "message": "Connected to admin WebSocket server",
  "timestamp": "2025-01-04T12:00:00Z"
}
```

#### Statistics Update
```json
{
  "type": "stats_update",
  "data": {
    "online": {
      "users": 45,
      "players": 32
    },
    "totals": {
      "players": 1250,
      "villages": 2156
    },
    "activity": {
      "recentActions": [
        {
          "id": "audit-123",
          "action": "BAN_PLAYER",
          "admin": "AdminUser",
          "targetType": "PLAYER",
          "timestamp": "2025-01-04T11:59:30Z"
        }
      ]
    },
    "system": {
      "database": {
        "status": "healthy",
        "latency": 45
      },
      "memory": {
        "used": 85,
        "total": 128
      },
      "uptime": 3600
    }
  },
  "timestamp": "2025-01-04T12:00:00Z"
}
```

#### Subscription Confirmation
```json
{
  "type": "subscribed",
  "subscriptions": ["stats", "notifications"],
  "timestamp": "2025-01-04T12:00:00Z"
}
```

### Client Messages

#### Subscription Request
```json
{
  "type": "subscribe",
  "subscriptions": ["stats", "notifications"]
}
```

#### Ping/Pong
```json
{
  "type": "ping"
}
```

```json
{
  "type": "pong",
  "timestamp": "2025-01-04T12:00:00Z"
}
```

## Data Metrics

### Online Activity
- **Users**: Active user sessions (last 15 minutes)
- **Players**: Players with recent activity (last 24 hours)
- **Real-time Count**: Current concurrent connections

### System Performance
- **Database Latency**: Query response times
- **Memory Usage**: Server memory consumption
- **Uptime**: Server uptime in seconds
- **Connection Health**: WebSocket connection status

### Activity Tracking
- **Recent Actions**: Last 5 administrative actions
- **Action Types**: Ban, unban, world config changes, etc.
- **Admin Attribution**: Which admin performed the action
- **Timestamps**: Exact timing of actions

## Security Features

### Authentication
- JWT token verification on connection
- Admin role validation
- Token expiration handling
- Secure WebSocket upgrades

### Connection Security
- Origin validation
- Rate limiting on connections
- Connection timeout handling
- Secure error messaging

### Data Protection
- No sensitive data in broadcasts
- Aggregated statistics only
- Admin-only access control
- Audit logging of connections

## Performance Optimization

### Server-side Optimizations
- Efficient database queries with caching
- Background statistics calculation
- Connection pooling and management
- Memory-efficient message broadcasting

### Client-side Optimizations
- Automatic reconnection with exponential backoff
- Message deduplication and filtering
- UI update throttling
- Memory leak prevention

### Network Optimizations
- Compressed WebSocket messages
- Binary message formats (future)
- Connection keep-alive
- Bandwidth monitoring

## Monitoring and Debugging

### Connection Monitoring
- Connection count tracking
- Client heartbeat monitoring
- Connection duration logging
- Error rate tracking

### Performance Metrics
- Message throughput monitoring
- Broadcast latency measurement
- Memory usage tracking
- CPU utilization monitoring

### Error Handling
- Connection failure recovery
- Invalid message handling
- Authentication error logging
- Graceful degradation

## Configuration Options

### Server Configuration
```typescript
const wsServer = new AdminWebSocketServer()
wsServer.start({
  port: 8080,
  heartbeatInterval: 30000,
  statsInterval: 5000,
  maxConnections: 100
})
```

### Client Configuration
```typescript
const { isConnected, stats } = useAdminWebSocket({
  url: 'ws://localhost:8080',
  enabled: true,
  reconnectInterval: 5000,
  maxReconnectAttempts: 5
})
```

## Troubleshooting

### Common Issues

#### Connection Failures
- **Cause**: Invalid JWT token or expired authentication
- **Solution**: Refresh admin authentication and reconnect
- **Prevention**: Implement token refresh logic

#### High Latency
- **Cause**: Network issues or server overload
- **Solution**: Check network connectivity and server performance
- **Prevention**: Implement connection quality monitoring

#### Memory Leaks
- **Cause**: Improper event listener cleanup
- **Solution**: Ensure proper component unmounting
- **Prevention**: Use React hooks with proper cleanup

### Debugging Tools
- Browser WebSocket inspector
- Server-side connection logging
- Network traffic analysis
- Performance profiling tools

## Best Practices

### Server Implementation
- Implement proper error boundaries
- Use connection pooling for database access
- Implement rate limiting for statistics queries
- Monitor server resource usage

### Client Implementation
- Handle connection state changes gracefully
- Implement exponential backoff for reconnections
- Use React.memo for performance optimization
- Clean up subscriptions on component unmount

### Monitoring
- Set up alerts for connection failures
- Monitor message throughput and latency
- Track client connection patterns
- Log authentication failures

## Future Enhancements

### Advanced Features
- Message queuing for offline clients
- Selective subscription filtering
- Binary message compression
- End-to-end encryption

### Performance Improvements
- WebSocket clustering for scalability
- Redis pub/sub for distributed broadcasting
- Message batching and compression
- Advanced caching strategies

### Analytics Integration
- WebSocket usage analytics
- Connection pattern analysis
- Performance metric collection
- Real-time alerting system

### Protocol Extensions
- Custom message types for specific features
- Bidirectional communication support
- File transfer capabilities
- Voice/video integration (future)



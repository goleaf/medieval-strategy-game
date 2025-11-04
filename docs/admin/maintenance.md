# System Maintenance

The System Maintenance module provides administrators with tools to manage server operations, perform cleanup tasks, and monitor system health.

## Features

### Maintenance Mode Management
- Enable/disable maintenance mode with custom messages
- Estimated completion time tracking
- Server status indicators
- Maintenance notifications to players

### Automated Cleanup Operations
- Remove inactive player accounts (90+ days old, no villages)
- Clean up abandoned villages (30+ days old, no buildings/population)
- Archive old audit logs (180+ days old)
- Database optimization and maintenance

### Server Health Monitoring
- Real-time server uptime tracking
- Memory usage statistics
- Node.js version and platform information
- Performance metrics collection

## API Endpoints

### Get Maintenance Status
```http
GET /api/admin/maintenance
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
    "maintenance": {
      "isActive": false,
      "message": null,
      "estimatedEndTime": null,
      "createdAt": null,
      "createdBy": null
    },
    "server": {
      "uptime": 3600,
      "memoryUsed": 85,
      "memoryTotal": 128,
      "nodeVersion": "v18.17.0",
      "platform": "linux"
    },
    "cleanups": [
      {
        "id": "cleanup-123",
        "action": "CLEANUP_INACTIVE_PLAYERS",
        "details": "Cleanup completed: 5 inactive players, 12 empty villages, 50 old logs",
        "admin": "AdminUser",
        "timestamp": "2025-01-04T12:00:00Z"
      }
    ]
  }
}
```

### Maintenance Actions
```http
POST /api/admin/maintenance
```

**Enable Maintenance Mode:**
```json
{
  "action": "enable",
  "message": "Scheduled server maintenance",
  "estimatedEndTime": "2025-01-04T14:00:00Z"
}
```

**Disable Maintenance Mode:**
```json
{
  "action": "disable"
}
```

**Run Cleanup Operations:**
```json
{
  "action": "cleanup"
}
```

## Maintenance Mode

### Enabling Maintenance Mode
When maintenance mode is enabled:
- Players cannot access the game
- API endpoints return maintenance messages
- WebSocket connections are notified
- Admin dashboard shows maintenance status

### Maintenance Configuration
- Custom maintenance messages
- Estimated completion times
- Automatic player notifications
- Maintenance history tracking

## Cleanup Operations

### Inactive Player Cleanup
- **Target**: Players with no villages, created >90 days ago, no user account
- **Purpose**: Remove abandoned test accounts and inactive registrations
- **Safety**: Only removes players with no game progress

### Empty Village Cleanup
- **Target**: Villages with no buildings, no population, created >30 days ago
- **Purpose**: Remove abandoned village slots and free up coordinates
- **Safety**: Preserves all villages with any development

### Audit Log Archiving
- **Target**: Audit logs older than 180 days
- **Purpose**: Maintain database performance and storage efficiency
- **Safety**: Archives to separate storage before deletion

## Server Health Monitoring

### Metrics Tracked
- **Uptime**: Server runtime in seconds
- **Memory Usage**: Current heap memory consumption
- **Memory Total**: Available heap memory
- **Node Version**: Running Node.js version
- **Platform**: Operating system information

### Health Status Indicators
- **Healthy**: Normal operation with good performance
- **Warning**: Elevated resource usage or minor issues
- **Critical**: High resource usage or system problems
- **Maintenance**: Server is in maintenance mode

## Usage

### Admin Dashboard
1. Navigate to Admin Dashboard → Maintenance tab
2. View current server health and maintenance status
3. Enable/disable maintenance mode as needed
4. Run cleanup operations during low-traffic periods
5. Monitor cleanup operation results and history

### Maintenance Procedures
1. **Plan Maintenance**: Notify players in advance via announcements
2. **Enable Mode**: Set maintenance mode with clear message
3. **Perform Tasks**: Execute server updates, database maintenance, etc.
4. **Test Systems**: Verify all systems are working correctly
5. **Disable Mode**: Remove maintenance mode and notify players

### Cleanup Scheduling
- **Frequency**: Run cleanup operations weekly or monthly
- **Timing**: Schedule during low-traffic periods (early morning)
- **Monitoring**: Track cleanup results and system impact
- **Reporting**: Log cleanup statistics for analysis

## Safety Features

### Confirmation Requirements
- Maintenance mode changes require confirmation
- Cleanup operations prompt for final approval
- Destructive actions are logged and auditable

### Data Protection
- Cleanup operations preserve all active player data
- Backup recommendations before major maintenance
- Recovery procedures documented and tested

### Audit Trail
- All maintenance actions are logged
- Admin attribution for all operations
- Timestamp tracking for accountability
- Historical maintenance records

## Performance Considerations

### Resource Management
- Cleanup operations run in background
- Memory usage monitoring prevents overload
- Database operations are optimized and indexed
- Server health checks are lightweight

### Monitoring Integration
- Real-time performance metrics
- Alert system for critical issues
- Historical performance trending
- Automated health checks

## Best Practices

### Maintenance Planning
- Schedule maintenance during low-traffic periods
- Provide advance notice to players
- Test procedures in development environment
- Have rollback plans for failed updates

### Cleanup Operations
- Monitor system performance during cleanup
- Run cleanup in small batches to prevent load
- Verify data integrity after cleanup operations
- Keep detailed logs of all cleanup activities

### Health Monitoring
- Set up alerts for critical system metrics
- Monitor trends in resource usage
- Regular health check reviews
- Proactive maintenance based on monitoring

## Future Enhancements

### Advanced Maintenance Features
- Automated maintenance scheduling
- Rolling updates with zero downtime
- Advanced cleanup with smart detection
- Predictive maintenance based on usage patterns

### Monitoring Improvements
- Detailed performance analytics
- Custom health check endpoints
- Integration with external monitoring tools
- Automated incident response

### Backup and Recovery
- Automated backup systems
- Point-in-time recovery
- Cross-region redundancy
- Disaster recovery procedures

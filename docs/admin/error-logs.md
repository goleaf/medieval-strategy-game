# Error Logs

The Error Logs system provides administrators with visibility into system errors, exceptions, and issues occurring in the game application.

## Features

### Error Tracking
- Captures and stores the last 100 system errors
- Includes error messages, stack traces, and timestamps
- Categorizes errors by severity level
- Real-time error monitoring

### Error Display
- Clean, organized error log interface
- Expandable stack traces for detailed debugging
- Timestamp and severity level indicators
- Search and filter capabilities

## API Endpoints

### Get Error Logs
```http
GET /api/admin/stats
```

Error logs are included in the stats response:

```json
{
  "success": true,
  "data": {
    "onlineUsers": 25,
    "onlinePlayers": 20,
    // ... other stats
    "errorLogs": [
      {
        "timestamp": "2025-01-04T10:30:45Z",
        "level": "ERROR",
        "message": "Database connection failed",
        "stack": "Error: Database connection failed\n    at queryDatabase (/app/lib/db.ts:45:12)\n    ..."
      }
    ]
  }
}
```

## Usage

### Admin Dashboard
1. Navigate to Admin Dashboard → Error Logs tab
2. View recent errors in chronological order (newest first)
3. Click on stack trace summaries to expand full error details
4. Monitor error frequency and patterns

### Error Investigation
- Check timestamps for error timing patterns
- Review stack traces for code location
- Identify recurring error messages
- Correlate errors with system changes

## Error Categories

### Severity Levels
- **ERROR**: Critical system errors that prevent normal operation
- **WARN**: Warning conditions that don't stop operation but need attention
- **INFO**: Informational messages for debugging
- **DEBUG**: Detailed debugging information

### Common Error Types
- Database connection issues
- API endpoint failures
- Authentication problems
- Validation errors
- WebSocket connection issues
- File system errors

## Implementation

### Error Tracking Function
```typescript
export function trackError(message: string, details?: string) {
  const error = {
    timestamp: new Date().toISOString(),
    level: 'ERROR',
    message,
    stack: details || new Error().stack,
  }

  // Store in memory (last 100 errors)
  errorLogs.unshift(error)
  if (errorLogs.length > 100) {
    errorLogs.pop()
  }
}
```

### Usage in API Routes
```typescript
try {
  // Risky operation
  await performDatabaseOperation()
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  trackError("Database operation failed", errorMessage)
  return NextResponse.json({ error: "Internal server error" }, { status: 500 })
}
```

## Error Storage

### In-Memory Storage
- Stores last 100 errors in application memory
- Resets on server restart
- Lightweight and fast
- Suitable for development and small-scale production

### Future Enhancements
- Database-backed error storage
- External logging services (Sentry, LogRocket)
- Error aggregation and alerting
- Performance monitoring integration

## Error Analysis

### Patterns to Watch For
- Frequent database connection errors
- Authentication failures
- API timeout issues
- Memory or performance issues
- WebSocket disconnection patterns

### Response Strategies
1. **Immediate**: Check server resources and connections
2. **Short-term**: Restart services if needed
3. **Long-term**: Code fixes and infrastructure improvements

## Security Considerations

- Error messages should not expose sensitive information
- Stack traces may contain file paths and internal details
- Consider sanitizing error output for production
- Rate limit error logging to prevent abuse

## Performance Impact

- In-memory storage has minimal performance impact
- Error logging adds small overhead to error paths
- Large error volumes may consume memory
- Consider log rotation for long-running applications

## Best Practices

### Error Logging
- Log errors consistently across the application
- Include relevant context in error messages
- Use appropriate severity levels
- Avoid logging sensitive data

### Error Handling
- Implement proper try/catch blocks
- Provide meaningful error messages to users
- Log errors for debugging while showing user-friendly messages
- Consider graceful degradation

### Monitoring
- Set up alerts for critical errors
- Monitor error rates and patterns
- Review error logs regularly
- Correlate errors with system changes

## Troubleshooting Guide

### Common Issues

#### Database Connection Errors
```
Error: Can't reach database server
```
**Solutions:**
- Check database server status
- Verify connection credentials
- Check network connectivity
- Restart database service

#### Authentication Failures
```
Error: Invalid token
```
**Solutions:**
- Verify JWT secret configuration
- Check token expiration
- Review authentication middleware
- Clear invalid sessions

#### API Timeouts
```
Error: Request timeout
```
**Solutions:**
- Increase timeout limits
- Optimize slow database queries
- Check server resource usage
- Implement caching where appropriate

### Debug Process
1. Identify error location from stack trace
2. Review recent code changes
3. Check system resources and logs
4. Reproduce issue in development environment
5. Implement fix and test thoroughly

## Integration

Error logs integrate with the stats API to provide comprehensive system monitoring alongside:
- Online user counts
- Game performance metrics
- Database query statistics
- WebSocket connection status

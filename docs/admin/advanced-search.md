# Advanced Player Search

The Advanced Player Search system provides powerful filtering and search capabilities to find specific players based on multiple criteria including demographics, activity, game progress, and account status.

## Features

### Comprehensive Search Filters
- Text search across player names, emails, and display names
- Numeric range filters for points, villages, and activity
- Boolean filters for account status and ban status
- Date range filters for registration and activity periods

### Advanced Filtering Options
- Player name and email exact matching
- Points range filtering (min/max)
- Village count and activity requirements
- Account type filtering (registered vs. guest)
- Ban status and deletion status filtering

### Search Results Management
- Paginated results with customizable page sizes
- Sortable columns with multiple sort options
- Export capabilities for data analysis
- Detailed player information display

## API Endpoint

### Advanced Search
```http
GET /api/admin/search
```

**Query Parameters:**
- `q`: General search query (player name, email, display name)
- `playerName`: Exact player name match
- `email`: Email address search
- `minPoints`: Minimum total points
- `maxPoints`: Maximum total points
- `hasUserAccount`: Account type filter (`true`, `false`, or empty)
- `isBanned`: Ban status filter (`true` or empty)
- `isDeleted`: Deletion status filter (`false`, `true`, or empty)
- `createdAfter`: Registration date after (ISO date)
- `createdBefore`: Registration date before (ISO date)
- `lastActiveAfter`: Last activity after (ISO date)
- `lastActiveBefore`: Last activity before (ISO date)
- `page`: Page number (default: 1)
- `limit`: Results per page (default: 50, max: 200)
- `sortBy`: Sort field (default: `totalPoints`)
- `sortOrder`: Sort order (`asc` or `desc`, default: `desc`)

**Headers:**
```
Authorization: Bearer <admin-jwt-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "players": [
      {
        "id": "player-123",
        "playerName": "DragonSlayer",
        "totalPoints": 15420,
        "rank": 15,
        "wavesSurvived": 45,
        "troopsKilled": 1250,
        "troopsLost": 320,
        "isDeleted": false,
        "deletedAt": null,
        "banReason": null,
        "beginnerProtectionUntil": "2025-01-10T00:00:00Z",
        "createdAt": "2024-12-01T10:30:00Z",
        "updatedAt": "2025-01-04T12:00:00Z",
        "lastActiveAt": "2025-01-04T11:45:00Z",
        "hasUserAccount": true,
        "user": {
          "id": "user-456",
          "email": "dragon@example.com",
          "displayName": "Dragon Slayer",
          "lastActiveAt": "2025-01-04T11:45:00Z"
        },
        "villageCount": 3,
        "villages": [
          {
            "id": "village-789",
            "name": "Dragon's Lair",
            "x": 25,
            "y": 30,
            "totalPoints": 8500,
            "population": 450,
            "buildingCount": 8,
            "totalBuildingLevels": 24
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 1250,
      "pages": 25,
      "hasNext": true,
      "hasPrev": false
    },
    "filters": {
      "q": "dragon",
      "minPoints": "10000",
      "hasUserAccount": "true",
      "sortBy": "totalPoints",
      "sortOrder": "desc"
    }
  }
}
```

## Search Filters

### Text Search
- **General Query (`q`)**: Searches across player names, emails, and display names
- **Player Name**: Exact match for player name
- **Email**: Partial match for email addresses
- **Case Insensitive**: All text searches ignore case

### Numeric Filters
- **Points Range**: Filter by total points (min/max)
- **Village Count**: Filter by number of villages owned
- **Building Levels**: Filter by total building levels across villages

### Status Filters
- **Account Type**: Registered users vs. guest accounts
- **Ban Status**: Currently banned players
- **Deletion Status**: Active vs. deleted accounts
- **Activity Status**: Recently active players

### Date Filters
- **Registration Date**: When player account was created
- **Last Activity**: When player was last active
- **Beginner Protection**: Current protection status

## Usage

### Basic Search
1. Enter search terms in the general search box
2. Click "Search" to find matching players
3. Review results in the table below

### Advanced Filtering
1. Use specific filter fields for precise searches
2. Combine multiple filters for complex queries
3. Use date ranges for time-based filtering
4. Apply status filters for account management

### Results Management
1. Sort results by clicking column headers
2. Navigate through pages using pagination controls
3. Click "View" to see detailed player information
4. Export data for external analysis (future feature)

## Search Strategies

### Finding Problem Players
```javascript
// Search for banned players with high activity
{
  isBanned: "true",
  minPoints: "50000",
  sortBy: "lastActiveAt",
  sortOrder: "desc"
}
```

### Identifying Inactive Players
```javascript
// Find players who haven't been active in 30+ days
{
  lastActiveBefore: "2025-01-04T00:00:00Z",
  hasUserAccount: "true",
  sortBy: "totalPoints",
  sortOrder: "desc"
}
```

### New Player Analysis
```javascript
// Find recently registered players
{
  createdAfter: "2025-01-01T00:00:00Z",
  sortBy: "createdAt",
  sortOrder: "desc"
}
```

### Top Player Identification
```javascript
// Find highest-scoring active players
{
  minPoints: "100000",
  isDeleted: "false",
  sortBy: "totalPoints",
  sortOrder: "desc"
}
```

## Performance Optimization

### Database Query Optimization
- Indexed search fields for fast lookups
- Efficient pagination with skip/limit
- Optimized joins for related data
- Query result caching

### Search Result Limits
- Maximum 200 results per page
- Automatic result limiting for performance
- Pagination for large result sets
- Memory-efficient data processing

## Security Considerations

### Access Control
- Admin-only search access
- Search result filtering based on permissions
- Audit logging of all search queries
- Rate limiting to prevent abuse

### Data Privacy
- No sensitive information exposed in results
- Aggregated data only in search results
- Secure query parameter handling
- XSS protection in search inputs

## Best Practices

### Search Query Construction
- Start with broad searches, then narrow down
- Use multiple filters for precise targeting
- Combine text and numeric filters effectively
- Consider date ranges for temporal analysis

### Result Analysis
- Review multiple pages of results
- Sort by different criteria for insights
- Cross-reference with other admin tools
- Document findings for follow-up actions

### Performance Awareness
- Use specific filters to reduce result sets
- Avoid overly broad search terms
- Limit date ranges for faster queries
- Be mindful of pagination requirements

## Integration Features

### Admin Dashboard Integration
- Direct links to player management actions
- Integration with messaging system
- Cross-reference with analytics data
- Export to other admin tools

### Player Management Workflow
1. **Search**: Find target players using filters
2. **Review**: Examine player details and history
3. **Action**: Take appropriate management actions
4. **Follow-up**: Monitor results and adjust as needed

## Future Enhancements

### Advanced Search Features
- **Saved Searches**: Save and reuse common search queries
- **Search Templates**: Pre-defined search configurations
- **Bulk Actions**: Apply actions to multiple search results
- **Search History**: Track and reuse previous searches

### Enhanced Filtering
- **Geographic Filters**: Search by village locations
- **Activity Patterns**: Filter by login frequency and duration
- **Social Filters**: Search by tribe membership and alliances
- **Achievement Filters**: Filter by completed achievements

### Analytics Integration
- **Search Analytics**: Track most-used search patterns
- **Performance Metrics**: Monitor search query performance
- **Usage Statistics**: Analyze admin search behavior
- **Result Insights**: Provide search result analytics

### Export and Reporting
- **CSV Export**: Export search results to CSV
- **PDF Reports**: Generate formatted search reports
- **Scheduled Reports**: Automated periodic search reports
- **Data Visualization**: Charts and graphs for search results



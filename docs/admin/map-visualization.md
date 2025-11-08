# Map Visualization

The Map Visualization system provides administrators with a comprehensive overview of the game world, displaying all villages, barbarian camps, and key statistics in an organized dashboard format.

## Features

### World Overview
- Complete map statistics and metrics
- World configuration display
- Real-time village and barbarian counts
- Player activity summaries

### Village Management
- Detailed village listings with owner information
- Resource and building statistics
- Loyalty and population metrics
- Capital city indicators

### Barbarian Tracking
- Active barbarian camp locations
- Troop composition details
- Last attack timestamps
- Threat assessment data

### Administrative Insights
- Banned player identification
- Empty village detection
- Continental distribution
- Game balance monitoring

## API Endpoint

### Get Map Visualization Data
```http
GET /api/admin/map/visualization
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
    "worldConfig": {
      "name": "Medieval World",
      "maxX": 200,
      "maxY": 200,
      "speed": 1,
      "isRunning": true
    },
    "villages": [
      {
        "id": "village-id",
        "x": 50,
        "y": 75,
        "name": "Player Village",
        "isCapital": true,
        "player": {
          "id": "player-id",
          "name": "PlayerName",
          "isDeleted": false,
          "isBanned": false
        },
        "buildings": 8,
        "totalBuildingLevels": 24,
        "resources": {
          "wood": 5000,
          "stone": 5000,
          "iron": 2500,
          "gold": 1000,
          "food": 10000
        },
        "totalResources": 23500,
        "population": 500,
        "loyalty": 85
      }
    ],
    "barbarians": [
      {
        "id": "barbarian-id",
        "x": 25,
        "y": 30,
        "troops": {
          "warriors": 100,
          "spearmen": 50,
          "bowmen": 30,
          "horsemen": 10
        },
        "totalTroops": 190,
        "lastAttacked": "2025-01-04T10:30:00Z"
      }
    ],
    "continents": [
      {
        "id": "continent-id",
        "name": "Continent-0-0",
        "x": 0,
        "y": 0,
        "size": 50
      }
    ],
    "stats": {
      "totalVillages": 25,
      "playerVillages": 20,
      "barbarianVillages": 5,
      "emptyVillages": 2,
      "bannedPlayers": 1,
      "totalContinents": 4,
      "worldSize": {
        "width": 200,
        "height": 200
      }
    },
    "timestamp": "2025-01-04T12:00:00Z"
  }
}
```

## Usage

### Admin Dashboard
1. Navigate to Admin Dashboard → Map Visualization tab
2. View world statistics and key metrics
3. Browse village listings with detailed information
4. Monitor barbarian camp activity and threats
5. Identify banned players and empty villages

### Data Analysis
- Sort villages by resource totals or building levels
- Identify high-value targets for barbarian placement
- Monitor player activity and village development
- Track continental distribution and balance

## Data Processing

### Village Data Enrichment
- Player ownership verification
- Building count aggregation
- Resource total calculations
- Loyalty status assessment

### Barbarian Data Aggregation
- Troop count summation
- Activity timestamp tracking
- Threat level assessment

### Statistical Calculations
- Village distribution analysis
- Player activity metrics
- Continental balance evaluation
- Game health indicators

## Performance Considerations

### Data Optimization
- Limited result sets (50 villages displayed)
- Efficient database queries with selective fields
- Real-time data freshness
- Cached statistical calculations

### Loading Optimization
- Progressive data loading
- Table virtualization for large datasets
- Lazy loading of detailed information
- Background data refresh

## Security Features

### Access Control
- Admin authentication required
- Role-based data visibility
- Sensitive information filtering
- Audit logging of access

### Data Protection
- No sensitive player data exposure
- Aggregated statistical information
- Rate limiting on data requests
- Encrypted data transmission

## Integration Points

Map visualization integrates with:
- **Player Management**: Direct links to player profiles
- **Map Tools**: Coordinate-based actions
- **Village Details**: Deep inspection capabilities
- **Barbarian Management**: Threat assessment tools

## Future Enhancements

### Interactive Features
- Clickable map coordinates
- Village detail modals
- Real-time position updates
- Drag-and-drop village relocation

### Advanced Analytics
- Resource distribution heatmaps
- Player activity timelines
- Tribal territory visualization
- Economic balance indicators

### Administrative Tools
- Mass village operations
- Automated cleanup suggestions
- Balance adjustment recommendations
- Predictive analytics

## Monitoring

### Key Metrics Tracked
- Map loading performance
- Data freshness indicators
- User interaction patterns
- Administrative action frequency

### Performance Monitoring
- Query execution times
- Data processing efficiency
- UI rendering performance
- Memory usage optimization

## Best Practices

### Data Interpretation
- Use resource totals for economic analysis
- Monitor loyalty for political stability
- Track building levels for development progress
- Analyze barbarian activity for threat assessment

### Administrative Actions
- Regular map data review
- Proactive barbarian camp management
- Player village distribution monitoring
- Continental balance maintenance

### Performance Maintenance
- Regular data cleanup
- Query optimization reviews
- Cache invalidation strategies
- Database indexing verification



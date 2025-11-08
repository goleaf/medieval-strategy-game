# Player Analytics & Reporting

The Player Analytics & Reporting system provides comprehensive insights into player behavior, village development patterns, resource distribution, and game progression metrics.

## Overview

The analytics dashboard aggregates data from multiple sources to provide administrators with deep insights into:

- Player activity patterns and retention
- Village development and resource management
- Geographic distribution and continental balance
- Economic indicators and wealth distribution
- Game health and balance metrics

## Features

### Real-time Activity Monitoring
- Active player counts (30-day window)
- New player registration trends
- Player retention analysis
- Inactive player identification

### Village Development Analysis
- Village count distribution per player
- Average population per village
- Resource accumulation patterns
- Building development metrics

### Resource Economy Tracking
- Global resource pool visualization
- Resource distribution percentiles
- Economic inequality analysis
- Trade and resource flow patterns

### Geographic Insights
- Continental population distribution
- Village density analysis
- Territorial expansion patterns
- Map utilization metrics

## API Endpoint

### Get Player Analytics
```http
GET /api/admin/analytics
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
    "overview": {
      "totalPlayers": 1250,
      "activePlayers": 892,
      "bannedPlayers": 23,
      "totalVillages": 2156,
      "activeVillages": 1987,
      "emptyVillages": 169,
      "barbarianVillages": 45,
      "totalBarbarianTroops": 12850,
      "totalResources": {
        "wood": 15420000,
        "stone": 12890000,
        "iron": 8750000,
        "gold": 3420000,
        "food": 18900000
      },
      "totalResourceValue": 59330000
    },
    "activity": {
      "activeInLast30Days": 756,
      "inactivePlayers": 287,
      "newPlayersThisMonth": 89,
      "topPlayers": [
        {
          "id": "player-1",
          "name": "DragonLord",
          "totalPoints": 456789,
          "villageCount": 15,
          "createdAt": "2024-01-15T10:30:00Z",
          "daysSinceActive": 0,
          "isActiveRecently": true,
          "hasUserAccount": true
        }
      ],
      "playerActivity": [...]
    },
    "development": {
      "villageDevelopment": [
        {
          "playerId": "player-1",
          "villageCount": 15,
          "totalPopulation": 12500,
          "totalResources": 2500000,
          "averagePopulationPerVillage": 833,
          "averageResourcesPerVillage": 166667
        }
      ],
      "resourceDistribution": [
        {
          "percentile": 10,
          "avg_wood": 12500,
          "avg_stone": 10200,
          "avg_iron": 8900,
          "avg_gold": 4200,
          "avg_food": 15600
        }
      ],
      "averageVillagesPerPlayer": 1.72,
      "averagePointsPerPlayer": 89456
    },
    "geography": {
      "continents": [
        {
          "id": "continent-1",
          "name": "Continent-0-0",
          "villageCount": 234,
          "size": 2500,
          "density": 0.094
        }
      ],
      "continentCount": 16,
      "mostPopulatedContinent": {
        "id": "continent-5",
        "name": "Continent-2-1",
        "villageCount": 456,
        "size": 3600,
        "density": 0.127
      }
    },
    "timestamp": "2025-01-04T12:00:00Z"
  }
}
```

## Data Analysis

### Activity Metrics
- **Active Players**: Players with recent activity (last 30 days)
- **New Registrations**: Players created in the current month
- **Retention Rate**: Percentage of players returning after initial activity
- **Churn Analysis**: Players who have stopped playing

### Development Patterns
- **Village Expansion**: Average villages per active player
- **Population Growth**: Population distribution across villages
- **Resource Accumulation**: Wealth distribution analysis
- **Building Efficiency**: Construction and upgrade patterns

### Economic Indicators
- **Resource Distribution**: Gini coefficient for resource inequality
- **Trade Activity**: Resource transfer patterns
- **Market Efficiency**: Price stability and market depth
- **Economic Health**: Overall game economy stability

## Usage

### Admin Dashboard
1. Navigate to Admin Dashboard → Analytics tab
2. Review overview statistics and key metrics
3. Analyze player activity patterns and retention
4. Examine village development and resource distribution
5. Monitor geographic balance and continental utilization

### Key Performance Indicators

#### Player Health Metrics
- Daily/Weekly/Monthly Active Users (DAU/WAU/MAU)
- Player retention curves (Day 1, Day 7, Day 30)
- Churn rates and player lifetime value
- Registration to first village conversion

#### Game Balance Metrics
- Resource distribution fairness
- Village density and overcrowding
- Continental balance and competition
- Barbarian threat distribution

#### Economic Health
- Resource scarcity and availability
- Price volatility and market stability
- Trade volume and economic activity
- Wealth concentration analysis

## Data Processing

### Aggregation Queries
- Player activity segmentation by time periods
- Village statistics grouped by ownership
- Resource totals and distribution analysis
- Geographic data aggregation by continents

### Performance Optimization
- Indexed database queries for fast retrieval
- Cached statistical calculations
- Incremental data updates
- Background processing for complex analytics

## Real-time Integration

The analytics system integrates with the WebSocket real-time updates to provide:
- Live player count monitoring
- Real-time activity tracking
- Instant metric updates
- Live dashboard refresh

## Reporting Features

### Automated Reports
- Daily activity summaries
- Weekly player retention reports
- Monthly game health assessments
- Custom date range analysis

### Export Capabilities
- CSV export for player data
- JSON export for API integration
- PDF reports for management
- Excel exports for detailed analysis

## Advanced Analytics

### Predictive Modeling
- Player churn prediction
- Resource demand forecasting
- Server capacity planning
- Game balance recommendations

### Cohort Analysis
- Player segmentation by registration date
- Behavior pattern identification
- Retention curve analysis
- Lifetime value calculation

## Security Considerations

### Data Privacy
- Aggregated data only (no personal information)
- Statistical analysis without individual tracking
- Secure data transmission and storage
- Admin-only access with audit logging

### Performance Impact
- Optimized queries to minimize database load
- Caching strategies for frequently accessed data
- Background processing for heavy calculations
- Rate limiting for analytics requests

## Best Practices

### Data Interpretation
- Compare metrics across time periods
- Identify trends and anomalies
- Use statistical significance testing
- Consider external factors (events, updates)

### Actionable Insights
- Focus on retention and engagement metrics
- Monitor economic balance indicators
- Track geographic distribution patterns
- Identify high-value player segments

### Dashboard Customization
- Configure relevant KPIs for your game
- Set up alerts for critical thresholds
- Create custom reports for specific needs
- Integrate with external analytics tools

## Future Enhancements

### Advanced Features
- Machine learning player behavior prediction
- Automated balance adjustment recommendations
- Real-time anomaly detection
- Advanced cohort analysis tools

### Integration Options
- External analytics platform integration
- Business intelligence dashboard connection
- Automated reporting and alerting
- API access for third-party tools

### Performance Improvements
- Real-time streaming analytics
- Distributed data processing
- Advanced caching strategies
- Predictive query optimization



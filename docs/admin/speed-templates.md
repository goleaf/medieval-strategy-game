# Speed Templates

Speed Templates provide administrators with predefined game speed configurations that can be applied instantly to change the pace of gameplay for different scenarios.

## Available Templates

### Normal Speed
- **Description**: Standard game speed for casual play
- **Game Speed**: 1x
- **Unit Speed**: 1.0x
- **Production**: 1.0x
- **Resources/Tick**: 10
- **Tick Interval**: 5 minutes

### Fast Speed
- **Description**: Accelerated game speed for faster gameplay
- **Game Speed**: 2x
- **Unit Speed**: 1.5x
- **Production**: 1.5x
- **Resources/Tick**: 15
- **Tick Interval**: 3 minutes

### Very Fast Speed
- **Description**: Very fast speed for quick rounds
- **Game Speed**: 3x
- **Unit Speed**: 2.0x
- **Production**: 2.0x
- **Resources/Tick**: 20
- **Tick Interval**: 2 minutes

### Tournament Speed
- **Description**: High speed for competitive tournaments
- **Game Speed**: 5x
- **Unit Speed**: 3.0x
- **Production**: 3.0x
- **Resources/Tick**: 30
- **Tick Interval**: 1 minute

### Extreme Speed
- **Description**: Maximum speed for very short rounds
- **Game Speed**: 10x
- **Unit Speed**: 5.0x
- **Production**: 5.0x
- **Resources/Tick**: 50
- **Tick Interval**: 1 minute

## API Endpoints

### Get All Templates
```http
GET /api/admin/speed-templates
```

**Response:**
```json
{
  "success": true,
  "data": {
    "normal": {
      "name": "Normal Speed",
      "description": "Standard game speed for casual play",
      "speed": 1,
      "unitSpeed": 1.0,
      "productionMultiplier": 1.0,
      "resourcePerTick": 10,
      "tickIntervalMinutes": 5
    }
    // ... other templates
  }
}
```

### Apply Speed Template
```http
POST /api/admin/speed-templates
```

**Request Body:**
```json
{
  "templateId": "fast"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "speed": 2,
    "unitSpeed": 1.5,
    "productionMultiplier": 1.5,
    "resourcePerTick": 15,
    "tickIntervalMinutes": 3
  },
  "message": "Speed template \"Fast Speed\" applied successfully"
}
```

## Usage

### Admin Dashboard
1. Navigate to Admin Dashboard → Speed Templates tab
2. View all available templates with their configurations
3. Click "Apply Template" on desired template
4. Confirm the action (changes take effect immediately)

### Custom Templates
To add custom templates, modify the `SPEED_TEMPLATES` object in `/app/api/admin/speed-templates/route.ts`:

```typescript
const SPEED_TEMPLATES = {
  custom: {
    name: "Custom Speed",
    description: "Your custom configuration",
    speed: 1,
    unitSpeed: 1.0,
    productionMultiplier: 1.0,
    resourcePerTick: 10,
    tickIntervalMinutes: 5,
  },
  // ... existing templates
}
```

## Validation

- Template ID must be provided
- Template ID must exist in the templates list
- World configuration must exist before applying templates
- All template values are validated server-side

## Effects on Gameplay

### Resource Production
- Production multiplier affects building output rates
- Resource per tick affects base resource generation
- Changes apply to all villages immediately

### Unit Movement
- Unit speed affects troop movement calculations
- New movements use updated speed values
- Existing movements continue with old speed

### Combat Timing
- Game speed affects combat resolution timing
- Faster speeds result in quicker battle outcomes

### Construction & Training
- All queue-based activities are affected by speed changes
- Completion times are recalculated based on new multipliers

## Audit Logging

All speed template applications are logged with:
- Action: `APPLY_SPEED_TEMPLATE`
- Details: Template name applied
- Target Type: `WORLD_CONFIG`
- Target ID: World config record ID

## Performance Considerations

- Speed changes affect all game calculations
- Higher speeds increase server load due to more frequent updates
- Database queries may need optimization for high-speed scenarios
- WebSocket updates become more frequent with faster ticks

## Security

- Only authenticated administrators can apply speed templates
- All actions are logged for audit purposes
- Templates cannot be modified through API (must be hardcoded)
- Changes take effect immediately across entire game world

## Monitoring

After applying speed templates, monitor:
- Server performance and response times
- Database query performance
- WebSocket connection stability
- Player activity and engagement metrics

## Rollback

To rollback speed changes:
1. Apply a different speed template
2. Or manually edit world configuration values
3. All changes are logged for reference

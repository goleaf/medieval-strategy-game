# Task System

The task system is a comprehensive progression and reward mechanism inspired by Travian: Legends. It guides players through village development and provides meaningful rewards for completing various objectives.

## Overview

The task system consists of two main categories:

1. **Village-Specific Tasks**: Tasks that apply to individual villages
2. **Player/Global Tasks**: Tasks that apply across all of a player's villages

## Task Categories

### Village-Specific Tasks

These tasks focus on individual village development and include:

#### Building Level Tasks
- **Warehouse**: Levels 1, 3, 7, 12, 20
- **Granary**: Levels 1, 3, 7, 12, 20
- **Barracks**: Levels 1, 3, 7, 12, 20
- **Stable**: Levels 1, 3, 7, 12, 20
- **Academy**: Levels 1, 10, 20
- **Smithy**: Levels 1, 10, 20
- **Town Hall**: Levels 1, 10, 20
- **Workshop**: Level 1
- **Main Building**: Levels 1, 3, 7, 12, 20
- **Cranny**: Levels 1, 3, 6, 10
- **Marketplace**: Levels 1, 3, 7, 12, 20
- **Embassy**: Level 1
- **Residence**: Levels 1, 3, 7, 10, 20
- **Palace/Command Center**: Levels 1, 3, 7, 12, 20
- **Wall**: Levels 1, 3, 7, 12, 20
- **Rally Point**: Levels 1, 10, 20

#### Resource Field Tasks
- **Sawmill**: Levels 1, 5
- **Brickyard**: Levels 1, 5
- **Iron Foundry**: Levels 1, 5
- **Grain Mill**: Levels 1, 5
- **Bakery**: Levels 1, 5

#### Population Tasks
- Population milestones: 50, 100, 150, 250, 350, 500, 750, 1000

### Player/Global Tasks

These tasks track overall player progress:

#### Culture Points Production
- Culture points production: 50, 100, 150, 250, 350, 500

#### Global Population
- Total population across all villages: 500, 1000, 1500, 2500, 5000, 10000, 20000

## Reward System

### Base Rewards

Each task provides rewards in resources and hero experience:

- **Building Level Tasks**: 50-200 base resources per level
- **Resource Field Tasks**: 30-50 base resources per level
- **Population Tasks**: 100-200 base resources
- **Culture Points Tasks**: 75-150 base resources

### Reward Multipliers

- **Task Type Multipliers**: Different multipliers based on task difficulty
- **Completion Count Bonus**: Each subsequent completion of the same task type gives 50% larger rewards
- **Hero Level Bonus**: 10% experience bonus per hero level

### Resource Rewards

Tasks reward equal amounts of all basic resources:
- Wood
- Stone
- Iron
- Gold
- Food

### Hero Experience

Tasks also reward hero experience points, scaled by task difficulty and hero level.

## Task Progression

### Automatic Progress Tracking

The system automatically tracks progress by:

1. **Building Upgrades**: Monitors building levels in real-time
2. **Resource Fields**: Tracks resource field development
3. **Population Growth**: Monitors village and total population
4. **Culture Points**: Tracks culture point production rates

### Completion Detection

Tasks are checked for completion:

- **Real-time**: When buildings are upgraded
- **Periodic**: During game ticks
- **Manual**: When players request progress updates

## Village Conquest

### Task Transfer Rules

When a village is conquered:

1. **Completed Tasks**: All completed tasks are transferred to the new owner
2. **In-Progress Tasks**: Progress is maintained for the new owner
3. **Resource Rewards**: No resource rewards for previously completed tasks
4. **Special Resets**: Certain tasks are reset for new owners (loyalty, residence/palace)

### Conquest-Specific Tasks

New tasks are created for conquered villages:

- **Residence/Palace**: Levels 1, 10, 20 (replaces existing)
- **Wall**: Levels 1, 10, 20 (replaces existing)
- **Loyalty**: Reach 100 loyalty

## Technical Implementation

### Database Schema

#### Task Model
```prisma
model Task {
  id String @id @default(cuid())
  type TaskType
  category TaskCategory
  level Int
  // Requirements and rewards...
}
```

#### TaskProgress Model
```prisma
model TaskProgress {
  id String @id @default(cuid())
  taskId String
  playerId String
  villageId String? // For village-specific tasks
  isCompleted Boolean @default(false)
  completedAt DateTime?
  claimedAt DateTime?
}
```

### API Endpoints

#### Get Tasks
```
GET /api/tasks?villageId={id}&category={category}
```

#### Update Progress
```
POST /api/tasks/update
```

#### Village Tasks
```
GET /api/tasks/village/{villageId}
POST /api/tasks/village/{villageId}/update
```

### Frontend Components

#### TaskList Component
- Displays tasks for a village or globally
- Shows progress bars and completion status
- Allows manual progress updates

## Integration Points

### Village Creation
When a new village is created:
1. Village-specific tasks are generated
2. Task progress records are created

### Building Upgrades
When buildings are upgraded:
1. Relevant tasks are checked for completion
2. Rewards are automatically awarded

### Game Ticks
During game ticks:
1. Population and culture point tasks are evaluated
2. Progress is updated automatically

## Future Enhancements

### Planned Features
- **Task Categories**: Organize tasks into categories (Economy, Military, Culture)
- **Achievement Badges**: Visual rewards for completing task series
- **Task Chains**: Prerequisites and follow-up tasks
- **Seasonal Tasks**: Time-limited special tasks
- **Guild Tasks**: Community-wide objectives

### Performance Optimizations
- **Batch Updates**: Process multiple task completions efficiently
- **Caching**: Cache task progress for faster loading
- **WebSocket Updates**: Real-time task completion notifications

## Configuration

### Task Definitions
Tasks are defined in `lib/game-services/task-service.ts` with:
- Task requirements
- Reward calculations
- Completion logic

### Reward Multipliers
Configurable multipliers in the task service:
- Base reward amounts
- Hero experience bonuses
- Completion count scaling

## Testing

### Unit Tests
- Task completion logic
- Reward calculations
- Progress tracking

### Integration Tests
- Village creation with tasks
- Building upgrade completions
- Conquest task transfers

## Monitoring

### Analytics
- Task completion rates
- Popular task types
- Reward distribution

### Error Handling
- Failed task completions
- Reward awarding errors
- Database consistency checks

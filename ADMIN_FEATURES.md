# Admin Features Implementation

This document describes the admin features implemented for the Medieval Strategy Game.

## Features Implemented

### 1. World Configuration
- **Location**: `/app/api/admin/world/config/route.ts`
- **UI**: Admin Dashboard → World Config tab
- **Features**:
  - World speed (game speed multiplier)
  - Night bonus multiplier (defense bonus during night)
  - Beginner protection hours (protection duration for new players)
  - Beginner protection enabled/disabled toggle
  - Resource per tick
  - Production multiplier
  - Game running/paused status

### 2. Unit/Balancing Editor
- **Location**: `/app/api/admin/units/balance/route.ts`
- **UI**: Admin Dashboard → Unit Balance tab
- **Features**:
  - View all troop types with costs and stats
  - Guardrails: Stat sum validation (min 50, max 200)
  - Ensures all stats are positive
  - Ensures all costs are non-negative
  - Read-only view (to modify, update troop-service.ts or implement DB-backed system)

### 3. Player Moderation
- **Location**: `/app/api/admin/players/[id]/`
- **UI**: Admin Dashboard → Players tab
- **Features**:
  - **Ban Player**: `/api/admin/players/[id]/ban` - Ban a player with reason
  - **Unban Player**: `/api/admin/players/[id]/unban` - Remove ban from player
  - **Rename Player**: `/api/admin/players/[id]/rename` - Change player name (with validation)
  - **Move Village**: `/api/admin/players/[id]/move-village` - Relocate player's village to new coordinates

### 4. Map Tools
- **Location**: `/app/api/admin/map/`
- **UI**: Admin Dashboard → Map Tools tab
- **Features**:
  - **Spawn Barbarian**: `/api/admin/map/spawn-barbarian` - Create barbarian village at coordinates with custom troop counts
  - **Relocate Tile**: `/api/admin/map/relocate-tile` - Move any village to new coordinates
  - **Wipe Empty**: `/api/admin/map/wipe-empty` - Delete empty villages (no buildings > level 1, no troops, minimal resources)

### 5. Stats Dashboard
- **Location**: `/app/api/admin/stats/route.ts`
- **UI**: Admin Dashboard → Stats tab
- **Features**:
  - Online users (active in last 15 minutes)
  - Online players (active in last 15 minutes)
  - Actions per minute (current minute)
  - Average actions per minute (last 10 minutes)
  - Queued jobs depth (pending attacks + movements)
  - Total players count
  - Total villages count
  - Active attacks count
  - Game status and world speed
  - Error logs (last 50 errors)

## Database Schema Updates

### WorldConfig Model
Added fields:
- `nightBonusMultiplier` (Float, default 1.2) - Defense bonus during night
- `beginnerProtectionHours` (Int, default 72) - Hours of protection for new players
- `beginnerProtectionEnabled` (Boolean, default true) - Enable/disable protection

### Player Model
Added field:
- `beginnerProtectionUntil` (DateTime?) - When beginner protection expires

## API Endpoints

### World Config
- `GET /api/admin/world/config` - Get current world configuration
- `PUT /api/admin/world/config` - Update world configuration

### Unit Balance
- `GET /api/admin/units/balance` - Get all troop balances
- `PUT /api/admin/units/balance` - Update troop balances (with validation)

### Player Moderation
- `POST /api/admin/players/[id]/ban` - Ban a player
- `POST /api/admin/players/[id]/unban` - Unban a player
- `POST /api/admin/players/[id]/rename` - Rename a player
- `POST /api/admin/players/[id]/move-village` - Move player's village

### Map Tools
- `POST /api/admin/map/spawn-barbarian` - Spawn barbarian village
- `POST /api/admin/map/relocate-tile` - Relocate village tile
- `POST /api/admin/map/wipe-empty` - Wipe empty villages

### Stats
- `GET /api/admin/stats` - Get system statistics and error logs

## UI Features

The admin dashboard (`/app/admin/dashboard/page.tsx`) includes:

1. **Stats Tab**: Real-time statistics with auto-refresh every 30 seconds
2. **World Config Tab**: Form to update all world configuration settings
3. **Unit Balance Tab**: Read-only view of all troop types and their stats
4. **Players Tab**: Player search, ban/unban, rename, and move village actions
5. **Map Tools Tab**: Tools for spawning barbarians, relocating tiles, and wiping empty villages
6. **Error Logs Tab**: View recent error logs

## Validation & Guardrails

### Unit Balance Validation
- Stat sum must be between 50 and 200
- All stats must be positive
- All costs must be non-negative

### Player Moderation Validation
- Player name must be 1-20 characters
- Player name must be unique
- Coordinates must be within world bounds
- Village must belong to player before moving

### Map Tools Validation
- Coordinates must be within world bounds
- Position must not be occupied
- Wipe empty requires confirmation

## Notes

1. **Barbarian Spawning**: Creates a reusable barbarian player if one doesn't exist. All barbarian villages share the same player ID.

2. **Action Tracking**: The stats API includes action tracking, but to fully implement this, you should call `trackAction()` from other API routes. This is currently not implemented but the infrastructure exists.

3. **Database Migration**: Run `npx prisma migrate dev` to apply schema changes for the new WorldConfig and Player fields.

4. **Audit Logging**: All admin actions are logged to the `AuditLog` table for tracking purposes.

5. **Error Tracking**: Errors are tracked in-memory (last 100). For production, consider using a proper logging service.

## Future Enhancements

- Implement database-backed unit balance system
- Add action tracking to all API routes
- Implement proper error logging service
- Add admin authentication/authorization
- Add bulk operations for player moderation
- Add map visualization tools
- Add real-time stats via WebSocket


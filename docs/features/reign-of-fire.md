# Reign of Fire - Game Mechanics Implementation

## Overview

Reign of Fire is the annual special server for Travian: Legends, featuring faster gameplay, strategic depth, and unique mechanics. This document outlines the implementation of Reign of Fire mechanics in our medieval strategy game.

## Core Features Implemented

### 1. Ancient Europe Map System
- **87 Conquerable Regions**: Each region produces Victory Points (VP) for controlling players
- **Region Types**:
  - **CAPITAL**: High VP production (50 VP), strategic importance
  - **STRATEGIC**: Medium VP production (30 VP), key defensive positions
  - **BORDER**: Low VP production (20 VP), frontier regions
  - **NORMAL**: Standard VP production (10 VP), balanced regions
- **Region-based Spawning**: Players spawn in designated regions rather than random locations
- **Crossable Map Edges**: Unlike regular worlds, map edges can be traversed

### 2. Victory Points System
- **Storage**: Victory Points are stored at the player level (not village level)
- **Production**: Each controlled region produces VP based on its type and population
- **Conquest**: Conquering villages in regions transfers control and VP production
- **Display**: VP totals visible in player profiles and leaderboards

### 3. Hero System
- **Hero Creation**: Each player can have one hero
- **Stats**: Health, Attack, Defense, Speed
- **Leveling**: XP-based progression with level requirements
- **Equipment**: 4 rarity tiers (Common, Uncommon, Rare, Epic)
- **Adventures**: Hero can embark on adventures for XP and loot

### 4. Item Rarity System
- **Four Tiers**: Common, Uncommon, Rare, Epic
- **Quality Levels**: 1-3 quality tiers within each rarity
- **Stat Bonuses**: Attack and Defense bonuses scale with rarity and quality
- **Equipment Slots**: Helmet, Armor, Weapon, Shield, etc.
- **Crafting**: Items can be smelted for materials and reforged

### 5. Adventure System
- **Doubled Frequency**: 6 adventures per day (vs 3 in regular worlds)
- **Reduced Requirements**: 20 adventures needed for auction house (vs 10)
- **Halved Difficulty**: Lower XP requirements and faster completion
- **Increased Loot**: Higher item drop rates and better rewards

### 6. Faster Construction
- **25% Speed Increase**: Applies to Main Building, Granary, Warehouse, and resource fields
- **Speed Scaling**: Construction speed scales with world speed settings
- **Queue Management**: Sequential construction queue with time calculations

### 7. Tribe Selection Changes
- **Teutons Included**: Teutons are available in Reign of Fire
- **Vikings Excluded**: Vikings are not available in this special world
- **Romans Standard**: Romans use standard troop setup (no boosted legionnaires)

## Technical Implementation

### Database Schema Changes

#### New Models
```prisma
model Region {
  id              String    @id @default(cuid())
  name            String
  regionCode      String    @unique
  centerX         Int
  centerY         Int
  radius          Int
  victoryPoints   Int       @default(0)
  controllingPlayerId String?
  regionType      RegionType @default(NORMAL)
  population      Int       @default(0)
  villages        Village[]
}

model Hero {
  id              String    @id @default(cuid())
  playerId        String
  name            String    @default("Hero")
  level           Int       @default(1)
  experience      Int       @default(0)
  health          Int       @default(100)
  attack          Int       @default(10)
  defense         Int       @default(5)
  speed           Int       @default(5)
  adventuresCompleted Int @default(0)
  lastAdventureAt     DateTime?
  equipment       HeroEquipment[]
  inventory       HeroItem[]
  adventures      HeroAdventure[]
}

model Adventure {
  id              String    @id @default(cuid())
  name            String
  description     String
  difficulty      Int       @default(1)
  durationHours   Float     @default(1.0)
  experienceReward Int      @default(10)
  goldReward      Int       @default(50)
  itemRewardChance Float    @default(0.1)
  heroLevelRequired Int     @default(1)
  adventuresCompletedRequired Int @default(0)
  isActive        Boolean   @default(true)
}
```

#### Updated Models
- **Player**: Added `victoryPoints` field
- **Village**: Added optional `regionId` relation
- **GameWorld**: Added Reign of Fire specific settings
- **WorldConfig**: Made `gameWorldId` optional for backward compatibility

### API Endpoints

#### Hero Management
- `GET /api/game/hero` - Get hero data
- `POST /api/game/hero` - Create hero
- `GET /api/game/hero/equipment` - Get equipped items
- `GET /api/game/hero/inventory` - Get inventory items
- `POST /api/game/hero/adventure` - Start adventure
- `GET /api/game/hero/adventure` - Get current adventures

#### Admin Management
- `GET /api/admin/regions` - List all regions
- `POST /api/admin/regions/generate` - Generate regions

### Frontend Components

#### Hero Management (`components/game/hero-management.tsx`)
- Hero stats display
- Equipment management
- Inventory management
- Adventure controls
- XP progression tracking

#### Admin Regions (`app/admin/regions/page.tsx`)
- Regions overview dashboard
- Region generation controls
- Victory Points tracking
- Controller assignment

## Game Balance

### Construction Speed
- **Main Building**: 25% faster construction
- **Granary**: 25% faster construction
- **Warehouse**: 25% faster construction
- **Resource Fields**: 25% faster construction
- **Other Buildings**: Normal speed

### Adventure Balance
- **Frequency**: 6 adventures per day
- **Cooldown**: 1 hour between adventures
- **XP Multiplier**: 0.5x difficulty (easier leveling)
- **Loot Multiplier**: 1.5x item drop rates
- **Auction House**: 20 adventures required

### Region Balance
- **Capital Regions**: 9 regions, 50 VP each (450 total VP)
- **Strategic Regions**: ~26 regions, 30 VP each (~780 total VP)
- **Border Regions**: ~26 regions, 20 VP each (~520 total VP)
- **Normal Regions**: ~26 regions, 10 VP each (~260 total VP)
- **Total VP Production**: ~2010 VP across all regions

## Future Enhancements

### Planned Features
1. **Hero Damage Model**: Adjusted damage calculation for powerful items
2. **Item Crafting System**: Smelt, forge, and refine mechanics
3. **Troop Forwarding**: Send troops between villages and allies
4. **Cities & Watchtowers**: Special building types
5. **Alliance Notifications**: Real-time attack notifications
6. **Tribe Choice**: Select tribe for first 3 villages

### Technical Improvements
1. **Region Conquest Logic**: Automatic VP transfer on village conquest
2. **Hero Adventure Processing**: Background job system for adventure completion
3. **Item Generation**: Procedural item generation with balanced stats
4. **Performance Optimization**: Database indexing for large-scale operations

## Testing Checklist

### Core Functionality
- [ ] Hero creation and management
- [ ] Adventure system (start/complete)
- [ ] Item equipment and inventory
- [ ] Region generation and display
- [ ] Victory Points calculation
- [ ] Construction speed modifications
- [ ] Tribe selection restrictions

### Admin Features
- [ ] Region management interface
- [ ] Region generation controls
- [ ] Victory Points monitoring
- [ ] Player region assignments

### Performance
- [ ] Database query optimization
- [ ] API response times
- [ ] Frontend rendering performance
- [ ] Memory usage monitoring

## Deployment Notes

1. **Database Migration**: Run setup script to initialize Reign of Fire world
2. **Region Generation**: Use admin interface to generate the 87 regions
3. **Hero Creation**: Players can create heroes through the hero management interface
4. **World Configuration**: Ensure GameWorld is set to REIGN_OF_FIRE version

## Monitoring

### Key Metrics
- Hero creation rate
- Adventure completion rate
- Region control distribution
- Victory Points accumulation
- Item crafting frequency

### Error Tracking
- Hero adventure failures
- Region assignment conflicts
- Item generation errors
- Construction speed calculation issues

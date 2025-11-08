# Player Interactions

This document describes the various ways players can interact with each other in the medieval strategy game, based on the Travian: Legends model.

## Table of Contents

1. [Attacking Other Players](#attacking-other-players)
2. [Reinforcing Allies](#reinforcing-allies)
3. [Trading Resources](#trading-resources)
4. [Messaging System](#messaging-system)
5. [Beginner Protection](#beginner-protection)

## Attacking Other Players

Players can attack other villages to steal resources, reduce loyalty, or conquer territories.

### Attack Types

#### Normal Attack (Conquest)
- Fought until one side is completely destroyed
- Can use catapults to damage walls and buildings
- Can use chiefs/nobles to reduce loyalty and potentially conquer villages
- Winner takes resources from defender's warehouse

#### Raid
- Smaller engagement focused on resource theft
- Catapults don't fire (no wall/building damage)
- Chiefs/nobles don't reduce loyalty
- Attacker usually keeps at least 1 surviving unit
- Winner takes resources but defender retains more troops

### Attack Restrictions

- Cannot attack villages under beginner protection (except scouting)
- Cannot attack your own villages
- Protected players can only attack Natars and unoccupied oases

### API Endpoints

#### Launch Attack
```
POST /api/attacks/launch
```

**Request Body:**
```json
{
  "fromVillageId": "string",
  "toVillageId": "string", // optional, can use coordinates instead
  "toX": 100, // optional, required if no toVillageId
  "toY": 200, // optional, required if no toVillageId
  "attackType": "RAID" | "CONQUEST" | "SUPPRESSION" | "SCOUT",
  "units": {
    "troopId": quantity
  }
}
```

#### Cancel Attack
```
DELETE /api/attacks/[id]
```

### UI Components

- `AttackPlanner`: Step-by-step interface for selecting targets and troops
- Supports both coordinate input and village selection
- Real-time troop availability checking

## Reinforcing Allies

Send troops to allied villages to help defend against attacks.

### Reinforcement Mechanics

- Reinforcements arrive at target village and become defensive troops
- Village owner pays upkeep for all reinforcement troops
- Reinforcements stay until withdrawn by sender or village owner
- If alliance ends, reinforcements are automatically returned

### API Endpoints

#### Send Reinforcements
```
POST /api/reinforcements/send
```

**Request Body:**
```json
{
  "fromVillageId": "string",
  "toVillageId": "string", // optional
  "toX": 100, // optional
  "toY": 200, // optional
  "units": {
    "troopId": quantity
  }
}
```

### UI Components

- `ReinforcementPlanner`: Similar to attack planner but for sending troops to allies
- Coordinate-based targeting
- Troop selection with availability checking

## Trading Resources

Exchange resources with other players through marketplace or direct sending.

### Marketplace Trading

#### Creating Offers
```
POST /api/market/orders
```

**Request Body:**
```json
{
  "villageId": "string",
  "type": "SELL" | "BUY",
  "offeringResource": "WOOD" | "STONE" | "IRON" | "GOLD" | "FOOD",
  "offeringAmount": 1000,
  "requestResource": "WOOD" | "STONE" | "IRON" | "GOLD" | "FOOD",
  "requestAmount": 800,
  "expiresAt": "2024-01-01T00:00:00Z" // optional
}
```

#### Accepting Offers
```
PATCH /api/market/orders
```

**Request Body:**
```json
{
  "orderId": "string",
  "action": "ACCEPT"
}
```

### Direct Resource Sending

Send resources directly to another village without marketplace fees.

#### API Endpoint
```
POST /api/market/send
```

**Request Body:**
```json
{
  "fromVillageId": "string",
  "toVillageId": "string", // optional
  "toX": 100, // optional
  "toY": 200, // optional
  "resources": {
    "wood": 1000,
    "stone": 500,
    "iron": 300,
    "gold": 100,
    "food": 200
  }
}
```

### Trading Restrictions

- Players under beginner protection have limited trading options
- Protected players can only accept 1:1 or better trades
- Protected players can only send resources to alliance members

### UI Components

- `ResourceSender`: Interface for direct resource sending
- Marketplace integration in village interface
- Trade history and offer management

## Messaging System

Communicate with other players through various message types.

### Message Types

#### Player-to-Player Messages
Direct messages between individual players.

#### Alliance Messages
Messages sent to alliance members with role-based targeting:
- `[ally]`: Sent to all alliance members
- `[def]`: Sent to defense coordinators
- `[off]`: Sent to offense coordinators

#### System Messages
Automatic messages for game events (attacks, reinforcements, etc.)

### API Endpoints

#### Send Message
```
POST /api/messages
```

**Request Body:**
```json
{
  "senderId": "string",
  "recipientId": "string", // for player messages
  "allianceRole": "ally" | "def" | "off", // for alliance messages
  "type": "PLAYER" | "SYSTEM" | "ALLY_REQUEST" | "DIPLOMACY" | "TRADE_OFFER",
  "subject": "Message subject",
  "content": "Message content"
}
```

#### Get Messages
```
GET /api/messages?playerId=string&type=PLAYER&isRead=false
```

#### Mark as Read
```
PATCH /api/messages
```

**Request Body:**
```json
{
  "messageId": "string",
  "isRead": true
}
```

#### Report Spam
```
POST /api/messages/report-spam
```

**Request Body:**
```json
{
  "messageId": "string",
  "reason": "Spam reason"
}
```

### UI Components

- `MessageComposer`: Interface for composing and sending messages
- Support for both player and alliance messaging
- Message history with filtering and search
- Spam reporting functionality

## Beginner Protection

New players receive temporary protection from attacks and trading restrictions.

### Protection Duration

Based on world speed:
- Speed 1: 5 days
- Speed 2-3: 3 days
- Speed 5: 2 days
- Speed 10+: 1 day

### Protection Features

#### Attack Restrictions
- Cannot be attacked by other players (except scouting)
- Can only attack Natars and unoccupied oases
- Cannot be conquered

#### Trading Restrictions
- Can only send resources to alliance/confederacy members
- Can only accept 1:1 or better marketplace trades
- Limited marketplace access

### Protection Extension

Players can extend protection once for additional time:
- Speed 1: +3 days
- Speed 2-3: +3 days
- Speed 5: +2 days
- Speed 10+: +1 day

### API Endpoints

#### Check Protection Status
```
GET /api/protection/status?playerId=string
```

**Response:**
```json
{
  "isProtected": true,
  "canExtend": false,
  "timeRemainingHours": 24
}
```

#### Extend Protection
```
POST /api/protection/extend
```

**Request Body:**
```json
{
  "playerId": "string"
}
```

## Implementation Notes

### Database Schema

The implementation uses several key database models:

- `Attack`: Combat between villages
- `Reinforcement`: Troop support sent to allies
- `Message`: Player communication
- `MarketOrder`: Resource trading offers
- `Player.beginnerProtectionUntil`: Protection expiration

### Game Balance

- Raid attacks have lower attacker casualties
- Conquest attacks can lead to village ownership transfer
- Protection system prevents harassment of new players
- Alliance messaging enables coordinated gameplay

### Security Considerations

- Input validation on all endpoints
- Protection checks prevent exploitation
- Rate limiting on message sending
- Audit logging for administrative actions

## Future Enhancements

- Alliance diplomacy system
- War declarations between tribes
- Advanced trading with merchant fleets
- Message encryption for sensitive communications
- Automated trade routes

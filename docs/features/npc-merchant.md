# NPC Merchant Feature

## Overview

The NPC Merchant is a premium Gold feature that allows players to redistribute resources within their villages at a 1:1 exchange ratio. This feature is particularly useful when players need to balance their resources for construction, troop training, or other village activities.

## Feature Details

### Cost and Requirements
- **Gold Cost**: 3 Gold per use
- **Minimum Exchange**: 50 units per resource type
- **Exchange Rate**: 1:1 ratio for all resource types
- **Available Resources**: Wood, Stone, Iron, Gold, Food

### Functionality

#### Resource Redistribution
- Exchange any resource type for another within the same village
- Perfect for converting excess resources into needed ones
- Useful when training troops that require specific resource combinations
- Helpful for finishing major construction projects

#### Quick Balance Feature
- "Distribute remaining resources" button automatically balances all resources equally
- Useful for optimizing resource distribution across resource fields
- Helps maintain balanced resource production

#### Building Integration
- Available directly from building upgrade dialogs when resources are insufficient
- Automatically pre-fills the required resource amounts
- Streamlined workflow for resource management during construction

## API Endpoints

### POST `/api/market/npc-merchant`
Exchange resources using the NPC Merchant.

**Request Body:**
```json
{
  "villageId": "string",
  "fromResource": "WOOD|STONE|IRON|GOLD|FOOD",
  "toResource": "WOOD|STONE|IRON|GOLD|FOOD",
  "amount": 100
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "villageId": "string",
    "fromResource": "WOOD",
    "toResource": "STONE",
    "amount": 100,
    "goldCost": 3
  }
}
```

### POST `/api/market/npc-merchant/balance`
Balance all resources equally across the village.

**Request Body:**
```json
{
  "villageId": "string"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "villageId": "string",
    "totalResources": 5000,
    "balancedAmount": 1000,
    "goldCost": 3
  }
}
```

## Frontend Implementation

### Marketplace Management Tab
Located at `/market` with a "Management" tab containing:
- Resource exchange interface
- Current village resource display
- Gold balance display
- Quick balance button
- Transaction history

### Building Integration
When upgrading buildings with insufficient resources:
- "Exchange resources" button appears next to upgrade requirements
- Opens NPC Merchant dialog with pre-filled amounts
- Returns to building view after successful exchange

## Admin Controls

### Feature Management
- Enable/disable NPC Merchant globally
- Adjust gold cost per use
- Modify minimum exchange amount
- Configure available resource types

### Usage Analytics
- Track total NPC Merchant usage
- Monitor gold expenditure on NPC Merchant
- View player usage patterns
- Generate reports on resource redistribution trends

### Audit Logging
All NPC Merchant transactions are logged in the AuditLog table with:
- Player ID and village ID
- Resources exchanged (from/to amounts)
- Gold cost deducted
- Timestamp and admin context

## Database Schema

### No Additional Tables Required
The feature utilizes existing tables:
- `Village` table for resource storage
- `AuditLog` table for transaction logging
- `Admin` table for admin controls

## Usage Examples

### Scenario 1: Construction Shortage
Player needs 2000 Stone for a warehouse upgrade but only has 1500 Stone and excess Wood.
- Uses NPC Merchant to convert 500 Wood → 500 Stone
- Pays 3 Gold for the exchange
- Completes warehouse upgrade

### Scenario 2: Troop Training
Player needs to train Catapults requiring Iron and Stone ratio.
- Has excess Wood, insufficient Stone
- Uses NPC Merchant to balance resources
- Trains troops with optimized resource allocation

### Scenario 3: Resource Balancing
Player has uneven resource production.
- Uses "Distribute remaining resources" feature
- All resources automatically balanced to equal amounts
- Optimizes production efficiency

## Error Handling

### Insufficient Gold
```
{
  "success": false,
  "error": "Insufficient gold for NPC Merchant (requires 3 Gold)"
}
```

### Insufficient Resources
```
{
  "success": false,
  "error": "Insufficient WOOD resources (available: 450, required: 500)"
}
```

### Invalid Exchange Amount
```
{
  "success": false,
  "error": "Exchange amount must be at least 50 units"
}
```

### Same Resource Exchange
```
{
  "success": false,
  "error": "Cannot exchange resource with itself"
}
```

## Performance Considerations

- Transaction uses database transactions for atomicity
- Resource validation performed before gold deduction
- Audit logging is asynchronous to avoid blocking main transaction
- Minimal database queries for fast response times

## Security

- All transactions validated server-side
- Resource amounts checked before processing
- Gold balance verified before deduction
- Admin-only controls for feature management
- Comprehensive audit logging for fraud prevention

## Future Enhancements

- Bulk exchange operations
- Scheduled automatic balancing
- Premium discounts for frequent users
- Analytics dashboard for players
- Mobile app integration
- Cross-village resource transfers (with additional gold cost)

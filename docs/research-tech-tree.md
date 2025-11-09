Technology Tree & Academy Research

Overview
- Technologies are one-time, account-wide unlocks researched via the Academy.
- Each village can research exactly one technology at a time (no queueing).
- Research costs resources and time; progress continues while offline and cannot be canceled.

Statuses
- Available (green): all prerequisites met and not researched yet.
- Locked (red): missing building levels or prerequisite technologies.
- In Progress (yellow): currently being researched in this village.
- Completed (gray): permanently unlocked for the player.

Data Model
- Technology: blueprint row defining name, costs, base time, required Academy level, JSON prerequisites and effects.
- PlayerTechnology: records completion timestamps per player for each technology.
- ResearchJob: active research per village (links to the village’s Academy and a Technology). Completed jobs remain as history.
- EventQueueType.RESEARCH_COMPLETION triggers completion processing via the game tick.

API
- GET /api/villages/:id/tech-tree?playerId=... → list technologies with statuses for the specified village.
- POST /api/villages/:id/tech-tree { playerId, techKey } → starts research if available; deducts resources and schedules completion.

Seeding
- Run node scripts/seed-technologies.ts to create baseline technologies:
  UNIT_SCOUT, UNIT_RAM, UNIT_CATAPULT, UNIT_NOBLE, SYSTEM_PALADIN, BUILDING_SMITHY_UPGRADES, BUILDING_MARKET_ADV, SYSTEM_SUPPORT_MGMT.

Requirements JSON (Technology.prerequisites)
{
  "tech": ["UNIT_RAM", "SYSTEM_PALADIN"],
  "buildings": [{ "type": "WORKSHOP", "level": 3 }, { "type": "ACADEMY", "level": 5 }]
}

Effects JSON (Technology.effects)
{
  "unlocks": {
    "units": ["SCOUT", "RAM", "CATAPULT", "NOBLEMAN"],
    "systems": ["PALADIN", "CONQUEST", "MARKET_ROUTES", "FLAGS", "SUPPORT_MGMT"],
    "buildings": ["SMITHY_ADV"]
  }
}

UI
- Academy page: /village/:id/academy renders a grid of tech cards with color-coded statuses, tooltips for missing requirements, and a progress bar/countdown for active research.


# Quest System

The new Quest System replaces the legacy linear task chain with flexible quest panes that reward natural play. Players progress across multiple quest categories simultaneously, earn proportional resource refunds for construction, and bank rewards for later collection.

## Panes at a Glance

| Pane   | Purpose | Notes |
| ------ | ------- | ----- |
| **Main Quests** | Core progression beats covering village setup, economic expansion, troop unlocks, and early warfare prep. | Always visible. |
| **Tribe Quests** | Focus on social play—joining a tribe, coordinating, and unlocking group bonuses. | Appears once the account is tribe eligible. |
| **Event Quests** | Seasonal objectives that surface only when an event is active on the player’s market. | Hidden when no event keys are active. |
| **Mentor Quests** | Tutorial-style guidance for new or returning players. | Auto-completes onboarding boosts. |
| **Rewards Pane** | Dedicated ledger for unclaimed quest and refund payouts. | Accessible on both desktop and mobile. |

> Mobile players can access the Rewards pane by swiping to the second main-menu page and tapping **Rewards**, or via **Menu → Profile → arrow next to the player name → Rewards**.

## Flexible Progression

* Quest panes run in parallel—players are never forced down a single quest line.
* Building in any order still yields full value because the system tracks actual construction costs and issues refunds accordingly.
* Players can push HQ, Market, Smithy, or military structures early without “breaking” the quest sequence.
* Delayed or skipped steps do not forfeit payouts; refunds are granted as soon as qualifying actions occur.

## Resource Refund Mechanic

* Every completed building upgrade grants a resource refund equal to a configurable percentage of the real upgrade cost.
* Example: with a 10% reward ratio, finishing Headquarters level 20 (costing 7 266 wood) grants **727 wood** (`Math.round(726.6)`), replacing the old fixed 100-wood payout.
* Queue inflation safeguard: if more than five builds are queued and in-game cost inflation applies, the refund remains capped at the initial (pre-inflation) cost recorded when the task was added—no inflation abuse.
* Refund entries are tagged with the originating building and village so the player can claim them strategically from the Rewards pane.

## Claiming Rewards

* Completed quest rewards and construction refunds accumulate in the Rewards pane until claimed.
* Players can time claims to avoid Warehouse overflow—perfect before long training queues or troop dispatches.
* Rewards can be claimed in bulk for a specific village via `POST /api/tasks/claim` and are deposited directly into that village’s storage. Hero experience bonuses are applied automatically if the hero exists.

## API Surface

| Endpoint | Description |
| -------- | ----------- |
| `GET /api/tasks` | Returns all quest panes (Main, Tribe, Mentor, optional Event) plus the Rewards ledger. Optional `eventKey` query params expose seasonal panes. |
| `POST /api/tasks` | Forces a quest sync and returns refreshed panes (accepts optional `eventKeys` array in the body). |
| `POST /api/tasks/claim` | Claims specified reward IDs for a given village and credits the resources/hero XP. |
| `GET /api/tasks/village/:id` | Filters unclaimed rewards tied to a village for warehouse planning. |
| `POST /api/tasks/village/:id/update` | Resyncs quest state for the player owning the village. |

## Data Model

Prisma adds dedicated quest tables:

```prisma
model QuestDefinition {
  id          String @id @default(cuid())
  key         String @unique
  pane        QuestPane
  metric      QuestMetric
  targetValue Int @default(1)
  // reward columns, metadata, timestamps...
}

model QuestProgress {
  id          String @id @default(cuid())
  questId     String
  playerId    String
  currentValue Int @default(0)
  completedAt DateTime?
}

model QuestReward {
  id        String @id @default(cuid())
  playerId  String
  questId   String?
  source    QuestRewardSource @default(QUEST)
  wood      Int @default(0)
  stone     Int @default(0)
  iron      Int @default(0)
  gold      Int @default(0)
  food      Int @default(0)
  heroExperience Int @default(0)
  metadata  Json?
  claimedAt DateTime?
}
```

`WorldConfig` gains `questRefundPercentage` (default 0.10) so balance designers can tune refund strength per world.

## Implementation Notes

* `lib/game-services/task-service.ts` seeds quest blueprints, evaluates progress, records refunds, and exposes helper APIs.
* Building completions call `registerBuildingRefund` before clearing cost snapshots, ensuring refunds use pre-inflation values.
* Quest progress uses lightweight SQL upserts (via Prisma `executeRaw`) so we are not blocked by offline `prisma generate` runs.
* Claiming rewards performs a transaction: village resources increment, reward timestamps set, hero XP applied, and metadata preserved for audit.
* Tests (`test-task-system.js`) now verify blueprint coverage instead of static task chains.

## Practical Tips

* Encourage players to claim refunds when storage space is available—quests no longer auto-credit into potentially capped warehouses.
* Keep construction queues reasonable; refunds ignore queue inflation beyond the initial cost, but inflated queues still consume resources sooner.
* When events activate, pass the active `eventKey` to `GET /api/tasks` so the Event pane surfaces.
* Maintain docs and admin panels in tandem with schema changes—quest percentages, rewards, and pane visibility are now first-class balance levers.

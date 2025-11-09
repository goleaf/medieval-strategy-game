# Academy Research

## Overview

The academy is the long-term technology hub for every account. Players research unit unlocks, activate systemic features (paladin, support tools, flags), and open late-game buildings from this screen. Each research is a **permanent, account-wide unlock**: once a player finishes a technology in any village, every current and future village inherits it automatically. Research can only be run in villages that have an academy at the required level, and each academy handles **one project at a time**. Research runs in real time (hours for minor tech, days for nobles or global systems), consumes substantial resources up front, and cannot be canceled once started.

## Technology Tree Blueprint

### Node Catalog
- **Unit unlocks:** Scout vision, rams, catapults, nobles, paladin troops, special cavalry, etc. These mirror `config/unit-system.json` definitions where `researchReq` gates each troop (e.g., `scout` at academy 2, `catapult` at academy 5, `admin`/noble at academy 10).
- **Building & upgrade unlocks:** Advanced smithy recipes, market contracts, watchtower mechanics, or late-game blueprints that stay hidden until the relevant tech completes.
- **Game systems:** Paladin activation, flag system, support/command management, premium tooling. These technologies flip global account flags that other services read.

Each node stores metadata: display name, category, cost bundle, base duration (in seconds), academy level requirement, prerequisite research IDs, and the unlock payload (unit type, feature flag, building blueprint, etc.). Node data sits in `lib/config` alongside construction blueprints so backend and frontend share a single source of truth.

### Prerequisites & Paths
- **Hard requirements:** Nodes list both research prerequisites and building-level requirements. Example chain: `Scout Tactics` → `Ram Engineering` → `Siege Mathematics` → `Noble Charter`. Another chain might gate paladin activation behind smithy levels plus the `Order Emblems` research.
- **Dependency validation:** Backend refuses to start a research if any prerequisite is missing (either building level or prior tech). Error messaging surfaces the missing nodes so the UI can populate tooltips.
- **World presets:** `lib/config/tribal-wars-presets.ts` controls whether certain branches exist (e.g., simplified research worlds hide siege tech). The tree renderer consumes the preset to hide or mark nodes as “world disabled”.

### Visual States
| State | Color | Description |
| --- | --- | --- |
| `available` | Green badge | Requirements satisfied; button enabled. |
| `locked` | Red badge | Missing prerequisites. Tooltip lists exact building/research gaps. |
| `completed` | Gray with checkmark | Account already unlocked; row collapses but remains visible for reference. |
| `researching` | Yellow progress pill | Currently running project with percent + countdown. |

Nodes stay visible even after completion so players can see their full tech history. Because unlocks are global, other villages display the node in the `completed` state the moment it finishes elsewhere.

## Research Lifecycle

### Mechanics
1. **Selection:** Player opens an academy that meets the level requirement and chooses a node that is `available`.
2. **Validation:** Server confirms prerequisites, ensures no other research is running in that academy (`Research.isResearching` in `prisma/schema.prisma:1764`), and confirms the account has not already unlocked the tech.
3. **Payment:** Full resource cost (wood/clay/iron/crop and optional gold) is deducted immediately. Costs scale steeply to keep research meaningful; high-tier unlocks rival major building upgrades.
4. **Scheduling:** The academy stores `isResearching=true`, `completionAt`, and derived `durationSeconds`. Smithy research speed modifiers (`lib/config/construction.ts` smithy effects) reduce the duration snapshot at start time. Research tasks share the building queue infrastructure so instant-completion logic can process them (`components/game/building-queue.tsx`).
5. **Progress:** Timers advance even while the player is offline because completion timestamps are absolute. No pause or cancel actions exist (`docs/features/canceling-actions.md`).
6. **Completion:** Background workers mark the task complete once `completionAt <= now`, flip the node to `completed` for the entire account, emit toasts/notifications, and free the academy to start the next project.

### Resource & Duration Tuning
- Baseline durations follow world speed: `effectiveDuration = baseDuration / worldSpeed / smithyMultiplier`. Major unlocks (noble, paladin system, flags) default to 12–48 hours on speed 1 worlds. Minor unit unlocks range from 1–6 hours.
- Costs scale with unlock power (e.g., catapult research costing ~10k+ of each resource). Presets can tweak multipliers for “speed” or “classic” worlds.
- Because research is permanent, costs do not repeat per village. This allows us to set aggressive prices without punishing multi-village players.
- No refunds: failing to meet upkeep later does not revoke the unlock.

### Queue Behavior
- An academy never queues multiple research tasks simultaneously. Instead, the UI surfaces an “Available Research Queue” list that simply shows every `available` node sorted by recommendation. Selecting a node immediately starts it if idle; otherwise the button is disabled until the current task completes.
- Multi-academy accounts can run parallel projects by using different villages, but once a node finishes it disappears from the list everywhere.

## UI & UX Surfaces

- **Academy detail panel:** Split into `Current Research`, `Available Research`, and `Completed` tabs.
  - Current research shows title, effect summary, countdown timer, progress bar, finish timestamp, and the village name (important for multi-village accounts).
  - Available research renders the tree/graph with branch lines. Locked nodes glow red; hovering reveals required buildings/tech. Available nodes highlight in green with a `Research` CTA.
  - Completed tab lists gray rows with checkmarks and the finish date for audit.
- **Global queue widgets:** The central overview (`docs/features/ui-ux-tools.md`) and the dashboard both show `activeResearchCount` pulled from `village.buildings.research`. Each active node contributes a yellow pill with remaining time.
- **Notifications:** When a research completes, trigger toast + optional push/email. The message links back to the academy and highlights any newly unlocked unit/building (e.g., “Catapults can now be trained in workshops”).
- **Instant completion:** The premium action (see `docs/features/instant-completion.md`) counts research items the same way it counts buildings—2 Gold per active project. Villages with forbidden structures (Residence, Palace, Command Center) still cannot use instant completion, so the UI must guard accordingly.

## Data Model & APIs

- **Research state:** `Building` ↔ `Research` (one-to-one). `Research.type` enumerates broad lanes (`CONSTRUCTION`, `MILITARY_OFFENSE`, etc.), while per-node metadata lives in config. `isResearching` + `completionAt` store progress; `level` can represent tiered upgrades (e.g., Smithy tech level).
- **Account unlocks:** Persist completed techs in an account-scoped table (e.g., `PlayerResearchUnlock` keyed by `playerId + techId`). This lookup prevents duplicate research and drives the “completed” state list for every village.
- **Config + syncing:** `UnitSystemService.syncUnitTypes` writes `researchReqJson` to `unitType` rows so training validation can reference account unlocks plus building levels.
- **API surface:** 
  - `GET /api/villages/[id]/academy` returns academy level, active research (if any), available nodes with requirements, and already completed techs.
  - `POST /api/villages/[id]/academy/research` starts a node after validating prerequisites.
  - Global overviews (e.g., `/api/villages/central-overview`) include `activeResearchCount` for UI badges.
- **Background processing:** A cron/queue worker polls `Research` rows with `isResearching = true` and `completionAt <= now` to finalize tasks and broadcast completion events.

## Notifications & Offline Persistence

- Store `startedAt` + `completionAt` per research to reconstruct progress after restarts.
- Upon login, clients compute `remaining = max(0, completionAt - now)` and resume the countdown locally.
- Push/toast events include the unlock payload so players know what changed (new unit, paladin enabled, etc.).
- Completion events should also refresh dependent UI (smithy, workshop, noble building) so new options become available without manual reloads.

## Edge Cases & Rules

- **Single active task per academy:** Attempts to start another research while `isResearching` is true should return a `409` error with a friendly message.
- **No cancel / no refund:** The cancel button stays hidden/disabled, matching Travian-style rules outlined in `docs/features/canceling-actions.md`.
- **Progress survives downgrades:** Destroying or downgrading the academy mid-research pauses nothing; the timer continues even at level 0 because resources are already consumed. However, starting a new research still requires the academy to meet the target level again.
- **World/tribe toggles:** Tech nodes respect world configuration. For example, simplified worlds show siege tech in `completed` state with a note “Disabled on this world” to avoid confusion.
- **Parallel villages:** If Village A finishes “Catapult Research” while Village B was idle on that same node, Village B immediately shows it as `completed` and the pending action disappears.

## Testing Checklist

- [ ] Start research with exact required academy level (should pass) and with insufficient level (should fail with descriptive error).
- [ ] Validate resource deduction and ensure no duplicate unlock occurs when replaying the same tech.
- [ ] Confirm progress persists through server restarts (mock by editing `completionAt` and verifying worker completion).
- [ ] Verify UI state transitions: locked → available → researching (yellow) → completed (gray) across multiple villages.
- [ ] Ensure instant completion finishes research and deducts Gold alongside buildings.
- [ ] Confirm notifications fire once per completion and link to the appropriate unlock destination (unit training, building screen, etc.).

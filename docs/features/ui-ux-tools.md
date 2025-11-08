# UI/UX & Player Tools

The Travian-style interface in this project is designed around fast status checks, predictable quick actions, and a thin layer of automation that never hides underlying data. This guide documents how the major overview screens, presets, assistants, and mapping utilities are supposed to behave so the UI stays consistent with the back-end services in `app/` and `lib/`.

## Global Overviews

### Central village overview
- **UI**: `components/game/central-village-overview.tsx` renders a tabbed modal that is opened from the navbar quick action.
- **Data**: The UI fans out to `GET /api/villages/central-overview`, `/central-overview/troops`, and `/central-overview/warehouse`. The handlers aggregate resources, troop movements, smithy research, wounded stacks, and capacity/time-to-full numbers by calling `CapacityService`, `MerchantService`, and `StorageService`.
- **Purpose**: Give the player a scrollable table of every village showing production, storage pressure (`timeToFull`/`timeToEmpty`), construction counts, and troop movements. Totals at the bottom confirm empire-wide supply, troop upkeep, and merchant availability.
- **UX expectations**:
  - Capital villages stay pinned first; color badges flag starvation, full warehouses, low loyalty, and capitals.
  - Each row links back to the underlying `/village/[id]` route so the modal doubles as a village switcher.
  - Tab switch keeps scroll positions so players can bounce between resources, troops, and warehouse alerts without losing context.

### Commands & movement
- **Source of truth**: Movement structures live in `lib/rally-point/types.ts` and `lib/rally-point/engine.ts`. They already define mission types, wave groups, and status enums (`scheduled`, `en_route`, `returning`, etc.).
- **UI**: Command overviews should pull from `MovementRecord` data and bucket rows into *outgoing attacks*, *incoming attacks*, *outgoing reinforcements*, *incoming reinforcements*, and *returns*. Status chips reuse the same color system as the building queue.
- **Filtering & grouping**:
  - Default grouping is per village with subtotals; a “By target” toggle clusters rows by `targetVillageId`/coordinates for wave planning.
  - Column filters include mission type, alliance relation, and arrival window (now, <30m, <2h, >2h).
- **Action hooks**: Clicking a command row opens either `components/game/attack-planner.tsx` or `components/game/reinforcement-planner.tsx` pre-populated with the same unit mix so waves can be duplicated or cancelled from the detail drawer.

### Troop management & research
- **Aggregation**: `/api/villages/central-overview/troops` tallies every stack and smithy level. Numbers are derived from `TroopService` (costs, stats, upkeep) and `TribeService`.
- **UI treatment**:
  - The main table mirrors rally-point categories: infantry, cavalry, siege, administrators.
  - Each row shows quantity, upkeep, and smithy level. Wounded slots (future hospital system) render as progress bars sourced from the API placeholders.
  - Clicking “Train” routes to `components/game/troop-trainer.tsx` with the tribe filter already applied.
- **Research progress**: When academy research is running, show a countdown derived from the associated `Building.research` record; once finished, the row emits a toast and the smithy level updates without a full reload.

### Construction & research tracking
- **Village view**: `components/game/village-overview.tsx` already exposes building tables, NPC helper buttons, and queue metadata. The shared overview should surface the same information in miniature:
  - Show current builds, queued slots, and ROI snippets (resource cost vs. hourly delta) using the same math as `BUILDING_COSTS` and `StorageService`.
  - Completed jobs use the `CountdownTimer` component to avoid duplicate logic.
- **Research queue**: Academy, workshop, and hospital research tasks share the same status pill component, showing remaining time and base level requirements. Cancelling a research item prompts with the refund percentage defined on the backend.

## Presets, quick bar, and shortcuts

### Attack/support presets
- **Storage**: Use the Quicklink/Gold Club system for UI placement, but persist presets as their own rows (planned `AttackPreset` table). Fields: `name`, `missionType`, `targetCoords`, `unitComposition`, `catapultTargets`, `preferredArrival`.
- **Creation flow**:
  1. Players can save a preset from the rally point after entering coordinates and units.
  2. Presets appear above the manual form as buttons; clicking loads the data into `AttackPlanner`/`ReinforcementPlanner`.
  3. A premium toggle enables “wave window” scheduling that pipes into the rally-point engine’s `WaveGroupRequest`.
- **Validation**: Presets disable themselves if a required building (catapult workshop, rally point level, etc.) is missing in the current village.

### Quick bar & quicklinks
- **Schema link**: `prisma/schema.prisma` defines `QuickLinkType`, `QuickLinkOption`, `PlayerQuicklink`, and `VillageQuicklink`. These feed the quick bar on both the village list and the village details card.
- **UI rules**:
  - 4 player-level slots for global shortcuts (e.g., Barracks, Attacks overview); 5 per-village slots for context-sensitive actions.
  - Locked/beta options render with a padlock and tooltip sourced from `QuickLinkOption.requiresPremium`.
  - Drag-and-drop reordering writes new `slotNumber` values through a `PATCH /api/quicklinks` endpoint (to be implemented alongside this doc).

### Keyboard shortcuts
- **Global**:
  - `V`: cycle through villages (updates navbar dropdown).
  - `Shift+V`: open Central Overview modal.
  - `A`: focus the attack planner for the current village.
  - `R`: open reinforcements modal.
  - `Q`: toggle quick bar edit mode.
  - `/`: focus the global search/command palette (combines village search + preset finder).
- **Map-specific**:
  - `M`: open the full map.
  - `Shift+M`: toggle minimap overlay inside the village screen.
  - `F`: open map filters popover, arrow keys move between filter chips, `Enter` toggles.
- Shortcuts respect input focus (ignored when typing in forms) and surface a help sheet from the navbar question-mark icon.

### Map filters
- Filters operate on tile metadata from the map API (owner tribe, alliance relation, resource field mix, activity timestamp). Default set:
  - **Ownership**: me, alliance, NAP, enemy, barbarian.
  - **Tribes**: multi-select of `GameTribe`.
  - **Activity**: last online buckets (online now, <1h, <24h, >24h).
  - **Targets**: show villages with stored presets, ongoing attacks, or open trade routes.
- Applying filters updates both the main grid and the minimap heatmap so players can quickly triage.

## Assistants & scheduling tools

### Farm assistant
- **Purpose**: Manage repeated raid lists against barbarian or inactive villages.
- **UI spec**:
  - Table of saved targets with columns for target name, distance, last haul, last wall level, next eligible send time, and preset used.
  - Row actions: send raid now (creates movement via rally-point engine), edit preset, pause target, delete.
  - Bulk selectors let players start/stop waves for entire groups; each action surfaces the number of troops required vs. available.
- **Data flow**:
  - Pull recommended targets from scouting/intel services (future) or manual entry.
  - Scheduling logic reuses the existing movement speed helpers (`MovementService.getSlowestSpeed`) to compute arrival times and respects merchant/troop availability.

### Loot assistant (premium)
- **Premium gating**: Requires Gold Club/Farm Gold; UI checks `hasGoldClub` similar to the existing troop evasion toggle in `components/game/rally-point.tsx`.
- **Feature set**:
  - Auto-distributes spare troops to farm targets according to a priority queue (resources/hour, probability of defense).
  - Smart split: ensures each wave fills carry capacity without overcommitting crop upkeep.
  - Provides per-session statistics: raids sent, resources hauled, losses, ROI.
- **Controls**: Start/stop toggle, slider for “troops to reserve”, and advanced throttles (max concurrent waves, break between waves).

### Scheduled trade & stack tracking
- **Trade scheduler**:
  - UI lives in the market page as a “Routes & Schedules” tab.
  - Players can schedule merchant sends (`TradeRoute`) with start time, repeat interval, minimum stock requirement, and optional auto NPC exchange.
  - When a schedule fires it calls the same marketplace service used by manual sends, so ledger entries stay consistent.
- **Stack tracking tools**:
  - A manual tool drawer lets ops players track external troop stacks (e.g., alliance support). Users can enter coordinates, owner, unit mix, arrival/departure times, and notes.
  - Rows use the same `GarrisonStack` vocabulary as `lib/rally-point/combat.ts` so they can be copy/pasted into combat sims.
  - Export/import buttons dump the table to CSV for sharing; no auto-execution (explicitly manual per requirements).

## Map experience

### Minimap
- **Placement**: Docked bottom-right on the primary map page and optionally as an overlay in the village view. Keyboard arrows mirror drag gestures to match classic Tribal Wars muscle memory.
- **Data**: Renders a low-resolution heatmap of activity using aggregated counts per 5×5 tile chunk. Uses the same dataset as the main map but caches at a lower zoom. The data window must extend far enough to display at least a 5×5 continent block (500×500 fields) around the main viewport so players can see border pressure early.
- **Interactions**: Drag to pan the main map, scroll to zoom, click to drop a focus marker. Hover tooltips show the cursor coordinate plus its `Kxy` continent label (e.g., `475|724 — K55`) and call out whether the location sits inside the "core" (`K44`, `K45`, `K54`, `K55`) or the expanding rim. A toggle collapses the minimap when screen width < 1024px.
- **Political overlay (Premium)**: Gold Club/Premium accounts reveal a "Political map" switch in the minimap header. Flipping it recolors tiles by tribe ownership, applies custom highlight colors from player/tribe markers, and adds pattern badges for accessibility. Non-premium accounts still see the neutral heatmap view.
- **Marker integration**: Color assignments made in the highlight drawer (players, tribes, villages) must stay in sync with both the minimap and political overlay, reusing the same legend tokens as the main grid.
- **Accessibility**: Provide pattern fills and textual tooltips for any political coloration so colorblind users can distinguish alliances. Align iconography with the legend described below.
- **Player workflow cues**: Mirror the four-step reading guide from §3.2 of the map-vision spec. When a player hovers or taps the minimap, surface helper copy such as “Band: K55 (core)” and echo the same coordinate highlight on the main grid. Enlarged map states must retain these cues so strategists can sketch launch zones or rim growth without re-learning the UI.

### Continent grid (K-map)
- **Background**: The world is partitioned into a fixed 10×10 lattice of continents (`K00`–`K99`), each spanning exactly 100×100 tiles. These labels never shift; new start zones spawn by unlocking additional rim continents rather than resizing existing cores.
- **UI**:
  - Overlay draws labeled grid lines every 100 tiles (configurable). Each cell shows the K-number, number of owned villages, and alliance color coding. Core continents (`K44`, `K45`, `K54`, `K55`) receive a subtle outline so commanders can orient themselves instantly.
  - Clicking a continent label filters the map/list to the villages inside that K and updates the minimap highlight.
  - Tooltip copy references `generate-regions.ts` to explain boundaries when debugging and clarifies whether the selection lies in the core or rim.

### Markers & notes
- **Markers**: Players can drop markers with categories (attack, support, scout, reminder). Markers show on the map, minimap, and command overview.
- **Notes**:
  - Notes are simple markdown text blobs tied either to coordinates or entire continents. Store them in a future `MapNote` model with ACLs (personal, dual/sitter, alliance).
  - Support pinning a note to the quick bar; clicking opens a side panel with edit history.
- **Sharing**: Export selected markers/notes as JSON strings that teammates can import through a modal (supports manual sharing when alliance APIs are unavailable).

### Map toolbelt
- **Filters drawer**: Houses filters, legend, and toggle switches for layers (oases, artifacts, alliance borders).
- **Measurement tool**: Click-drag to measure distance and travel time using `MovementService.getTravelTime`.
- **Preset overlay**: Highlights coordinates referenced by attack/support presets so planners can see coverage gaps.

## QA checklist

Use this section when shipping UI changes or automation features:

1. **Smoke**: Load the navbar modal, switch tabs, and ensure `/api/villages/central-overview*` endpoints respond within acceptable time for 20+ villages.
2. **Commands**: Trigger a mock attack and reinforcement, verify they appear in the overview with the correct status transition (`scheduled → en_route → returning`).
3. **Presets**: Save, edit, delete presets and confirm that the quick bar updates slot numbers and gating (premium vs. free).
4. **Assistants**: Start the farm assistant in dry-run mode to validate troop availability calculations before enabling automatic sends.
5. **Map**: Toggle K-grid, filters, and minimap across desktop + tablet breakpoints; check that markers persist after reload by inspecting the associated API payloads.

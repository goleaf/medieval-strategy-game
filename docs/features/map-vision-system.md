# Map & Fog-of-War Vision System — Combined Design & Implementation Plan

## Design Specification

### 1. Scope & Intent
- Provide a deterministic tile map with a consistent coordinate grammar, tunable boundaries, and shared understanding for diplomacy, search, and automation (§0–1).
- Regulate information exposure through multilayer fog-of-war with passive coverage, active recon lighting, attribute aging, and alliance sharing rules (§2–4, §15).
- Ensure fairness via explicit contact detection, stealth, anti-abuse limits, and clearly documented world modifiers (night, toroidal wrap, treaties) (§5, §9, §11).

### 2. System Architecture Overview
1. **Map Service**
   - Owns canonical tile grid, coordinate conversion, bookmarks, overlays, and topology (finite vs toroidal).
   - Serves tile metadata to clients, delegating visibility checks to the Vision Aggregator.
2. **Vision Aggregator**
   - Maintains per-viewer coverage polygons, tile states, TTLs, and attribute freshness.
   - Consumes passive events (village placement, watchtower upgrades, oasis annexation) and active recon outputs.
3. **Recon & Contact Service**
   - Schedules patrol/probe missions, resolves counter-scout results, emits lighting events, and logs contacts with signatures.
4. **Data Store**
   - Persists tile definitions, player assets, alliance settings, recon logs, contact queues, and TTL trackers.
5. **Client Layers**
   - Tactical map (15×15), province view (100×100), world overlay; all consume shared API contracts.

**Processing pipeline (see §14)**: Each tick, passive changes → world modifiers → recon events → contact detection → combat intel → TTL decay. Components above correspond respectively to Map Service, Rules Engine, Recon Service, Contact Service, Combat Resolver, and Vision Aggregator.

**Diagram description**: Imagine concentric layers—central Tile DB feeding both Map Service and Vision Aggregator; Recon Service writes burst/trail events into Vision Aggregator and Contact Log; Client layers subscribe via GraphQL/REST endpoints for map tiles, overlays, bookmarks, and contacts. Alliance sharing is modeled as a union operator executed inside the Vision Aggregator before responses leave the backend.

### 3. Coordinate Grammar & World Topology (§1)
1. **Grid & Axes**: Square discrete grid. Default extent −400…400 on both axes (801×801 tiles). Adopt **+x east, +y south**; clarify in world metadata to avoid confusion. Optional: support +y north but must remain consistent per world.
2. **Notation**: Canonical tile `(x|y)` (no spaces). Ranges `(-50..50 | -50..50)` for queries. Continents/blocks (e.g., `K55`) define K×K macro tiles (default 100×100) for diplomatic planning.
3. **Tile Types & Tags**: Empty terrains, oases (with resource bonuses + owner), villages (owner, tribe, population, wall, capital flag, hero presence), specials (artifacts, World Wonders, grey-zone). Terrain cosmetics optional but reserved for future modifiers (§5.3, §7.3).
4. **Distance & Travel**: Euclidean distance in tiles; travel time `distance / speed / world_speed`. Straight-line paths; implement route sampling for contact detection. Terrain penalties optional; stored as modifiers on tile edges.
5. **Edge Behavior**: Default planar map forbids crossing boundaries; UI clamps panning. Toroidal variant wraps coordinates and distance; annotate world rules and adjust search/bookmark resolution accordingly. Provide clarifying note that recon/light trails wrap seamlessly.
6. **Map Scales**: Region (15×15) for tactical operations, Province (100×100) for ops planning/heatmaps, World full extent for strategic overlays. Each scale defines level-of-detail budgets for markers and fog fidelity.

### 4. Vision Model (§2)
1. **Passive Sources**
   - Owned villages: radius 3 (tunable).
   - Alliance villages: union coverage when sharing enabled (default on).
   - Watchtowers: additive radius bumps at levels 5/10/15/20 (+1 each tier).
   - Annexed oases & stationed reinforcements: radius 1 to owning player only.
   - Hero at home: optional +1 radius. Documented per world.
2. **Active Sources**
   - Scouting patrols, destination probes, event beacons, premium scries.
   - Emit time-bounded lighting snapshots with TTL metadata.
3. **Stacking & Precedence**: Vision radii union; tile freshness equals most recent source. Passive coverage continuous; active snapshots recorded with timestamps and TTLs.
4. **Ownership & Sharing**: Personal view = own passive + owned recon logs. Alliance view = union passive + flagged recon. Treaties (NAP/ally) may share passive only. Privacy: never expose which member illuminated a tile, only that a coverage class applies.

### 5. Fog-of-War States & Fidelity (§3)
1. **States per viewer**
   - Unknown: never seen or expired memory.
   - Known-stale: previously seen but outside current vision; shows coarse info plus last-seen timestamp.
   - Fresh: currently lit or recently reconned; shows full allowed details.
2. **Attribute fidelity**
   - Unknown: coordinates only.
   - Known-stale: tile class, last-known owner tag, population band, wall band, capital flag status; oasis bonuses; special-control info.
   - Fresh: exact owner, pop, wall, capital flag, oasis ownership, contact silhouettes, optional building levels (wall, rally point by default).
3. **Freshness thresholds**
   - Passive: stays fresh while within radius; instant transition to stale when coverage removed.
   - Active recon: fresh for recon TTL (default 10 min) → stale memory TTL (default 12–24h) → unknown when memory expires.

### 6. Memory, Aging & Degradation (§4)
1. **Per-attribute aging**
   - Static facts (oasis type, WW, artifacts) never expire.
   - Slow-changing facts (owner alliance, capital flag) degrade to stale after 24–48h but remain as stale indefinitely unless tile resets.
   - Fast-changing facts (population, wall bands) degrade after 2–4h, expire entirely after 24–48h if no refresh.
   - Ephemeral intel (movements, garrisons) visible only while fresh.
2. **Indicators**: Stale tiles desaturate and show “last seen Xh Ym” plus per-attribute freshness labels (e.g., “Owner fresh; pop stale”).
3. **Reset rules**: Passive coverage refreshes identity + slow facts. Active recon or combat scouting needed for internal buildings/resources. Reports feed Vision Aggregator to reset relevant fields.

### 7. Contact Detection & Signature Rules (§5)
1. **Movement Silhouettes**: When hostile/neutral stacks cross contact radius of fresh source, log direction vector, speed band (slow/medium/fast), stack band (tiny/small/medium/large) with configurable noise. Provide timestamp and confidence percentile.
2. **Sources & Radius**: Village base radius = vision radius; watchtower adds radius increments; hero gear can add confidence not distance.
3. **Night & Weather**: Optional world rules adjust detection probability/confidence. Default: night grants defenders +10% confidence; weather may reduce contact persistence or accuracy.
4. **Stealth Modifiers**: Per-mission signature modifiers (scout −40%, raid 0%, siege +40%). Failed signature test results in no contact despite path.
5. **Persistence**: Contacts decay after ~12 minutes unless refreshed. Cap 20 live markers per 15×15 region and merge overlapping detections.

### 8. Active Recon Integration (§6)
1. **Patrol Missions**: Travel along path, lighting tiles with trail TTL (8–10 min). Destination burst radius wider with TTL 12–15 min. Missions can be personal or alliance-shared.
2. **Destination Probes**: Single hop to target; lights tile + immediate neighbors for configured TTL; cheaper than patrol.
3. **Counter-Scouting**: Occurs at destination. If recon defeated, burst fails but trail remains until TTL expiry.
4. **Reveal Bands**: Recon reveals exact wall level, rally point band, optional building bands. Resource stock and troop counts still restricted to combat scouting.
5. **Cooldowns & Stacking**: Per-tile burst cooldown (e.g., 3 min). Multiple recon events refresh timestamps but don’t extend radius beyond largest rule unless world modifiers allow stacking.

### 9. Player Tools & Overlays (§7)
1. **Search & Jump**: Direct coordinate input with partial parsing, radius filters, continent/block queries, owner/tag/tile-type filters.
2. **Bookmarks**: Personal/squad/alliance scopes with named entries, notes, labels, privacy flags. Import/export preserve color coding.
3. **Overlays**: Alliance heatmap (contacts, raids, recon coverage), vision coverage comparison (passive vs passive+active), ops overlay (targets, staging, countdowns), diplomacy borders/K-block preferences.

### 10. UI & UX Rules (§8)
1. **Tile Hover**: Always show coordinates, state badge (Unknown/Known-stale/Fresh) with last-seen time, source class (“ally coverage”, “your patrol”), never specific account.
2. **Visual Language**: Unknown dark, known-stale desaturated/dashed, fresh full color with contact glyphs. Contacts use chevrons with fading tails colored by confidence/direction.
3. **Accessibility**: Avoid color-only signals; pair icons/shapes. Offer high-contrast fog theme and text labels for vision radii contours.

### 11. Time Windows & Optional Modes (§9)
- Night Defense Bonus does not change radii but may alter contact confidence (default +10% for defenders). Night Truce defaults to allowing recon lighting so intel play continues even if combat halts. Display a world clock pill with next window change.

### 12. Data Retention & Performance (§10)
1. **Tile State Storage**: Per viewer store `state`, `lastSeenAt`, `freshUntil`, `memoryExpiresAt`, plus per-attribute freshness flags. Alliance view built from per-member states + sharing rules.
2. **Compression**: Persist bands/hashes for stale attributes to reduce storage; exact values stored only while fresh.
3. **Aggregation**: Precompute coverage polygons from passive radii; update incrementally when assets move/upgrade. Recon trails stored as lightweight segments with TTL indexes. Contacts aggregated per region; overlapping markers coalesced.

### 13. Anti-Abuse & Fair Play (§11)
- Rate-limit tile fetches to human pace; throttle scroll queries. Allow alliances to revoke passive sharing per rank/member. Enforce recon cooldowns and daily mission caps. Never disclose which member grants coverage; UI cites “alliance coverage” generically.

### 14. Processing Order (§13)
1. Apply passive vision changes (ownership swaps, upgrades).
2. Apply night/truce/world modifiers active at timestamp.
3. Resolve recon arrivals (patrol trail + burst) and record fresh tiles & TTLs.
4. Log movement contacts for paths crossing fresh coverage/contact radii.
5. Resolve combat scouting/battles; feed intel into tile attributes if scouting succeeded.
6. Decay TTLs; transition tiles to stale/unknown as timers expire.

### 15. Test Scenarios (§14)
1. Passive union corridor continuity and breakage when one village removed.
2. Fresh → stale → unknown lifecycle for recon-lit tile (12 min fresh, 48h memory).
3. Contact accuracy with watchtower L10 (fast speed band, night adjustment).
4. Stealth mission causing partial contacts when signature rolls fail.
5. Recon vs counter-scout path retained but burst denied when defeated.
6. Alliance sharing disabled for a member; verify personal view only.
7. Toroidal world patrol from +400 to −400 wraps seamlessly.
8. Truce world allows recon lighting/contacts while combat resolution paused.

### 16. Player-Facing Clarity (§15)
- Always cite why tile state appears (e.g., “fresh via alliance coverage”, “stale from recon 2h ago”). Highlight timestamps, world clock, and countdowns. Reinforce boundary between passive intel (no stocks/troops) and scouting (combat reports). Publish world vision/night rules on settings page.

### 17. Core Data Contracts
| Contract | Fields | Notes |
| --- | --- | --- |
| `TileState` | `tileId`, `coordinate`, `tileType`, `state`, `lastSeenAt`, `freshUntil`, `memoryExpiresAt`, `attributeFreshness` map | Stored per viewer/alliance; `attributeFreshness` holds timestamps for owner, pop band, wall band, oasis status, specials. |
| `VisionSource` | `sourceId`, `ownerId`, `allianceId`, `type` (village, watchtower, oasis, reinforcement, patrol, probe, beacon), `center`, `radius`, `freshUntil`, `sharingScope` | Passive sources have `freshUntil = ∞`; active recon sets TTL. |
| `ReconMission` | `missionId`, `origin`, `path` polyline, `destination`, `type` (patrol/probe), `launchAt`, `arrivalAt`, `burstRadius`, `trailTTL`, `burstTTL`, `sharingScope`, `cooldownEndsAt` | Recon Service enforces cooldown per destination tile. |
| `ContactLogEntry` | `contactId`, `detectedAt`, `location`, `directionVector`, `speedBand`, `stackBand`, `confidence`, `sourceClass`, `expiresAt`, `signatureRoll` | Linked to viewer/alliance; trimmed when expired or cap reached. |
| `TTLTracker` | `entityType` (tile, recon, contact), `entityId`, `expiresAt`, `decayAction` | Used by Vision Aggregator to batch TTL decay processing per tick. |

### 18. Default Parameters & Tuning Table
| Parameter | Default | Tuning Notes |
| --- | --- | --- |
| Village passive radius | 3 tiles | Increase for high-speed worlds; must remain integer. |
| Oasis passive radius | 1 tile | Only for owning player. |
| Reinforcement passive radius | 1 tile | Owner-only reveal while stationed. |
| Watchtower bonuses | +1 radius at levels 5/10/15/20 | Linear stacking; configure bespoke curves if desired. |
| Hero home bonus | +1 radius | Optional per world. |
| Patrol trail TTL | 8 minutes | Range 5–10 minutes recommended. |
| Patrol burst TTL | 12 minutes | Range 10–15 minutes. |
| Recon cooldown per tile | 3 minutes | Prevents light spam. |
| Memory TTL (owner/capital) | 48 hours | Keeps diplomatic context. |
| Memory TTL (pop/wall bands) | 24 hours | Shorter to encourage scouting. |
| Contact persistence | 12 minutes | Fade sooner during heavy load. |
| Max contacts per region | 20 markers / 15×15 | Merge or drop lowest confidence beyond cap. |
| Signature modifiers | Scout −40%, Raid 0%, Siege +40% | Extend table for custom missions. |
| Night confidence adjustment | +10% defender confidence | Set to negative to simulate foggy nights. |

### 19. Terminology Glossary
- **Coverage Polygon**: Union of vision radii for a player or alliance.
- **Fresh Tile**: Tile within current coverage or active recon TTL; shows full fidelity.
- **Known-Stale**: Tile previously seen but outside coverage; shows bands + timestamps.
- **Contact**: Detected movement silhouette with direction, speed band, stack band, confidence.
- **Signature Roll**: Detection probability check combining mission modifier, watchtower level, night/weather adjustments.
- **Trail Lighting**: Temporary freshness applied along patrol path segments.
- **Burst Reveal**: Temporary freshness applied at recon destination radius.
- **TTL (Time To Live)**: Duration until freshness/contact states decay or expire.
- **Sharing Scope**: Visibility audience (personal, squad, alliance, treaty).

### 20. Future Extension Callouts
- **Night & Weather**: Current rules adjust contact confidence only; extend by coupling to terrain cosmetics for vision penalties or by adding weather-driven TTL modifiers.
- **Toroidal Worlds**: Already supported logically; future work may include UI indicators for wrap boundaries and recon path preview arrows showing wrap transitions.
- **Diplomacy Modules**: Extend sharing scopes to formal treaties with granular permissions (passive only, recon shared, contact feeds) and integrate diplomacy overlays with K-block claims.

## Implementation Roadmap

### Phase 1 — Foundations
- **Key Tasks**: Implement canonical coordinate service (parsing, validation, block math); seed tile definitions with extent metadata; expose tile fetch APIs with fog states stubbed; lay down TileState, VisionSource, ReconMission, ContactLog schemas.
- **Prerequisites**: Existing map data seeds and player asset tables; agreement on coordinate orientation (+y south). Ensure docs in `docs/development` reference new service.
- **Testing Hooks**: Add unit tests for coordinate grammar, toroidal wrap math, and distance/travel calculations (aligns with §14.7). Provide fixtures for extent edges.
- **Integration Checkpoints**: API exposes Unknown/Known-stale placeholders even before vision logic. Docs updated with glossary and defaults table to guide downstream teams.

#### Phase 1 — Implementation Snapshot (Jan 2025)
- Prisma models (`MapTile`, `TileVisionState`, `VisionSource`, `ReconMission`, `ContactLogEntry`, `VisionTTLTracker`) and migration `20251111130000_map_vision_foundations` establish persistence for map tiles, recon feeds, contacts, and TTL tracking.
- `lib/map-vision/coordinate-service.ts` + `lib/__tests__/map-coordinate-service.test.ts` cover canonical coordinate grammar, block math, and toroidal wrap helpers.
- `lib/map-vision/vision-aggregator.ts` currently unions village data into stubbed fog states (own villages → `FRESH`, others → `KNOWN_STALE`) while the passive/active source plumbing is wired for future phases.
- `/api/map/vision` exposes the region/province/world tile fetch contract ahead of the UI, returning extent metadata, block IDs, and tile payloads compliant with the `TileState` spec.

### Phase 2 — Passive Vision & Memory
- **Key Tasks**: Implement passive radius computation (villages, watchtowers, oases, reinforcements, hero bonus). Build Vision Aggregator to union coverage, persist TileState, and manage attribute aging. Add alliance sharing toggles and treaty hooks.
- **Prerequisites**: Phase 1 schemas + event feeds for village ownership/upgrade changes. Need TTL scheduler infrastructure.
- **Testing Hooks**: Scenario §14.1 (passive union corridor) and §14.6 (sharing off) as automated smoke tests; aging tests for §14.2 fresh→stale→unknown timeline.
- **Integration Checkpoints**: Tactical map consumes passive coverage; world clock + state badges appear. Alliance management UI exposes sharing toggles with privacy enforcement.

### Phase 3 — Active Recon & Contacts
- **Key Tasks**: Build Recon Service (mission planner, path sampling, cooldown enforcement), trail/burst lighting, counter-scout resolution, signature rolls, contact logging, stealth modifiers, night/weather adjustments. Implement contact caps/merging.
- **Prerequisites**: Passive coverage live; TTL scheduler tuned for sub-15-minute expirations; combat scouting hooks to supply counter-scout outcomes.
- **Testing Hooks**: Automate §14.3 (contact accuracy), §14.4 (stealth mission partial detection), §14.5 (patrol defeated but trail persists), §14.8 (truce world with recon allowed). Add load tests for contact cap enforcement.
- **Integration Checkpoints**: Recon missions visible in client overlay; contact glyphs render with confidence cues; failure states (cooldown breach, counter-scout defeat) produce user-facing notifications.

### Phase 4 — UI/UX & Player Tools
- **Key Tasks**: Implement search jump bar, bookmarks with scopes, overlays (vision coverage comparison, alliance heatmap, ops planning), tile hover panels with per-attribute freshness, accessibility modes (high contrast, contours labels).
- **Prerequisites**: Vision APIs stable; contact/recon feeds accessible; bookmark storage defined (personal/alliance). Design assets for icons/shapes.
- **Testing Hooks**: Manual + automated UI tests for §7 tools, verifying privacy scopes and import/export; ensure §15 clarity guidelines satisfied via snapshot/UI tests.
- **Integration Checkpoints**: Ops overlay tied into mission planner; diplomacy layer reads treaty data; world clock pill surfaces next night/truce window.

### Phase 5 — Tooling, QA, and Hardening
- **Key Tasks**: Finalize anti-abuse throttles, logging, and monitoring dashboards (coverage rebuild latency, recon queue depth, contact cap usage). Document admin operations (reset recon cooldowns, purge stale tiles). Backfill docs in `docs/features` + `docs/development`.
- **Prerequisites**: All functional phases deployed to staging; telemetry endpoints available.
- **Testing Hooks**: Full §14 regression suite run nightly; add soak tests for toroidal paths and alliance toggles; script to simulate recon spam ensuring cooldown enforcement (§11). Validate TTL decay order matches §14 processing pipeline.
- **Integration Checkpoints**: Publish admin & developer guides, update `.env.example` if new keys introduced (e.g., contact retention window). Prepare rollout checklist covering seeding, migration, and monitoring alerts. Future extension backlog (night/weather expansion, diplomacy permissions) captured for roadmap grooming.

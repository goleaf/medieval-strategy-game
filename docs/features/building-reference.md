# Core Building Reference

This living reference describes how every core building behaves inside the Tribal Wars-inspired sandbox. It is **implementation agnostic**—focus on systems, gates, toggles, and edge cases so design, engineering, and live-ops share the same contract before any UI or service work begins.

## Quick Lookup Matrix

| Building | Primary Loops | Speed Hooks | Toggle / Edge Flags |
| --- | --- | --- | --- |
| **Headquarters** | Unlocks and upgrades all other buildings; unlocks demolition at higher levels. | Global build-time multiplier per village. | Demolition requires world flag (`allowDemolition`) and minimum HQ level (usually ≥10).
| **Barracks** | Trains infantry lines (Spearmen, Swordsmen, Axemen, Archers). | Recruitment speed scales per level. | Archers only when `world.archersEnabled = true`; often prerequisite for Wall.
| **Stable** | Trains cavalry (Scout, Light Cavalry, Heavy Cavalry, Mounted Archer). | Recruitment speed scales per level. | Unit availability depends on Smithy research + `world.archersEnabled` for Mounted Archers.
| **Workshop** | Builds siege (Rams, Catapults). | Recruitment speed scales per level. | Siege requires Smithy research and `world.siegeEnabled`. Catapults target buildings post-combat.
| **Smithy** | Research unlocks troops / upgrades stats. | Research speed scales per level. | Supports Simple / 3-level / 10-level research models; usually prerequisite for Academy.
| **Market** | Generates merchants for transports and public offers. | Merchant travel speed derived from world speed; more merchants per level. | Academy often gated behind Market level; trades respect Warehouse caps.
| **Academy** | Produces Noblemen for loyalty-reduction attacks. | Noble training speed tied to HQ multiplier + Academy queue. | Coin vs Package economy. Requires Smithy + Market levels per world config.
| **Rally Point** | Command center for all troop missions. | Travel time uses slowest unit * world speed. | Cancel window, precision windows, and targeting controlled by world toggles.
| **Statue** | Recruits Paladins and manages skill trees. | Paladin training speed uses HQ multiplier. | Paladin slots scale with account village count; training lost if village conquered mid-queue.
| **Wall** | Multiplies defensive power of stationed troops. | None (static). | Rams reduce effective level during battle; Catapults drop permanent levels if they survive.
| **Watchtower** | Tags incomings with size/noble info within radius. | None (static). | Only available when `world.watchtowerEnabled`; consumes farm population per level.
| **Church / First Church** | Applies faith modifier to friendly troops within radius. | None (static). | Only one Church per village; First Church unique + non-upgradable; coverage radius is world-tunable.
| **Resource Fields** | Timber Camp / Clay Pit / Iron Mine generate resources. | Production scales with level, world speed, production multipliers. | Capitals or special worlds may have bonus multipliers; night bonus does not affect passive production.
| **Farm** | Provides population cap shared by troops and buildings. | None (static). | Damage below current usage blocks new queues but never kills existing entities.
| **Warehouse** | Caps storable resources per type. | None (static). | Overflow lost on `world.allowOverflow = false`; trade arrivals still respect caps.
| **Hiding Place** | Protects unlootable resource stash. | None (static). | Per-resource stash; worlds can raise/lower cap or disable entirely.

## Building Breakdown

### Headquarters (HQ)
- **Core loop.** Each HQ level multiplies every construction timer in the village, compressing both economic development and military infrastructure build-outs.
- **Demolition gate.** Worlds that allow downgrading set `allowDemolition = true` and a minimum HQ level (commonly ≥10). Demolition refunds farm population immediately but only returns a fraction of building resources, per balancing document `config/demolition.json`.
- **Queue scaling.** HQ bonuses apply to **all** build jobs regardless of origin (player queue, instant finish, quest rewards). Buffs stack multiplicatively with premium speed boosts where enabled.
- **Late-game role.** Enables specialty pivots (e.g., dismantle Workshop in defensive hubs or remove Watchtower when front lines shift) and shortens recovery after sieges.

### Barracks
- **Recruitment focus.** Handles all infantry templates: Spearmen/Swordsmen for defense, Axemen for offense, and Archers when archery worlds are enabled.
- **Dependencies.** Typically required before the Wall (worlds can override). Smithy research gates higher-tier infantry (e.g., Sword Level 2 in 3-level research worlds).
- **Production notes.** Recruitment time = base time ÷ Barracks speed modifier ÷ world speed ÷ active buffs. Premium account and tribe-specific bonuses (e.g., Romans build-queue) stack after the building multiplier.
- **Edge cases.** Queue pauses if Farm capacity is exhausted mid-queue; progress resumes automatically once population is freed.

### Stable
- **Recruitment focus.** Produces Scouts (intel missions), Light Cavalry (fast offense), Heavy Cavalry (hybrid defense), and Mounted Archers (archer-enabled worlds only).
- **Smithy hooks.** Cavalry require relevant research unlocks; Scouts also reference world scout rule toggles (e.g., `scoutCarryLoot`, `scoutBattleResolution`).
- **Interactions.** Heavy Stable investment competes with Workshop for farm space; planners often downgrade Stable in pure-infantry villages using HQ demolition late game.

### Workshop
- **Unit catalogue.** Rams reduce defender Wall effectiveness during combat; surviving Catapults fire post-combat at selected buildings (fallback random targeting if selection invalid).
- **Target validation.** Rally Point enforces catapult targeting rules (e.g., capitals protected below level 10, world-wonder floors) using Workshop tech level checks.
- **Speed hooks.** Recruitment speed benefits from Workshop level, HQ multiplier, world speed, premium buffs, and Paladin skills like *Master Engineer* when assigned to village.
- **Edge cases.** Workshop queue blocked on worlds with `siegeDisabled` or if Smithy research lacks required tier.

### Smithy (Research)
- **Models.** Supports three research modes:
  - **Simple:** binary unlock toggled per unit.
  - **Three-level:** each unit advances through three discrete stat packages; levels tracked per village.
  - **Ten-level:** legacy granular progression with incremental stat bumps; requires cumulative resource/time investment.
- **Research timers.** Reduced by Smithy level, HQ speed, and research-boost artifacts. Research tasks ignore Farm capacity but consume resources immediately.
- **Downstream gating.** Barracks/Stable/Workshop validate unit availability before queueing; missing research rejects the command with actionable error messaging.
- **Academy tie-in.** Many worlds require Smithy ≥20 before the Academy blueprint appears.

### Market
- **Merchant economy.** Each level increases available merchants; capacity per merchant is static but scales by world speed. Travel time uses merchant speed tied to Stable/Smithy settings.
- **Transaction modes.** Supports direct transports, alliance deposits, and public offers (the offer ledger enforces `minTradeRatio` world toggle to block predatory trades).
- **Warehouse interaction.** Incoming shipments respect target Warehouse cap; any overflow is discarded unless `allowOverflow` is set. When overflow is enabled, resources queue in transit until cap space exists.
- **Prestige integration.** Premium trading boosts (e.g., instant merchants) stack multiplicatively with Market level and world speed. These toggles are tracked in `world.premiumFeatures.marketBoosts`.

### Academy
- **Noble production.** Generates Noblemen after coin minting or package creation.
  - **Coin system.** Resources → coins (`/academy/mint`); coins stored at account scope; Academy consumes coins + resources per noble training.
  - **Package system.** Academy levels (1–3) produce noble packages; each package consumed when training a Nobleman.
- **Prerequisites.** Typically requires HQ ≥20, Smithy ≥20, Market ≥10 (tunable). World config may demand a Palace/Residence equivalent instead.
- **Loyalty mechanics.** Noble attack reduces target loyalty by 20–35 (world tunable). Loyalty regenerates every hour with base rate scaled by world speed. Village flips at ≤0 loyalty.
- **Operational use.** Identify launch villages within Church or Watchtower coverage to minimize travel penalties and maximize intel.

### Rally Point
- **Mission orchestration.** Issues Attack, Raid, Support, Scout, Siege, and Wave commands.
- **Timing math.** Travel time = distance * slowest unit travel constant / world unit speed. Precision offsets for wave groups obey `world.wavePrecisionMs` and Rally Point level gates.
- **Control windows.** Cancel grace period set by `world.cancelWindowMs` and level-specific overrides; recalls allowed for support missions while en route or stationed.
- **Integration.** Works with Watchtower tags, Siege calculations, beginner protection, and troop evasion toggles. Demolition queues or Market trades do **not** flow through the Rally Point.

### Statue (Paladin)
- **Slot management.** Account gains Paladin slots at fixed village counts (e.g., 1 slot at start, +1 every 5 villages). Slot availability tracked server-side to prevent duplicates.
- **Skill tree.** Paladin earns experience via combat, support time-on-task, or passive supervision depending on `world.paladinXpModel`. Skill points unlock recruitment boosts, movement speed bonuses, or defensive buffs.
- **Relocation.** Paladins can be reassigned via Rally Point; travel speed equals Light Cavalry pace by default. If training completes while the village is conquered, the Paladin is lost permanently.

### Wall
- **Defense multiplier.** Wall level multiplies stationed troop strength using exponential curve `defenseMultiplier = base^(level)` (curve defined in `config/wall.json`).
- **Siege response.** Rams reduce effective Wall level during battle following a logarithmic model with diminishing returns. Catapults that survive reduce actual Wall level post-combat (minimum floor depends on target type and world rules).
- **Repair cadence.** Repairs follow normal build queue timing; HQ multiplier accelerates rebuilds. Many worlds cap auto-repair after sieges to prevent immediate restoration.

### Watchtower (World Toggle)
- **Coverage radius.** Each level increases detection radius; overlapping towers provide additive coverage. Worlds can cap total Watchtower count per account to limit intel creep.
- **Intel tags.** When an incoming command crosses the radius, the UI labels it with size band (Very Small → Very Large) and Noble indicator. No tag appears if the path avoids coverage entirely.
- **Population trade.** Consumes significant Farm population; planners often only keep Watchtowers in frontline launch villages or cluster them for intel corridors.

### Church / First Church (World Toggle)
- **Faith mechanic.** Troops fighting outside faith radius suffer a penalty (default 50% attack/defense). Faith radius is visualized on the strategic map.
- **Building types.**
  - **First Church:** Starting village, fixed radius, cannot be rebuilt once lost unless world override permits.
  - **Church (lvl 1–3):** Upgradable; one per village; each level increases radius. Construction blocked if another Church already exists in village.
- **Strategic cadence.** Faith encourages leapfrog expansion—establish new Churches to extend coverage. Offensive launches outside coverage should budget extra waves to compensate for penalty.

### Resource Fields (Timber Camp, Clay Pit, Iron Mine)
- **Production formula.** Hourly output = base production × level multiplier × world speed × production multipliers × buffs (flag, hero, Paladin skill).
- **Balancing.** Offense-heavy accounts lean on wood/iron; defensive builds lean on clay/iron. Account managers adjust via Market shipments or specialized production villages.
- **Edge toggles.** Capitals or event worlds may grant +25% production bonus; these stack multiplicatively with level scaling.

### Farm
- **Population governance.** Provides shared capacity for buildings and units. Cannot queue actions that would exceed available population.
- **Damage handling.** If sieges reduce Farm below used population, existing troops/buildings persist but all new queues are blocked until Farm is restored.
- **Interaction.** Paladin skills, account flags, or seasonal buffs may increase effective Farm cap but never reduce building consumption.

### Warehouse
- **Storage caps.** Each level sets max wood/clay/iron storage. Production halts for a resource once it hits cap.
- **Logistics.** Transported resources over cap are discarded unless `allowOverflow` is enabled; with overflow, shipments wait in transit until space exists.
- **Integration.** Construction and recruitment systems pull resources atomically; partial payments are disallowed. Premium resource packages check Warehouse capacity before redemption.

### Hiding Place
- **Protected stash.** Shields a per-resource minimum from plundering. Attackers see zero loot when the visible stock ≤ stash threshold.
- **Scaling & toggles.** Stash size scales per level; some hardcore worlds disable the building or set `world.hideoutCapMultiplier` lower to keep farming profitable.
- **Use cases.** Essential in early game or on high-speed worlds with aggressive farming meta. Later, tribes may rely on coordinated defense instead of stash levels.

## Cross-System Patterns to Track

- **HQ ↔ All queues.** HQ speed buffs stack with premium boosts and tribe perks, so simulation tools should apply multipliers in consistent order.
- **Smithy ↔ Production buildings.** Research results gate unit availability; recruitment attempts must fail fast with actionable errors when research missing.
- **Academy ↔ Rally Point.** Noble trains rely on Rally Point precision windows. Live-ops often sync coin minting events with loyalty campaigns to avoid idle nobles.
- **Wall ↔ Workshop.** Ram math and Wall rebuilding cadence drive siege pacing. Balance updates must adjust both curves simultaneously.
- **Watchtower ↔ Rally Point.** Tagged incomings empower defenders to time snipes/backtimes; without tags, defenders rely on manual intel.
- **Church ↔ Expansion.** Faith coverage defines effective front lines. When adding new regions, ensure Church placement scripts consider radius overlaps.
- **Resource Fields ↔ Market ↔ Warehouse.** Production, storage, and transport remain in equilibrium; any tuning change in one requires verifying the others to prevent deadlocks.
- **Farm ↔ Non-combat buildings.** High-population structures (Watchtower, Church, Workshop) require careful planning so villages still field full defensive stacks.

## Implementation Checklist

When implementing or tuning any building:

1. **Confirm prerequisites.** Validate HQ/Smithy/Market level requirements before unlocking new structures.
2. **Respect world toggles.** Features like demolition, archers, watchtowers, and faith may be disabled per world; guard logic accordingly.
3. **Enforce population checks.** Recruitment/build queues must halt gracefully when Farm limits hit and resume automatically when capacity frees up.
4. **Surface clear feedback.** Rally Point, construction UI, and admin tooling should surface the exact reason a building action fails (missing research, storage cap, toggle disabled).
5. **Sync documentation.** Any change to `config/*.json` or world toggles should update this reference plus dependent docs (`docs/features/construction-system.md`, `docs/features/rally-point.md`, etc.).
6. **Wire blueprint data.** Expand `lib/config/construction.ts` and the mapping in `lib/game-services/construction-helpers.ts` whenever you add or rename buildings, and extend `tests/building-blueprints.test.ts` so core behavior remains regression-tested.


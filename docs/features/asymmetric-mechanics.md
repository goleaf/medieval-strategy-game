# Gaul Trapping, Roman Double Build Queue, Teuton Raid Focus

> Normative balance design for three asymmetric mechanics. Values below are tunable parameters that live in balance data, not hard-coded constants.

## 1. Shared Terms and Scope

- **Hostile mission**: any incoming attack, raid, or siege.
- **Resource fields**: wood, clay, iron, crop tiles.
- **Inner buildings**: all non-field buildings inside the village center.
- **Cranny protection**: portion of current stock that cannot be looted.
- **Expansion slot**: capacity of a village to create settlers or administrators (referenced in the Romans section for queue context).
- Unless stated otherwise, rules apply **per village**.

## 2. Gauls — Trapping System

### 2.1 Purpose and Fantasy

- Deliver defensive denial that punishes routine farming unless attackers scout, clear escorts, or coordinate siege support.
- Reward tempo management: attackers must schedule rescue/demolition; defenders must manage capacity and release timing.

### 2.2 Trapper Building

- **Availability**: Gauls only.
- **Max level**: 20 (tunable).
- **Capacity per level**: default 10 traps/level (200 at level 20); allow custom tables for non-linear scaling.
- **Durability**: targetable via catapults; each level lost instantly lowers capacity.
- **Prerequisites**: low Main Building requirement (3–5) to unlock early.

### 2.3 Trap Definition

- Each trap is a **slot** holding **one enemy unit**.
- Traps are occupancy-based. Once a prisoner leaves, the slot becomes available again; traps are not consumed.

### 2.4 Trigger Timing and Order

1. On hostile mission arrival, before combat, the Trapper attempts captures.
2. Captured units are removed from the battle and contribute no stats, siege, scouting, morale, or loyalty effects.
3. Remaining attackers resolve combat normally.

### 2.5 Eligible vs. Ineligible Units

- **Eligible**: all infantry and cavalry by default.
- **Optional toggles** (per world, clearly documented):
  - Siege engines: off by default.
  - Hero: on by default; can be trapped and must be freed or released.
  - Administrators/settlers: off by default.
- Mixed waves: if eligible units fill traps, ineligible units still fight.

### 2.6 Capture Priority (Deterministic)

Apply tiers until capacity is exhausted:

1. Fast raiders (light cavalry, TTs, etc.).
2. General infantry.
3. Defensive cavalry.
4. Heavy cavalry.
5. Optional siege (if enabled).
6. Optional hero; always last to avoid single-unit grief.

Within a tier, capture from the largest stacks first, breaking ties by internal unit order. Captures equal the lesser of free trap slots or eligible unit count.

### 2.7 Prisoner Storage and Upkeep

- Track prisoners per defending village, attacking account, and unit type.
- **Default upkeep**: prisoners keep consuming crop at their origin village (attacker pays).
- World rule variants: no upkeep or upkeep at defender (discouraged by default).

### 2.8 Release, Rescue, Escape

- **Defender release**:
  - Release all or filter by attacking account.
  - Release is immediate; units return at native speed with normal travel time.
  - Optional short cooldown (e.g., 1 minute) to stop release spam.
- **Attacker rescue**:
  - Destroying the Trapper to level 0 frees all prisoners instantly. If capacity falls below current prisoners, oldest prisoners escape first.
  - Conquering the village frees prisoners upon ownership transfer.
- **No passive expiry**: prisoners remain until released, Trapper destroyed, or village conquered.

### 2.9 Siege Interaction

- Trapping resolves before combat. If all siege engines are trapped on a world where siege is eligible, no siege damage occurs in that wave.
- If siege is ineligible, trapping still weakens escorts, potentially dooming rams/catapults before they act.

### 2.10 Reports and UI

- **Attacker report**: “X units were captured in traps before combat: [unit → count].”
- **Defender report**: same data, plus occupied vs. total capacity.
- **Village screen**: shows total capacity, occupied slots, breakdown by attacker/unit type, buttons for “Release all” and “Release by owner”, free slots, and ETA if a release is queued.
- **World tooltip**: optionally surface current Trapper level and occupancy (hide exact numbers from non-owners if fog-of-war is desired).

### 2.11 Anti-Abuse Rules

- Auto-release or block trapping of friendly/self units.
- Optional spam protection for single-unit filler attacks.
- Never trap zero-count units; never exceed capacity; never trap more than arrived.

### 2.12 Tunable Defaults

- Capacity per level: 10.
- Max level: 20.
- Hero trapping: enabled.
- Siege trapping: disabled.
- Administrator/settler trapping: disabled.
- Crop upkeep: paid by attacker.
- Release cooldown: none (add only if needed).

### 2.13 Test Scenarios

- 150 light cavalry raid into 80 free traps ⇒ 80 captured, 70 fight.
- Mixed wave (120 infantry + 15 rams + 1 hero) into 50 traps with siege trapping off ⇒ 50 infantry captured; rams + hero fight; failing siege means no ram/cata damage.
- Catapult wave drops Trapper from 120 capacity to 40 while holding 60 prisoners ⇒ 20 oldest escape instantly.
- Defender releases prisoners mid-fight ⇒ released units travel home and never join concurrent combat.

## 3. Romans — Double Build Queue (Field + Inner)

### 3.1 Purpose and Feel

- Romans specialize in infrastructure tempo by running one resource field and one inner building upgrade simultaneously per village without altering build times.

### 3.2 Category Model

- Two categories:
  1. **Resource field**: wood/clay/iron/crop tiles.
  2. **Inner building**: everything else (Main Building, Warehouse, Barracks, etc.).
- Romans: one active lane per category. Other tribes: one active lane total.

### 3.3 Admission Rules

- A task may start when:
  - Its category has no active task in that village.
  - All prerequisites (levels, resources, expansion slot) are met.
  - Payment is taken at queue time to avoid ghost starts.
- Same-category tasks queue FIFO and auto-start when the lane frees up.

### 3.4 Execution and Timing

- Build times use standard formulas (Main Building modifier, server speed).
- Both lanes progress in parallel and finish independently.
- Waiting tasks show advisory finish estimates recalculated on actual start.

### 3.5 Cancellation and Refunds

- Waiting tasks: full or policy-based partial refund.
- Active tasks: either non-cancelable or refundable proportional to remaining time; choose one policy per world.
- Canceling one lane never affects the other.

### 3.6 Interactions and Exclusions

- Premium “extra queue” products may increase waiting slots but never add a third Roman lane.
- Training queues (Barracks/Stable/Workshop) remain unaffected.
- Server-wide build-time modifiers apply equally to both Roman lanes.

### 3.7 UI / UX

- Display two progress bars labeled “Fields” and “Buildings”.
- Block a second field upgrade while the field lane is busy; surface explicit “Field queue busy” messaging.
- Group queued tasks by category with predicted start timestamps.

### 3.8 Edge Cases

- If a building under upgrade is destroyed (e.g., catapult), the upgrade fails and the lane frees; refund policy follows the active-task rule.
- Tribe changes on special worlds:
  - Recommended: immediately collapse to one lane; allow currently running tasks to finish but forbid new dual-lane starts.
  - Harsher variant: forcibly pause one lane.
- Hitting storage caps mid-build does not halt completion; caps impact production only.

### 3.9 Tunable Defaults

- Roman active lanes: 2 (field + inner).
- Other tribes: 1.
- Active cancellation refund: disabled by default; optional linear remainder.

### 3.10 Test Scenarios

- Start a field upgrade and an inner building upgrade: both run concurrently. Starting a second field upgrade queues it.
- Cancel the inner building upgrade: field upgrade continues unaffected.
- Non-Roman attempts two builds: second queues, does not run.

## 4. Teutons — Raid Focus

### 4.1 Purpose and Identity

- Teutons thrive on aggressive raiding, converting small troop investments into steady loot streams. They favor offense-driven economies over turtling.

### 4.2 Signature Levers

1. **Cranny penetration on offense**
   - When Teutons attack, only two-thirds of defender cranny protection applies (≈33% more loot versus others).
   - Stacks multiplicatively with defender tribe bonuses (e.g., Gaul: doubled cranny → double, then reduce by Teuton factor).
2. **Merchant profile**
   - Highest capacity, lowest speed. Ideal for bulk hauling and Wonder support but sluggish for reactive logistics.
3. **Early raider cost structure**
   - Baseline cheap infantry (Clubman archetype): low cost/time, high carry, poor defense, middling attack.
   - Designed for profitable raids on poorly defended targets, weak versus real defenses.
4. **Earth Wall**
   - Provides lower per-level defense but improved ram resistance, nudging Teutons toward troop stacking instead of wall reliance.

### 4.3 Raid Mission Synergy

- Global raid lethality is reduced, rewarding hit-and-run play.
- Teutons capitalize via rapid replacement of cheap raiders and elevated loot from cranny penetration.
- Optional toggle: lower minimum population for Teuton “fake attack” validity to ease timed deception (controversial).

### 4.4 Anti-Push / Fair Play

- Enforce push protection:
  - Flag persistent one-sided transfers from larger to smaller accounts via repeated undefended raids unless wartime context justifies.
  - Monitor loot ratios and repeated target patterns; alert or throttle on threshold breaches.
- Beginner protection remains sacrosanct; Teuton bonuses never bypass new-player shields.

### 4.5 Scouting and Counterplay

- Encourage opponents to counter with cranny upgrades, Gaul Trappers, scouting, night bonuses, and intercepting cavalry.
- Encourage Teutons to scout first, avoid traps, and stagger clearing/raiding/hauling waves.

### 4.6 Early-Game ROI Guidance

- Cheap Teuton raider should repay its training cost within 2–4 successful raids at normal speed.
- If actual ROI exceeds 5 raids due to defenses, adjust carry upward, training time/cost downward, or cranny penetration slightly upward (careful—global impact).

### 4.7 UI / UX Cues

- Raid planner highlights projected loot after cranny with Teuton penetration applied.
- Reports state explicitly: “Teuton raid penetrated defender’s cranny; protected stock applied at reduced effectiveness.”

### 4.8 Tunable Defaults

- Cranny penetration factor: defender protection × 2/3 when Teutons attack.
- Merchant capacity: highest; speed: lowest.
- Cheap raider: highest carry among basic infantry; lowest defense.

### 4.9 Test Scenarios

- Identical raid stacks vs. identical targets: Teuton report shows more loot than Roman/Gaul due to penetration.
- Teuton raid vs. Gaul with doubled cranny: net protection = Gaul bonus × Teuton penetration, leaving some guarded stock.
- Merchant test: Teuton convoy arrives last for equal distances but hauls the most.

## 5. Cross-Mechanic Interactions and Ordering

- **Trapper vs. Raid**: traps trigger before raid casualties and loot; trapped units never affect combat or haul.
- **Roman dual queue vs. siege**: parallel building unlocks defenses sooner but cannot restore resources lost mid-siege.
- **Teuton penetration vs. Gaul cranny bonus**: apply defender bonus first, then multiply by Teuton factor.
- **Hero**:
  - Trapped heroes (if enabled) contribute no aura during the battle.
  - Hero economic bonuses persist unless the hero dies or is reassigned.

## 6. Operational Safeguards and Analytics

1. Apply reinforcements arriving that tick.
2. Apply Trapper captures.
3. Resolve combat (attack/raid/siege).
4. Apply siege (rams/catapults).
5. Apply loyalty (administrators).
6. Apply loot (with cranny bonuses and Teuton penetration).

- Log per battle: trapped counts per unit, trap capacity remaining, cranny baseline, defender bonus, attacker penetration, final loot.
- Log per Roman build: category (field or building), queued/started/finished timestamps, cancellation policy data.

## 7. Balancing Checklist

- Trapper capacity should deter careless raiding without making small alliances untouchable. Early sweet spot: 100–200 capacity during week one.
- Roman dual lanes should yield roughly 10–20% faster **effective** build cadence early due to reduced idle time, not double throughput.
- Teuton cranny penetration must shift target selection but still leave hardened Gaul villages meaningfully protected.

## 8. Player-Facing Clarity Principles

- Surface rule names in reports:
  - “Trapper captured 73 units before combat.”
  - “Romans: second build lane active (fields + buildings).”
  - “Teuton raid: defender’s protected stock reduced for loot calculation.”
- Avoid hidden modifiers. If a world uses non-default toggles (e.g., siege trapping), expose them in world settings and tooltips.

### Quick Defaults Snapshot

- **Trapper**: 10 traps/level up to 20 levels; fires before combat; hero trapped by default; siege off by default; attacker pays upkeep; release via UI, Trapper destruction, or conquest.
- **Romans**: one field upgrade and one inner upgrade run concurrently per village; additional tasks wait; no effect on troop training lanes.
- **Teutons**: cranny penetration (~33% more loot); slow but high-capacity merchants; cheapest high-carry raider; earth wall trades defense for ram resistance.

# Tribal Wars Endgame Systems

This reference captures how Tribal Wars worlds surface and adjudicate their late-game win conditions. Use it when configuring new servers or auditing a live world’s settings so the admin UI, backend rules, and player messaging stay synchronized.

## Shared Player-Facing Mechanics

- **Rules surfaced in Rankings:** Each world exposes its exact victory conditions inside the in-game Rankings panel. That view lists the current threshold, any simultaneous objectives, the leading tribe, and whether a hold timer is already counting down.
- **Global warnings:** When a tribe comes within the configured warning distance of the win threshold, the world emits a broadcast so every player knows the endgame is live. Treat the trigger distance as a per-world value, not a constant.
- **Counting baseline:** Worlds define which villages participate in the percentage checks (e.g., only player villages vs. player + barbarian). Always read the active world configuration before hard-coding assumptions.
- **Race then sustain:** Meeting the numerical threshold starts the victory race. If the world requires a hold period, the timer only completes if the tribe stays at/above the condition for the full duration; dropping below pauses or resets the countdown per the world’s settings.

## Classic Domination

Classic domination worlds end when a tribe controls the required share of villages and optionally sustains that control for a number of days.

### Configuration Levers

- **Dominance threshold:** Percentage of counted villages the tribe must own.
- **Hold duration:** Number of continuous days at or above the threshold. Some worlds skip this entirely.
- **Counting baseline:** Whether the tally includes barbarian villages, capitals, or event villages.
- **Earliest start:** Optional grace period that suppresses endgame tracking until the world matures.
- **Warning distance:** How close a tribe must get before the world issues the broadcast alert.

### Operational Considerations

- **Membership churn:** Tribe joins/kicks immediately change the count because village ownership follows the player. The Rankings tracker reflects the new totals without manual recalculation.
- **Front-line shape:** Domination rewards broad, defensible territory. Tribes lean on safe cores, contiguous claims, and reinforced academies instead of isolated spikes.
- **Public pressure:** The warning announcement is intentional game design. It encourages counter-coalitions and prevents silent, last-minute flips from deciding a world.

### Player Experience

- Rankings show the leading tribe’s percentage and, when relevant, a “time remaining” indicator for the hold requirement.
- World messages mirror the same data so casual players know whether a win is imminent.
- If a tribe falls below the threshold before the timer expires, the UI shows that progress paused or restarted according to the world’s configured behavior.

## Rune Wars (Domination + Objective Control)

Rune Wars layers key-objective control on top of domination. To win, a tribe must meet the domination target **and** capture the required number of rune villages for the specified duration.

### Configuration Levers

- **Required rune villages:** Total rune objectives a tribe must hold. Some worlds track per region; others only care about the aggregate total.
- **Hold duration:** Continuous control time before each rune is considered secure.
- **Spawn/distribution rules:** Defines where rune villages appear and at what stage of the world lifecycle.
- **Domination interaction:** Whether the victory timer waits until both domination and rune requirements are simultaneously satisfied.

### Rune Village Properties

- **Spawn with defenders:** Rune villages enter the world garrisoned by barbarian troops. Capturing one requires a real siege, not a free capture.
- **Post-capture penalty:** Newly captured rune villages apply a heavy defensive debuff to the new owner, forcing constant stacking and micromanagement.
- **Ongoing conflict:** Because of the penalty, tribes must maintain rapid support rotations, layered reinforcements, and reliable logistics to keep rune holdings alive.

### Counterplay and Timer Behavior

- Rivals can break the win path by lowering the leader below the domination percentage or by capturing even one required rune village.
- Worlds can choose whether losing a rune resets the full hold timer or merely pauses it; document the choice per world when configuring servers.

### Player Experience

- Rankings display both domination progress and rune control counts so everyone can see whether the dual requirement is currently satisfied.
- Once both conditions are met, the hold timer becomes the primary UI focus, reinforcing how long the tribe must defend every rune simultaneously.

## Relics (Strategic Modifier Layer)

Relics introduce an area-of-effect economy and combat layer that coexists with whichever endgame a world uses. They don’t define the win condition but heavily influence how tribes maintain it.

### Acquisition & Treasury

- Players select one of four starter relics when they unlock the system.
- Conquering player or barbarian villages can drop relics. Barbarian villages roll their relic when they spawn; if a village turns barbarian again, a new relic is generated when it is retaken.
- Relics live inside a dedicated treasury UI where players can store, merge, equip, or remove them.

### Placement Rules

- Each account can have relics active on up to **10** villages at once.
- Removing or swapping a relic imposes a **24-hour cooldown** on that slot.
- Hovering a relic in the UI highlights its radius on the map to support precise placement.

### Classes, Stats, and Stacking

- Relics progress through five classes: **Shoddy → Basic → Enhanced → Superior → Renowned**. Each tier expands the radius and main stat values.
- Main stats map to the relic type (e.g., troop attack, recruit speed, haul capacity). Sub-stats roll from the same list but with smaller caps.
- Effects stack up to **10%** per statistic on a village; sub-stats generally cap at 5%. Once a stat hits the cap, additional relics with that stat provide no extra benefit.
- Worlds disable archetype-specific relics when the related feature is off (e.g., archer relics vanish on no-archer worlds; haul relics disappear on no-haul worlds).

### Merging Behavior

- Merging three relics of the same type upgrades that type to the next class, improving stats and radius.
- Merging different types of the same class yields a random relic of the next class with randomized stats.
- Upgraded relics inherit cosmetic changes (nameplates, colors) that reflect the new quality.

### Endgame Impact

- **Domination support:** Tribes stack relics around border clusters that must not fall below the domination threshold, prioritizing recruit-speed or defensive stat boosts.
- **Rune defense:** Rune villages often require relic-backed reinforcement. Offensive penalties from rune ownership can be offset by range-boosted combat relics or economy relics that keep reinforcements flowing.

## Administration Checklist

When enabling these modes on a world, record the following settings so gameplay, UI, and documentation stay aligned:

| Feature | Required Settings |
|---------|------------------|
| **Domination** | Percentage threshold, hold duration (if any), counting baseline, earliest start/grace period, warning distance. |
| **Rune Wars** | Required rune count (global or regional), hold duration, spawn rules, domination timer interaction, timer reset vs. pause behavior. |
| **Relics** | Feature toggle, starter relic selection list, placement limit (10), removal cooldown (24h), stacking caps, class progression, disabled relic families for no-archer/no-haul worlds. |

Document the chosen values in the world configuration spec and confirm the Rankings UI reflects them before launch.

## Implementation Overview

- **Database schema:** The `prisma/schema.prisma` file defines `EndgameConfig`, `EndgameState`, and `EndgameRuneVillage` models plus supporting enums. These records extend `WorldConfig` so every world can track domination thresholds, rune timers, and relic caps without overloading JSON columns.
- **Tick orchestration:** `lib/game-services/endgame-service.ts` executes once per `processGameTick` run. It calculates tribe dominance, applies rune penalties, emits admin notifications, and flags victories. The service tolerates environments where Prisma has not been regenerated yet by short-circuiting when the delegates are missing.
- **Combat integration:** `lib/game-services/combat-service.ts` applies the rune defense multiplier during battle resolution. Captured rune villages therefore require constant stacking as described above.
- **Player API:** `/api/world/endgame` returns a serialized snapshot combining configuration, state, and rune village metadata so UI surfaces can mirror the Rankings warnings and hold timers.
- **Admin visibility:** Notifications flow through `AdminNotification` entries with `SYSTEM` type so dashboards flag warning thresholds, hold starts, and victory completion events.

## Printable Configuration Checklist

Use the companion worksheet (`docs/features/tribal-wars-endgame-checklist.md`) when planning or auditing a server. The sheet distills every configurable lever into a single page with checkboxes and fill-in fields so ops teams can capture the live rules, confirm broadcast thresholds, and record sign-off dates during world reviews.

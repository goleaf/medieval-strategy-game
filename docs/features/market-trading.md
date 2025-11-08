# Market & Merchants — Player-to-Player Trading

This guide captures how the Market building unlocks trading, how merchants behave, and best practices for moving resources between villages or accounts. It mirrors the official Tribal Wars help center guidance so designers and engineers can align UI, backend, and balancing decisions.

## 1. Market building overview

- **Purpose:** Constructing a Market enables both village-to-village transfers and the public offer book for swapping resources with other players.
- **Unlock requirements:** Standard worlds expect a modest Headquarters and Warehouse before construction (commonly HQ 3, Warehouse 2).
- **Progression payoff:** Each Market level awards additional merchants. More merchants translate to more concurrent shipments or larger single deliveries.

## 2. Merchant fundamentals

- **Capacity math:** Merchant carts scale by tribe—Romans carry 500, Gauls 750, Teutons follow raid-focus tuning (default 1,000), and others range between 600–900. Cargo can still mix types (e.g., 300 wood + 400 clay + 300 iron) up to the per-cart limit.
- **Shipment sizing:** Total send capacity equals `merchantCount × 1,000`. The UI should calculate ceiling divisions so partial merchants are never assigned.
- **Status states:**
  - `available` — idle in the village and ready for dispatch.
  - `outgoing` — traveling with cargo toward the target village.
  - `returning` — heading back empty after delivery.
  - `reserved` — parked on a pending public offer awaiting acceptance.
- **Transport vs. storage:** Merchant slots only govern movement. The receiving village must have Warehouse space; no overflow storage is implied.

## 3. Trading flows

### 3.1 Direct shipments (“free trade”)

- **Definition:** Send resources to any village without expecting a return bundle.
- **Usage:** Ideal for internal logistics across your own villages, tribe support, or emergency drains before incoming raids.
- **Restrictions:**
  - Newly created accounts often face a cooldown before they can ship to other players.
  - Individual worlds may toggle tribe-only transfers, distance caps, or account-age gates.
- **Cancellation:** Worlds configure a short recall window (typically minutes). Once the timer lapses, merchants stay committed until they return.

### 3.2 Market offers (public order book)

- **Definition:** Post “give X for Y” offers that other players accept through the Market UI, guaranteeing both sides receive the promised resources.
- **Offer creation:**
  - Choose the resource you are **offering**, the amount, and the resource/amount you **request**.
  - Merchants equal to the offered load are locked immediately using the tribe-specific capacity math, and the game pulls the offered resources out of storage so trades remain solvent.
- **Offer acceptance:**
  - Acceptors must already hold the requested resource.
  - Travel time is previewed; acceptance is final.
- **Discovery & fairness:**
  - Filter by ratios, distance, resource type, or tribe membership when searching offers.
  - Worlds rely on community norms or local rules to police unfair ratios, so default UI should present ratios clearly and let admins adjust policy.

## 4. Travel timing

- **Distance-based:** Merchant travel time scales with the tile distance between source and target villages.
- **Speed modifiers:** Game speed and unit speed multipliers apply; night bonus and morale do not.
- **Round-trip commitment:** Merchants remain occupied for the outbound and return legs. Throughput improves when villages operate within short travel ranges.

## 5. Sender & receiver checks

- **At dispatch:**
  - Confirm enough resources and idle merchants exist.
  - Respect Market level limits so concurrent jobs never exceed the merchant roster.
- **At arrival:**
  - Ensure destination Warehouse capacity can absorb the incoming load.
  - Hiding Place buildings do not protect incoming shipments; they only shield against plunder.
- **Per-cart mixing:** Players may fine-tune resource splits within a single cart to avoid overflow or satisfy precise build queue needs.

## 6. Cancellation windows & visibility

- **Transports:** Short recall window immediately after launch; once expired, they cannot be canceled.
- **Offers:** Withdraw anytime before another player accepts. Accepted offers move to history logs and trigger reciprocal shipments for both sides.
- **Movement logs:** Market and Rally Point screens list outgoing, incoming, and returning transports with timestamps for monitoring.

## 7. Rule compliance & safety

- **Onboarding limits:** Clearly communicate cooldown timers that prevent new accounts from sending free trades; encourage using Market offers until the lock expires.
- **World-level toggles:** Respect admin-configured restrictions (tribe-only trading, distance limits, etc.).
- **Tooling policy:** Any helper scripts for browsing offers must be explicitly permitted on the target market/region.
- **Premium Exchange distinction:** Premium Exchange trades resources for Premium Points against a neutral exchange. Deliveries typically arrive in two hours and do **not** count as player-to-player trades, though they still consume your merchants when selling.

## 8. Operational best practices

- Build **backline hubs** with high Market levels to feed frontline villages through short hops.
- Scale Market levels ahead of major troop or siege build-ups to keep merchants plentiful.
- Schedule incoming shipments to land when Warehouse space frees up to avoid capped production.
- Post offers to rebalance overproduced resources instead of hoarding.
- Under threat, dispatch resources to safe villages as decoys; cancel what you can after the danger passes if the window allows.
- Regularly audit trade logs to refine hub placement, merchant counts, and timing.

## 9. Printable checklists & templates

Use these quick-reference sheets when coordinating tribe logistics or tuning automation scripts. Keep a copy per logistics hub so operators know the expected cadence and alert thresholds.

### 9.1 Village trade readiness audit

| Checkpoint | Why it matters | Status |
| --- | --- | --- |
| Market level matches planned merchant demand | Prevents dispatch bottlenecks when production spikes | ☐ / ☑ |
| Warehouse has ≥ 15% buffer before every arrival | Avoids resource overflow during chained shipments | ☐ / ☑ |
| Rally Point filters show “Transports” tab pinned | Ensures operators can spot delays quickly | ☐ / ☑ |
| Tribe permissions/world rules reviewed this week | Confirms no new distance or tribe-only restrictions | ☐ / ☑ |
| Premium Exchange stock snapshot taken | Helps decide if PP swaps are better than tribe trades | ☐ / ☑ |

### 9.2 Shipment planning worksheet (per destination)

| Destination village | Distance (fields) | Trip time (hh:mm) | Merchants committed | Cargo breakdown | Arrival window |
| --- | --- | --- | --- | --- | --- |
| | | | | Wood: \_\_\_ Clay: \_\_\_ Iron: \_\_\_ | |
| | | | | | |
| | | | | | |

### 9.3 Offer posting template

| Offer ID | Offered resource & amount | Requested resource & amount | Ratio | Min partial (if any) | Notes |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

**Usage tips:**

- Print double-sided: readiness audit on one side, planning worksheet plus offer template on the other.
- After completing a run, file the sheet in the tribe logistics binder or digitize it for historical throughput metrics.

## References

- Tribal Wars Support — [Market Overview](https://support.innogames.com/kb/TribalWars/en_DK/5321/Market)
- Tribal Wars Support — [What is Trade?](https://support.innogames.com/kb/TribalWars/en_DK/1265)
- Tribal Wars Support — [Premium Exchange](https://support.innogames.com/kb/TribalWars/en_DK/1268)

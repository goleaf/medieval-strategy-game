# Game Logic Implementation TODO

## Priority 1: Core Production & Storage
- [ ] Update production tick to 5 minutes (configurable via env)
- [ ] Implement storage clamping based on warehouse level
- [ ] Add "Upgrade Warehouse" hint when storage >95% full

## Priority 2: Construction Queue System
- [ ] Implement sequential construction queue per village
- [ ] Add queue limit from environment variable
- [ ] Costs deducted at enqueue (already done, verify)
- [ ] Implement refund percentage on cancel

## Priority 3: Training System
- [ ] Implement batch training system
- [ ] Calculate training time: sum(quantity * unit.build_time) / buildings bonus
- [ ] Store training queue/completion times

## Priority 4: Movement & ETA
- [ ] Update movement ETA calculation: distance * unit_speed / world.unit_speed
- [ ] Implement slowest unit defines stack speed logic

## Priority 5: Combat System
- [ ] Implement classic O/D (Offense/Defense) calculation
- [ ] Add wall bonus to defense
- [ ] Add small randomness (±10%)
- [ ] Implement siege unit effects (reduce wall/building levels)
- [ ] Limit loot by carry capacity & defender storage

## Priority 6: Scouting System
- [ ] Implement scouting attack type
- [ ] Success vs enemy scouts logic
- [ ] Reveal units, buildings, storage on success
- [ ] Failed scout informs defender

## Priority 7: Loyalty & Conquest
- [ ] Noble hit reduces 20-35 loyalty points (random)
- [ ] Conquest at ≤0 loyalty transfers ownership
- [ ] Reset loyalty to 25-30 on conquest

## Priority 8: Ranking System
- [ ] Update ranking calculation: points = building levels + villages
- [ ] Implement leaderboard caching


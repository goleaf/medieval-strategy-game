# Performance Architecture Guide

This document captures the performance strategy for the Medieval Strategy Game backend and client surface areas. It focuses on caching, database efficiency, asset delivery, and horizontal scalability so live worlds stay responsive as populations grow.

## Tiered Caching Strategy

We use a three-tier cache stack to protect the database while keeping frequently accessed gameplay data hot.

| Tier | Use Cases | Retention / Size | Notes |
| --- | --- | --- | --- |
| In-memory (per node) | ultra-hot primitives such as player rank snapshots or recent report lookups | TTL-driven, stays below 250 MB per process | fastest read path, but volatile on deploy/restart |
| Redis | canonical cache for villages, tribes, map tiles, rankings, and profiles | TTL varies by object; eviction via LRU | shared across nodes; supports pub/sub invalidation |
| Database | source of truth | no TTL | writes always go here; cache misses fall back here |

### Cached Domains

- **Village State** – cache the entire computed state (resources, queues, boosts) for 60 s. Invalidate on any write to that village or on ownership changes. Use village-scoped Redis channels so all app servers drop the cached blob together.
- **Player Profile** – points, rank, tribe, and achievement metadata cached for 300 s. Bust when related village totals, tribe membership, or rank recomputes change.
- **Tribe Data** – member roster, diplomacy pacts, and shared buffs cached for 600 s. Invalidate on membership churn or diplomacy edits.
- **Map Tiles** – prerendered tile payloads cached with a long TTL (hours). Invalidate only when a tile’s owning village changes hands or when seasonal styles rotate.
- **Reports** – combat and scouting reports never mutate after generation, so cache indefinitely and serve from Redis/memory.
- **Rankings** – compute full ladders every 5–15 minutes (configurable cron); serve cached snapshots between runs. Emit a cache version key so clients can detect refreshes.

### Cache Invalidation & Observability

- Publish `cache:invalidate:<domain>:<id>` messages whenever writes hit the primary database; each node listens and drops the affected entry locally.
- Expose cache hit/miss metrics per domain via the admin stats API; alerts trigger when miss rate exceeds 15 % over five minutes.
- Keep a fallback path that bypasses Redis so maintenance windows do not block gameplay.

## Database Optimization

1. **Indexing** – ensure every foreign key, WHERE predicate, and ORDER BY column has a complementary index. For compound sorts, match the query prefix order.
2. **Query Shaping** – rely on Prisma’s `include` and `select` helpers to eliminate N+1 patterns; use batch loaders for combat/unit lookups.
3. **Denormalization** – persist derived values such as village points, player ranks, and tribe totals so leaderboard and scouting queries avoid runtime aggregations.
4. **Partitioning** – move report rows older than 30 days into an archive partition/table. Nightly jobs vacuum the hot partition.
5. **Read Replicas** – route GET-heavy APIs (map, profiles, rankings) to replicas; keep writes and cache invalidations on the primary.
6. **Connection Pooling** – configure Prisma’s Data Proxy or pgbouncer; target ≤ 80 % of the database max connections under peak load.
7. **Query Review** – document the `EXPLAIN ANALYZE` output for any query slower than 50 ms and track follow-up tickets in `docs/development/database-tuning.md` (future).

## Asset Optimization

- **Images** – compress via the build pipeline, prefer WebP/AVIF, and bundle tiny icons into sprite sheets for the map HUD.
- **Code Splitting** – rely on dynamic imports for admin-only charts and late-stage onboarding flows; make sure unused chunks shake out of the build.
- **Minification & Tree Shaking** – Next.js handles this by default, but lint for side-effectful imports that could block shaking.
- **CDN Distribution** – deploy `public/` assets and generated tiles to the CDN edge; configure HTTP/2 push or preloads for critical CSS.
- **Resource Bundling** – group related UI primitives or locale files so early navigation requires minimal round-trips.
- **Progressive Loading** – load the above-the-fold map shell and initial village list first, defer intel tabs until interaction.
- **Service Workers** – cache static assets and recent reports for offline review; bust the SW when the asset manifest hash changes.

## Scalability Architecture

1. **Stateless App Servers** – avoid sticky sessions; session data stays in cookies/JWTs or Redis so horizontal scaling is trivial.
2. **Load Balancing** – health-checked L7 balancers fan out requests and eject unhealthy pods; enable slow-start to warm caches.
3. **Microservices** – isolate combat simulation, market settlement, notifications, and ranking recomputes so each can scale independently.
4. **Message Queues** – push non-blocking work (report generation, tribe mail, async economy ticks) into queues; workers auto-scale with backlog depth.
5. **Database Sharding** – future-proof by sharding by player ID or continent once world sizes exceed a single primary’s capacity.
6. **Auto-scaling Policies** – add/remove app and worker nodes based on CPU, memory, request latency, and queue depth thresholds.
7. **Monitoring & Alerting** – track CPU, memory, DB connections, request rate, error rate, response times, and cache health. Surface summaries in `/api/admin/stats` and forward anomalies to the admin notifications system.

### Operational Checklist

| Task | Owner | Frequency |
| --- | --- | --- |
| Recompute leaderboard snapshots | Ranking worker | 5–15 min cron |
| Archive stale reports partition | Ops | Nightly |
| Validate cache hit-rate dashboards | SRE | Hourly glance |
| Review slow query log | Backend | Daily |
| CDN asset purge upon release | Release engineer | Each deploy |

Keep this guide updated whenever performance-sensitive systems change. Cross-link any detailed runbooks or scripts from this page.

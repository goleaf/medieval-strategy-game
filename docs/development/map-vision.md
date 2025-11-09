# Map Vision Development Notes

This note tracks the foundation work landing for the Map & Fog-of-War Vision System. It complements the full product spec in `docs/features/map-vision-system.md`.

## Modules & Responsibilities
- `lib/map-vision/config.ts` — default radii/TTL tables, band helpers, and attribute freshness classifiers shared by the backend + future UI overlays.
- `lib/map-vision/coordinate-service.ts` — canonical parsing, extent validation, block math (`K` notation), toroidal wrap helpers, and route sampling for contact detection.
- `lib/map-vision/passive-source-builder.ts` — derives passive sources from villages, watchtowers, and player-held garrisons (personal vs alliance scope) without requiring pre-populated `VisionSource` rows.
- `lib/map-vision/vision-state-store.ts` — loads/persists `TileVisionState` rows, snapshots attribute maps (owner/pop/wall), and applies state transitions + memory TTLs.
- `lib/map-vision/vision-aggregator.ts` — unions passive + active sources, ensures `MapTile` rows exist, updates viewer/alliance `TileVisionState` entries, and emits spec-compliant `TileState` payloads with freshness metadata.
- `lib/map-vision/types.ts` — shared contracts for coordinates, `TileState`, `VisionSource`, `ReconMission`, `ContactLogEntry`, and TTL tracking.
- `app/api/map/vision/route.ts` — GET endpoint for tactical/provincial/world views. Accepts `gameWorldId`, `center`, optional `radius`, `scale`, `viewerPlayerId`, `viewerAllianceId`. Returns extent metadata + tile grid compatible with client overlays.
- `app/api/map/world/route.ts` — world overview snapshot (all villages + tribe tags + barbarian flags) powering the `/map` world zoom and mini-map without issuing million-tile queries.

## Persistence
- Migration `20251111130000_map_vision_foundations` adds:
  - `MapTile` table (canonical tile definitions, tags, metadata).
  - `TileVisionState` for per-viewer fog states + attribute freshness.
  - `VisionSource`, `ReconMission`, `ContactLogEntry`, and `VisionTTLTracker` scaffolding ahead of passive/active feed ingestion.
- Schema enums for map topology and TTL entities live alongside the new models in `prisma/schema.prisma`.
- Apply migrations via `npx prisma migrate dev` once local drift is resolved; `npx prisma generate` has already been run for the new client types.

## Testing & Tooling
- Coordinate grammar + toroidal math: `npx vitest run lib/__tests__/map-coordinate-service.test.ts`.
- Vision constants + helper tables: `npx vitest run lib/__tests__/map-vision-config.test.ts`.
- `/api/map/vision` can be smoke-tested with `curl`:

```bash
curl "http://localhost:3000/api/map/vision?gameWorldId=<worldId>&center=0|0&scale=REGION&viewerPlayerId=<playerId>"
```

The response includes:
- `tiles`: ordered grid of `TileState` records.
- `extent`: world bounds (default `000…999` on each axis for a 1000×1000 grid).
- `block`: diplomatic block (e.g., `K45`) derived from the center coordinate (column 4, row 5 of the 100×100 continents).

## Next Steps
- Populate `MapTile` via world generation/seeding so non-village tiles (oases, specials) expose metadata + cosmetics once fog lifts.
- Build the Recon Service feed that schedules missions, writes `VisionSource` rows (`PATROL`, `PROBE`, `BEACON`), and tags the entries for alliance sharing scopes.
- Add a lightweight TTL sweeper (or reuse `VisionTTLTracker`) so stale `TileVisionState` rows decay even if a viewer never opens the affected block.
- Layer in contact detection + rate limiting per §7/§11 of the spec once active lighting is trusted.

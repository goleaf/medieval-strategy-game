# Map Vision Development Notes

This note tracks the foundation work landing for the Map & Fog-of-War Vision System. It complements the full product spec in `docs/features/map-vision-system.md`.

## Modules & Responsibilities
- `lib/map-vision/coordinate-service.ts` — canonical parsing, extent validation, block math (`K` notation), toroidal wrap helpers, and route sampling for contact detection.
- `lib/map-vision/vision-aggregator.ts` — aggregates passive data (currently village footprints) into `TileState` payloads. Stubs `FRESH` vs `KNOWN_STALE` transitions until passive/active sources are persisted.
- `lib/map-vision/types.ts` — shared contracts for coordinates, `TileState`, `VisionSource`, `ReconMission`, `ContactLogEntry`, and TTL tracking.
- `app/api/map/vision/route.ts` — GET endpoint for tactical/provincial/world views. Accepts `gameWorldId`, `center`, optional `radius`, `scale`, `viewerPlayerId`, `viewerAllianceId`. Returns extent metadata + tile grid compatible with client overlays.

## Persistence
- Migration `20251111130000_map_vision_foundations` adds:
  - `MapTile` table (canonical tile definitions, tags, metadata).
  - `TileVisionState` for per-viewer fog states + attribute freshness.
  - `VisionSource`, `ReconMission`, `ContactLogEntry`, and `VisionTTLTracker` scaffolding ahead of passive/active feed ingestion.
- Schema enums for map topology and TTL entities live alongside the new models in `prisma/schema.prisma`.
- Apply migrations via `npx prisma migrate dev` once local drift is resolved; `npx prisma generate` has already been run for the new client types.

## Testing & Tooling
- Coordinate grammar + toroidal math: `npx vitest run lib/__tests__/map-coordinate-service.test.ts`.
- `/api/map/vision` can be smoke-tested with `curl`:

```bash
curl "http://localhost:3000/api/map/vision?gameWorldId=<worldId>&center=0|0&scale=REGION&viewerPlayerId=<playerId>"
```

The response includes:
- `tiles`: ordered grid of `TileState` records.
- `extent`: world bounds (default −400…400).
- `block`: diplomatic block (e.g., `K0404`) derived from the center coordinate.

## Next Steps
- Populate `MapTile` via world generation/seeding so non-village tiles (oases, specials) have metadata ahead of passive coverage.
- Wire passive vision sources (villages, watchtowers, oases, reinforcements, hero bonus) into `VisionSource` + `TileVisionState`.
- Extend `/api/map/vision` responses with freshness timestamps pulled from `TileVisionState` instead of the current stubbed values.

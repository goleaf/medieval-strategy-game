# World Map System

This project includes a grid‑based world map for strategic exploration and planning.

## Coordinates

- World extent: `000|000` → `999|999` (1000 × 1000 tiles)
- One village per coordinate (enforced by a unique `(x, y)` constraint in the schema).
- Canonical format: `NNN|NNN` with leading zeros (e.g., `004|058`).

## Continents (100 × K00–K99)

- The world is divided into 100 continents (10 × 10), each a 100 × 100 block.
- Labeling: `Kxy`, where `x` is the 100‑tile column, `y` is the 100‑tile row.
- Example: `K45` covers coordinates:
  - x: 400–499
  - y: 500–599

Internally this is handled by `MapCoordinateService` (`lib/map-vision/coordinate-service.ts`), with tests in `lib/__tests__/map-coordinate-service.test.ts`.

## UI Features

- Pan and zoom across multiple levels (World, Province, Region, Tactical).
- Mini‑map for quick navigation (click to re‑center viewport).
- Color‑coding by tribe for ownership; barbarian villages display in gray.
- Click any village to view details (owner, tribe, coordinates, K‑continent).
- Distance calculation between any two coordinates.

## Components & Routes

- High‑level map (canvas, viewport culling, filters):
  - Component: `components/game/world-map/world-map-view.tsx`
  - Route: `app/world-map/page.tsx` → `/world-map`

- Simple explorer (grid tiles + mini‑map + distance tool):
  - Component: `components/game/world-map/world-map.tsx`
  - Route: `app/map/page.tsx` → `/map`

`components/game/world-map/index.ts` re‑exports both map components for convenience.

## Data & API

- World overview and block streaming:
  - `GET /api/map/world` (supports block queries like `?block=K45` and/or bounding boxes)
- Vision window (Region/Province tactical tiles):
  - `GET /api/map/vision?gameWorldId=...&center=NNN|NNN&scale=REGION|PROVINCE|WORLD`

Both endpoints rely on `MapCoordinateService` for:
  - Formatting coordinates, deriving K-block IDs, computing ranges, and block enumeration.

## Rendering & Spatial Systems

- **Viewport streaming**: `hooks/use-world-map-data.ts` only loads blocks intersecting the current viewport plus a 30-tile buffer, tracks `lastUsedAt`, and prunes idle blocks after ~45 seconds (or sooner when >48 cached blocks) so the browser can comfortably handle 1,000,000-village worlds.
- **Tile aggregation**: `lib/map-vision/tile-aggregator.ts` groups villages into deterministic 50×50 tiles (`Tcol-row`). The World zoom renders these aggregates instead of individual markers, exposing dominant tribe share, total villages, and centroid jumps for instant continent-level intel.
- **Canvas + cache**: `components/game/world-map/world-map-view.tsx` keeps the grid/heatmap on a single canvas layer while overlaying either tile cards (World) or adaptive markers (Province/Region/Tactical). Markers scale with population, fade by point weight, and only mount when inside the viewport’s padded bounds.
- **Color accessibility**: Every tribe color is derived from a stable HSL hash. Own villages get amber rings, barbarians stay gray, and bookmarked villages surface a star badge. Selecting the High Contrast palette adds hashed stripe patterns (via CSS gradients) to aid color-blind commanders.
- **Distance math**: `lib/map-vision/distance-cache.ts` caches both Manhattan approximations and exact Euclidean distances. Filters and the distance tool first use the Manhattan sum to reject faraway villages quickly, then fall back to cached square-root math when within tolerance. Travel-time panels reuse the cached value so repeated queries stay constant time.

## Usage Tips

- Mini-map: click anywhere to jump; the rectangle shows current viewport.
- Distance: input `NNN|NNN` pairs or select a village and use “Use as From/To”.
- Continents: in the advanced view, you can filter and highlight `K00–K99`.

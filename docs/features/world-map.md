# World Map Structure

## Coordinate Grammar
- The strategic map is a fixed **1000×1000** grid that spans `000|000` (north-west) to `999|999` (south-east). All coordinates are rendered zero-padded and exposed through the `/api/map` routes.
- Continents are deterministic 100×100 tiles labeled `Kxy`, where `x` is the column (0–9) and `y` is the row (0–9). Example: `K45` covers `400|500` through `499|599`.
- The default planar topology clamps every request into this extent. Toroidal rules remain opt-in and will wrap through the same helper if enabled per world.

## UI Layers (`/map`)
- **Region (15×15)** – tactical grid with 36px tiles, drag/arrow panning, and fog states rendered per tile.
- **Province (100×100)** – continental planning view with 10px tiles and scroll/drag support.
- **World (1000×1000)** – SVG overview fed by `/api/map/world`, displaying every village as a dot (tribe-colored, barbarians gray). Clicking any coordinate re-centers and auto-zooms to Province, while the mini-map lets players jump anywhere instantly.
- Selection drawer surfaces owner, tribe, continent, and population metadata. Buttons can center the main viewport or push coordinates into the distance calculator.
- The distance tool expects `NNN|NNN` inputs and reports `sqrt((Δx)^2 + (Δy)^2)` tiles, matching travel math across the combat engine.

## Color Coding Rules
- Tribe colors are deterministic HSL hues derived from the tribe tag; neutral (no tribe) uses `#3b82f6`.
- Barbarian or abandoned villages always render `#9ca3af`.
- Selected villages get a primary ring plus badges for `Capital`, `Barbarian`, or tribe tags.

## API Surfaces
- `GET /api/map/vision` – region/province query fed by `MapCoordinateService`. Accepts `gameWorldId`, `center`, `scale`, optional `radius`, and viewer IDs for passive vision.
- `GET /api/map/world` – lightweight snapshot of every village in a world (id, coords, player, tribe, barbarian flag) for the world overview and mini-map.
- Both endpoints clamp to the 1000×1000 extent, ensuring UI + docs stay aligned with continent math.

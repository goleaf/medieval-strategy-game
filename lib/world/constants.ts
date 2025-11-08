/**
 * Core constants that describe the default world grid layout.
 * The values mirror the official 10x10 continent lattice where each continent spans 100 tiles per axis.
 */
export const CONTINENT_GRID_WIDTH = 10

/**
 * Number of tile columns/rows contained within a single continent band.
 */
export const CONTINENT_TILE_SIZE = 100

/**
 * Total number of tile columns (and rows) available in the default world.
 * This is derived from the continent grid width and the continent tile size.
 */
export const WORLD_TILE_WIDTH = CONTINENT_GRID_WIDTH * CONTINENT_TILE_SIZE

/**
 * Highest valid tile coordinate (inclusive) along each axis for the default world.
 */
export const WORLD_MAX_COORDINATE = WORLD_TILE_WIDTH - 1

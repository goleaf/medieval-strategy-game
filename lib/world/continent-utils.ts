import type { Continent } from "@prisma/client"
import { CONTINENT_GRID_WIDTH, CONTINENT_TILE_SIZE } from "./constants"

/**
 * Minimal shape required to compute coordinates within a continent.
 */
export type ContinentBounds = Pick<Continent, "x" | "y" | "size"> | {
  x: number
  y: number
  size: number
}

/**
 * Build the canonical K-label (e.g. K55) for the provided continent bands.
 * Values are clamped to the configured grid width so accidental out-of-range
 * inputs still produce a stable identifier.
 */
export function getContinentLabel(xBand: number, yBand: number): string {
  const clampedX = Math.max(0, Math.min(CONTINENT_GRID_WIDTH - 1, xBand))
  const clampedY = Math.max(0, Math.min(CONTINENT_GRID_WIDTH - 1, yBand))
  return `K${clampedX}${clampedY}`
}

/**
 * Generate the full grid of continent descriptors for the default world layout.
 * Each descriptor includes the band indices, top-left coordinate, continent size,
 * and computed label so callers can upsert database rows or drive map overlays.
 */
export function buildContinentGrid(
  continentsPerAxis: number = CONTINENT_GRID_WIDTH,
  continentSize: number = CONTINENT_TILE_SIZE,
) {
  const grid: Array<{
    xBand: number
    yBand: number
    x: number
    y: number
    size: number
    name: string
  }> = []

  for (let yBand = 0; yBand < continentsPerAxis; yBand += 1) {
    for (let xBand = 0; xBand < continentsPerAxis; xBand += 1) {
      const x = xBand * continentSize
      const y = yBand * continentSize
      grid.push({
        xBand,
        yBand,
        x,
        y,
        size: continentSize,
        name: getContinentLabel(xBand, yBand),
      })
    }
  }

  return grid
}

/**
 * Pick a random tile coordinate within the provided continent bounds.
 */
export function getRandomPositionInContinent(continent: ContinentBounds) {
  if (continent.size <= 0) {
    throw new Error(`Invalid continent size: ${continent.size}`)
  }

  const maxOffset = continent.size - 1
  const x = continent.x + Math.floor(Math.random() * (maxOffset + 1))
  const y = continent.y + Math.floor(Math.random() * (maxOffset + 1))

  return { x, y }
}

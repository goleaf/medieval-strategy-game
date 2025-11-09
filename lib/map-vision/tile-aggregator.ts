import type { Coordinate, CoordinateRange } from "./types"

export interface TileAggregateVillageLike {
  id: string
  x: number
  y: number
  population: number
  tribeId: string | null
  tribeTag: string | null
  tribeName: string | null
  isBarbarian: boolean
  playerId: string
}

export interface TribeBreakdownEntry {
  tribeId: string | null
  tribeTag: string | null
  tribeName: string | null
  count: number
}

export interface MapTileAggregate {
  id: string
  col: number
  row: number
  range: CoordinateRange
  centroid: Coordinate
  totalVillages: number
  totalPopulation: number
  barbarianCount: number
  tribeBreakdown: TribeBreakdownEntry[]
  dominant: {
    tribeId: string | null
    tribeTag: string | null
    tribeName: string | null
    count: number
    percentage: number
  } | null
}

export interface TileAggregationOptions {
  tileSize?: number
  extent?: CoordinateRange
}

export const DEFAULT_TILE_SIZE = 50

export function tileIdFromCoordinate(coord: Coordinate, options?: TileAggregationOptions) {
  const tileSize = options?.tileSize ?? DEFAULT_TILE_SIZE
  const originX = options?.extent?.minX ?? 0
  const originY = options?.extent?.minY ?? 0
  const col = Math.floor((coord.x - originX) / tileSize)
  const row = Math.floor((coord.y - originY) / tileSize)
  return { id: `T${col}-${row}`, col, row }
}

export function aggregateVillagesIntoTiles(
  villages: TileAggregateVillageLike[],
  options: TileAggregationOptions = {},
): MapTileAggregate[] {
  const tileSize = options.tileSize ?? DEFAULT_TILE_SIZE
  const extent = options.extent ?? {
    minX: 0,
    maxX: 999,
    minY: 0,
    maxY: 999,
  }
  const originX = extent.minX
  const originY = extent.minY
  const tiles = new Map<string, MapTileAggregate>()

  villages.forEach((village) => {
    const col = Math.floor((village.x - originX) / tileSize)
    const row = Math.floor((village.y - originY) / tileSize)
    const minX = originX + col * tileSize
    const minY = originY + row * tileSize
    const maxX = Math.min(minX + tileSize - 1, extent.maxX)
    const maxY = Math.min(minY + tileSize - 1, extent.maxY)
    const key = `T${col}-${row}`

    if (!tiles.has(key)) {
      tiles.set(key, {
        id: key,
        col,
        row,
        range: { minX, maxX, minY, maxY },
        centroid: {
          x: Math.round((minX + maxX) / 2),
          y: Math.round((minY + maxY) / 2),
        },
        totalVillages: 0,
        totalPopulation: 0,
        barbarianCount: 0,
        tribeBreakdown: [],
        dominant: null,
      })
    }

    const tile = tiles.get(key)!
    tile.totalVillages += 1
    tile.totalPopulation += village.population
    if (village.isBarbarian) {
      tile.barbarianCount += 1
    }
    const tribeKey = village.tribeId ?? (village.isBarbarian ? "BARBARIAN" : "UNALIGNED")
    const breakdown = tile.tribeBreakdown
    let entry = breakdown.find((item) => item.tribeId === tribeKey)
    if (!entry) {
      entry = {
        tribeId: village.isBarbarian ? null : village.tribeId,
        tribeTag: village.tribeTag,
        tribeName: village.tribeName,
        count: 0,
      }
      breakdown.push(entry)
    }
    entry.count += 1
  })

  tiles.forEach((tile) => {
    if (tile.totalVillages === 0) {
      tile.dominant = null
      return
    }
    let dominant = tile.tribeBreakdown[0] ?? null
    tile.tribeBreakdown.forEach((entry) => {
      if (!dominant || entry.count > dominant.count) {
        dominant = entry
      }
    })
    if (dominant) {
      tile.dominant = {
        tribeId: dominant.tribeId,
        tribeTag: dominant.tribeTag,
        tribeName: dominant.tribeName,
        count: dominant.count,
        percentage: Math.round((dominant.count / tile.totalVillages) * 100),
      }
    }
  })

  return Array.from(tiles.values())
}

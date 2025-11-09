import { describe, expect, it } from "vitest"
import { aggregateVillagesIntoTiles, tileIdFromCoordinate, DEFAULT_TILE_SIZE } from "@/lib/map-vision/tile-aggregator"

describe("tile aggregator", () => {
  it("groups villages into 50x50 tiles with dominant tribe metadata", () => {
    const villages = [
      { id: "a", x: 10, y: 10, population: 500, tribeId: "TRI", tribeTag: "TRI", tribeName: "Triumph", isBarbarian: false, playerId: "p1" },
      { id: "b", x: 15, y: 12, population: 300, tribeId: "TRI", tribeTag: "TRI", tribeName: "Triumph", isBarbarian: false, playerId: "p2" },
      { id: "c", x: 70, y: 70, population: 450, tribeId: "ALP", tribeTag: "ALP", tribeName: "Alpha", isBarbarian: false, playerId: "p3" },
      { id: "d", x: 80, y: 65, population: 350, tribeId: null, tribeTag: null, tribeName: null, isBarbarian: true, playerId: "barb" },
    ]
    const tiles = aggregateVillagesIntoTiles(villages)
    expect(tiles).toHaveLength(2)

    const tile00 = tiles.find((tile) => tile.id === "T0-0")
    expect(tile00?.totalVillages).toBe(2)
    expect(tile00?.dominant?.tribeTag).toBe("TRI")
    expect(tile00?.dominant?.percentage).toBe(100)

    const tile11 = tiles.find((tile) => tile.id === "T1-1")
    expect(tile11?.totalVillages).toBe(2)
    expect(tile11?.barbarianCount).toBe(1)
    expect(tile11?.dominant?.percentage).toBe(50)
  })

  it("derives tile ids from coordinates", () => {
    const tile = tileIdFromCoordinate({ x: 125, y: 275 }, { tileSize: DEFAULT_TILE_SIZE })
    expect(tile.id).toBe("T2-5")
    expect(tile.col).toBe(2)
    expect(tile.row).toBe(5)
  })
})

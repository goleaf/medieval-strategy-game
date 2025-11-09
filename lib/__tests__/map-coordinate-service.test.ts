import { describe, it, expect } from "vitest"
import { MapCoordinateService } from "@/lib/map-vision/coordinate-service"

describe("MapCoordinateService", () => {
  it("parses canonical coordinates", () => {
    const service = new MapCoordinateService({ minX: -50, minY: -50 })
    expect(service.parseCoordinate("10|5")).toEqual({ x: 10, y: 5 })
    expect(service.parseCoordinate("( -12 | 40 )")).toEqual({ x: -12, y: 40 })
  })

  it("clamps coordinates outside extent when planar", () => {
    const service = new MapCoordinateService({ minX: -5, maxX: 5, minY: -5, maxY: 5 })
    expect(service.parseCoordinate("10|5")).toEqual({ x: 5, y: 5 })
    expect(service.parseCoordinate("-9|-6")).toEqual({ x: -5, y: -5 })
  })

  it("wraps coordinates when toroidal", () => {
    const service = new MapCoordinateService({ minX: -2, maxX: 2, minY: -2, maxY: 2, toroidal: true })
    expect(service.parseCoordinate("3|0")).toEqual({ x: -2, y: 0 })
    expect(service.parseCoordinate("-3|-3")).toEqual({ x: 2, y: 2 })
  })

  it("computes toroidal distance correctly across seams", () => {
    const service = new MapCoordinateService({ minX: -400, maxX: 400, minY: -400, maxY: 400, toroidal: true })
    const distance = service.distanceBetween({ x: 400, y: 0 }, { x: -400, y: 0 })
    expect(distance).toBe(1)
  })

  it("returns block ids using 100x100 continent notation", () => {
    const service = new MapCoordinateService({ minX: 0, maxX: 999, minY: 0, maxY: 999, blockSize: 100 })
    expect(service.toBlockId({ x: 0, y: 0 })).toBe("K00")
    expect(service.toBlockId({ x: 450, y: 575 })).toBe("K45")
  })

  it("converts block ids back to coordinate ranges", () => {
    const service = new MapCoordinateService({ minX: 0, maxX: 999, minY: 0, maxY: 999, blockSize: 100 })
    expect(service.blockIdToRange("K45")).toEqual({ minX: 400, maxX: 499, minY: 500, maxY: 599 })
  })

  it("enumerates intersecting blocks for a range", () => {
    const service = new MapCoordinateService({ minX: 0, maxX: 999, minY: 0, maxY: 999, blockSize: 100 })
    const blocks = service.getBlocksForRange({ minX: 90, maxX: 210, minY: 90, maxY: 210 })
    expect(blocks).toEqual(["K00", "K01", "K10", "K11"])
  })

  it("formats coordinates with leading zeros", () => {
    const service = new MapCoordinateService({ minX: 0, maxX: 999, minY: 0, maxY: 999 })
    expect(service.formatCoordinate({ x: 4, y: 58 })).toBe("004|058")
    expect(service.formatCoordinate({ x: 999, y: 0 })).toBe("999|000")
  })

  it("returns bounding ranges respecting planar edges", () => {
    const service = new MapCoordinateService({ minX: -10, maxX: 10, minY: -10, maxY: 10 })
    const range = service.getBoundingRange({ x: 8, y: 8 }, 5)
    expect(range).toEqual({ minX: 3, maxX: 10, minY: 3, maxY: 10 })
  })
})

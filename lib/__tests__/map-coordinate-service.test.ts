import { describe, it, expect } from "vitest"
import { MapCoordinateService } from "@/lib/map-vision/coordinate-service"

describe("MapCoordinateService", () => {
  it("parses canonical coordinates", () => {
    const service = new MapCoordinateService()
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

  it("returns block ids using K notation", () => {
    const service = new MapCoordinateService({ minX: -400, maxX: 400, minY: -400, maxY: 400, blockSize: 100 })
    expect(service.toBlockId({ x: 0, y: 0 })).toBe("K0404")
    expect(service.toBlockId({ x: -400, y: -400 })).toBe("K0000")
  })

  it("returns bounding ranges respecting planar edges", () => {
    const service = new MapCoordinateService({ minX: -10, maxX: 10, minY: -10, maxY: 10 })
    const range = service.getBoundingRange({ x: 8, y: 8 }, 5)
    expect(range).toEqual({ minX: 3, maxX: 10, minY: 3, maxY: 10 })
  })
})

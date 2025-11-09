import { MapCoordinateService } from "./coordinate-service"
import type { Coordinate } from "./types"

export interface DistanceResult {
  approximate: number
  exact: number
  usedApproximation: boolean
}

export interface DistanceCacheOptions {
  coordinateService?: MapCoordinateService
}

const DEFAULT_COORDINATE_SERVICE = new MapCoordinateService()

/**
 * DistanceCache accelerates repeated distance lookups by storing both
 * Manhattan approximations (fast) and exact Euclidean distances.
 */
export class DistanceCache {
  private readonly exact = new Map<string, number>()
  private readonly approximate = new Map<string, number>()
  private readonly coordinates: MapCoordinateService

  constructor(options: DistanceCacheOptions = {}) {
    this.coordinates = options.coordinateService ?? DEFAULT_COORDINATE_SERVICE
  }

  distance(a: Coordinate, b: Coordinate, allowApproximation = false, tolerance = 2): DistanceResult {
    const approx = this.manhattanDistance(a, b)
    if (allowApproximation && approx <= tolerance) {
      return {
        approximate: approx,
        exact: approx,
        usedApproximation: true,
      }
    }

    const exact = this.euclideanDistance(a, b)
    return {
      approximate: approx,
      exact,
      usedApproximation: false,
    }
  }

  euclideanDistance(a: Coordinate, b: Coordinate): number {
    const key = this.buildKey(a, b)
    const cached = this.exact.get(key)
    if (typeof cached === "number") {
      return cached
    }
    const distance = Math.ceil(this.coordinates.distanceBetween(a, b))
    this.exact.set(key, distance)
    return distance
  }

  manhattanDistance(a: Coordinate, b: Coordinate): number {
    const key = this.buildKey(a, b)
    const cached = this.approximate.get(key)
    if (typeof cached === "number") {
      return cached
    }
    const dx = Math.abs(a.x - b.x)
    const dy = Math.abs(a.y - b.y)
    const distance = dx + dy
    this.approximate.set(key, distance)
    return distance
  }

  private buildKey(a: Coordinate, b: Coordinate) {
    if (a.x === b.x && a.y === b.y) {
      return "same"
    }
    // Order-insensitive key so cached distances can be re-used bidirectionally.
    if (a.x < b.x || (a.x === b.x && a.y <= b.y)) {
      return `${a.x}|${a.y}~${b.x}|${b.y}`
    }
    return `${b.x}|${b.y}~${a.x}|${a.y}`
  }
}

import { type Coordinate, type CoordinateRange, type MapScale, MAP_SCALE_DEFAULT_RADIUS } from "./types"

export interface MapCoordinateConfig {
  minX: number
  maxX: number
  minY: number
  maxY: number
  toroidal: boolean
  blockSize: number
  positiveYDirection: "NORTH" | "SOUTH"
}

const DEFAULT_CONFIG: MapCoordinateConfig = {
  minX: 0,
  maxX: 999,
  minY: 0,
  maxY: 999,
  toroidal: false,
  blockSize: 100,
  positiveYDirection: "SOUTH",
}

export class MapCoordinateService {
  private readonly config: MapCoordinateConfig

  constructor(config?: Partial<MapCoordinateConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  get extent() {
    return {
      minX: this.config.minX,
      maxX: this.config.maxX,
      minY: this.config.minY,
      maxY: this.config.maxY,
    }
  }

  parseCoordinate(raw: string | Coordinate | null | undefined): Coordinate {
    if (!raw && raw !== 0) {
      throw new Error("Coordinate is required")
    }

    if (typeof raw === "object" && "x" in raw && "y" in raw) {
      return this.normalize(raw)
    }

    const value = String(raw).trim()
    const match = value.match(/^\(?\s*(-?\d+)\s*\|\s*(-?\d+)\s*\)?$/)
    if (!match) {
      throw new Error(`Invalid coordinate: ${raw}`)
    }

    const x = Number.parseInt(match[1]!, 10)
    const y = Number.parseInt(match[2]!, 10)
    return this.normalize({ x, y })
  }

  formatCoordinate(coord: Coordinate): string {
    const pad = (value: number) => {
      if (value < 0) return value.toString()
      return value.toString().padStart(3, "0")
    }
    return `${pad(coord.x)}|${pad(coord.y)}`
  }

  normalize(coord: Coordinate): Coordinate {
    if (this.config.toroidal) {
      return this.wrap(coord)
    }
    return {
      x: Math.min(this.config.maxX, Math.max(this.config.minX, coord.x)),
      y: Math.min(this.config.maxY, Math.max(this.config.minY, coord.y)),
    }
  }

  isWithinExtent(coord: Coordinate): boolean {
    return (
      coord.x >= this.config.minX &&
      coord.x <= this.config.maxX &&
      coord.y >= this.config.minY &&
      coord.y <= this.config.maxY
    )
  }

  getBoundingRange(center: Coordinate, radius: number): CoordinateRange {
    const normalizedCenter = this.normalize(center)
    if (this.config.toroidal) {
      return {
        minX: normalizedCenter.x - radius,
        maxX: normalizedCenter.x + radius,
        minY: normalizedCenter.y - radius,
        maxY: normalizedCenter.y + radius,
      }
    }

    return {
      minX: Math.max(this.config.minX, normalizedCenter.x - radius),
      maxX: Math.min(this.config.maxX, normalizedCenter.x + radius),
      minY: Math.max(this.config.minY, normalizedCenter.y - radius),
      maxY: Math.min(this.config.maxY, normalizedCenter.y + radius),
    }
  }

  getRadiusForScale(scale: MapScale, override?: number): number {
    if (override && override > 0) return override
    return MAP_SCALE_DEFAULT_RADIUS[scale]
  }

  get blockSize() {
    return this.config.blockSize
  }

  blockIdToRange(blockId: string, blockSize = this.config.blockSize): CoordinateRange {
    const match = blockId.trim().toUpperCase().match(/^K(\d{1,3})(\d{1,3})$/)
    if (!match) {
      throw new Error(`Invalid block id: ${blockId}`)
    }
    const [rawCol, rawRow] = [Number.parseInt(match[1]!, 10), Number.parseInt(match[2]!, 10)]
    if (Number.isNaN(rawCol) || Number.isNaN(rawRow)) {
      throw new Error(`Invalid block id: ${blockId}`)
    }
    const minX = this.config.minX + rawCol * blockSize
    const minY = this.config.minY + rawRow * blockSize
    const maxX = Math.min(minX + blockSize - 1, this.config.maxX)
    const maxY = Math.min(minY + blockSize - 1, this.config.maxY)
    if (minX > this.config.maxX || minY > this.config.maxY || maxX < this.config.minX || maxY < this.config.minY) {
      throw new Error(`Block ${blockId} is outside of world extent`)
    }
    return { minX, maxX, minY, maxY }
  }

  getBlocksForRange(range: CoordinateRange, blockSize = this.config.blockSize): string[] {
    const clampCoord = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
    const minX = clampCoord(range.minX, this.config.minX, this.config.maxX)
    const maxX = clampCoord(range.maxX, this.config.minX, this.config.maxX)
    const minY = clampCoord(range.minY, this.config.minY, this.config.maxY)
    const maxY = clampCoord(range.maxY, this.config.minY, this.config.maxY)

    const minCol = Math.floor((minX - this.config.minX) / blockSize)
    const maxCol = Math.floor((maxX - this.config.minX) / blockSize)
    const minRow = Math.floor((minY - this.config.minY) / blockSize)
    const maxRow = Math.floor((maxY - this.config.minY) / blockSize)
    const blocks: string[] = []

    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        blocks.push(`K${col}${row}`)
      }
    }
    return blocks
  }

  distanceBetween(a: Coordinate, b: Coordinate): number {
    if (this.config.toroidal) {
      const width = this.config.maxX - this.config.minX + 1
      const height = this.config.maxY - this.config.minY + 1
      const dx = Math.min(Math.abs(a.x - b.x), width - Math.abs(a.x - b.x))
      const dy = Math.min(Math.abs(a.y - b.y), height - Math.abs(a.y - b.y))
      return Math.hypot(dx, dy)
    }
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  toBlockId(coord: Coordinate, blockSize = this.config.blockSize): string {
    const normalized = this.normalize(coord)
    const offsetX = normalized.x - this.config.minX
    const offsetY = normalized.y - this.config.minY
    const col = Math.floor(offsetX / blockSize)
    const row = Math.floor(offsetY / blockSize)
    return `K${col}${row}`
  }

  sampleRoute(start: Coordinate, end: Coordinate, step = 1): Coordinate[] {
    const normalizedStart = this.normalize(start)
    const normalizedEnd = this.normalize(end)
    const dx = normalizedEnd.x - normalizedStart.x
    const dy = normalizedEnd.y - normalizedStart.y
    const distance = Math.max(Math.abs(dx), Math.abs(dy))
    if (distance === 0) return [normalizedStart]

    const increments = Math.max(1, Math.floor(distance / step))
    const samples: Coordinate[] = []
    for (let i = 0; i <= increments; i++) {
      const ratio = i / increments
      const coord = {
        x: Math.round(normalizedStart.x + dx * ratio),
        y: Math.round(normalizedStart.y + dy * ratio),
      }
      samples.push(this.config.toroidal ? this.wrap(coord) : this.normalize(coord))
    }
    return samples
  }

  private wrap(coord: Coordinate): Coordinate {
    const width = this.config.maxX - this.config.minX + 1
    const height = this.config.maxY - this.config.minY + 1
    const wrapAxis = (value: number, min: number, span: number) => {
      let offset = value - min
      offset = ((offset % span) + span) % span
      return min + offset
    }
    return {
      x: wrapAxis(coord.x, this.config.minX, width),
      y: wrapAxis(coord.y, this.config.minY, height),
    }
  }
}

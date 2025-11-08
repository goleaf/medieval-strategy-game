import type {
  MapTileType,
  VisionSharingScope as PrismaVisionSharingScope,
  VisionSourceType as PrismaVisionSourceType,
} from "@prisma/client"

export type Coordinate = {
  x: number
  y: number
}

export type CoordinateRange = {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export type CoveragePolygon = Coordinate[]

export type MapScale = "REGION" | "PROVINCE" | "WORLD"

export const MAP_SCALE_DEFAULT_RADIUS: Record<MapScale, number> = {
  REGION: 7, // 15x15 viewport
  PROVINCE: 50, // 100x100 viewport
  WORLD: 400, // full extent (−400..400 default)
}

export enum FogState {
  UNKNOWN = "UNKNOWN",
  KNOWN_STALE = "KNOWN_STALE",
  FRESH = "FRESH",
}

export type AttributeKey = "owner" | "population" | "wall" | "oasis" | "special"

export interface AttributeFreshnessEntry<T = unknown> {
  seenAt: string
  value?: T
  source?: string
}

export type AttributeFreshnessMap = Partial<Record<AttributeKey, AttributeFreshnessEntry>>

export interface CoverageHit {
  sourceId?: string
  sourceType: VisionSourceType
  sharingScope: VisionSharingScope
  expiresAt?: string | null
  sourceClass: string
}

export interface TileState {
  tileId?: string
  coordinate: Coordinate
  tileType: MapTileType
  state: FogState
  lastSeenAt?: string
  freshUntil?: string
  memoryExpiresAt?: string
  attributeFreshness: AttributeFreshnessMap
  sourceClasses: string[]
  metadata?: Record<string, unknown>
}

export type VisionSourceType = PrismaVisionSourceType
export type VisionSharingScope = PrismaVisionSharingScope

export interface VisionSourceInput {
  id?: string
  ownerPlayerId?: string
  ownerAllianceId?: string
  sourceType: VisionSourceType
  center: Coordinate
  radius: number
  freshUntil?: Date
  sharingScope: VisionSharingScope
  metadata?: Record<string, unknown>
}

export type ReconMissionType = "PATROL" | "PROBE"

export interface ReconMissionInput {
  id?: string
  ownerPlayerId?: string
  ownerAllianceId?: string
  missionType: ReconMissionType
  origin: Coordinate
  path: Coordinate[]
  destination: Coordinate
  launchAt: Date
  arrivalAt: Date
  burstRadius: number
  trailTTLSeconds: number
  burstTTLSeconds: number
  sharingScope: VisionSharingScope
  cooldownEndsAt?: Date
}

export type ContactSpeedBand = "SLOW" | "MEDIUM" | "FAST"
export type ContactStackBand = "TINY" | "SMALL" | "MEDIUM" | "LARGE"

export interface ContactLogInput {
  id?: string
  viewerPlayerId?: string
  viewerAllianceId?: string
  detectedAt: Date
  location: Coordinate
  directionVector: { dx: number; dy: number }
  speedBand: ContactSpeedBand
  stackBand: ContactStackBand
  confidence: number
  sourceClass: "PASSIVE" | "ACTIVE"
  expiresAt: Date
  signatureRoll: number
  metadata?: Record<string, unknown>
}

export type TTLTrackedEntityType = "TILE" | "RECON" | "CONTACT"

export interface TTLTrackerEntry {
  id?: string
  entityType: TTLTrackedEntityType
  entityId: string
  expiresAt: Date
  decayAction: Record<string, unknown>
}

export interface VisionQuery {
  gameWorldId: string
  viewerPlayerId?: string
  viewerAllianceId?: string
  center: Coordinate
  radius: number
  scale: MapScale
}

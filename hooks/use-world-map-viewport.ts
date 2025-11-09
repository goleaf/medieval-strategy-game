"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { Coordinate, CoordinateRange } from "@/lib/map-vision/types"

export interface ZoomLevel {
  id: string
  label: string
  tileSize: number
  heatmap?: boolean
  detailThreshold?: number
}

export interface UseWorldMapViewportOptions {
  extent: CoordinateRange
  zoomLevels: ZoomLevel[]
  initialCenter?: Coordinate
  initialZoomIndex?: number
  prefetchPaddingTiles?: number
}

export interface UseWorldMapViewportResult {
  center: Coordinate
  setCenter: (coord: Coordinate) => void
  zoomIndex: number
  zoomLevel: ZoomLevel
  setZoomIndex: (index: number) => void
  viewportSize: { width: number; height: number }
  setViewportSize: (size: { width: number; height: number }) => void
  tileSize: number
  visibleRange: CoordinateRange
  paddedRange: CoordinateRange
  panByPixels: (dx: number, dy: number) => void
  stepZoom: (direction: 1 | -1, anchor?: { x: number; y: number }) => void
  screenToCoordinate: (point: { x: number; y: number }) => Coordinate
  coordinateToScreen: (coord: Coordinate) => { x: number; y: number }
}

const DEFAULT_SIZE = { width: 1024, height: 768 }

export function useWorldMapViewport(options: UseWorldMapViewportOptions): UseWorldMapViewportResult {
  const { extent, zoomLevels, initialCenter, initialZoomIndex = 1, prefetchPaddingTiles = 12 } = options
  const [center, setCenterState] = useState<Coordinate>(() =>
    clampCoordinate(initialCenter ?? midpoint(extent), extent),
  )
  const [zoomIndex, setZoomIndexState] = useState(() => clampIndex(initialZoomIndex, zoomLevels.length))
  const [viewportSize, setViewportSize] = useState(DEFAULT_SIZE)

  useEffect(() => {
    setCenterState((prev) => clampCoordinate(prev, extent))
  }, [extent])

  const zoomLevel = zoomLevels[zoomIndex]
  const tileSize = zoomLevel.tileSize

  const visibleRange = useMemo(() => {
    const widthInTiles = viewportSize.width / tileSize
    const heightInTiles = viewportSize.height / tileSize
    const halfWidth = widthInTiles / 2
    const halfHeight = heightInTiles / 2
    return {
      minX: Math.max(extent.minX, Math.floor(center.x - halfWidth)),
      maxX: Math.min(extent.maxX, Math.ceil(center.x + halfWidth)),
      minY: Math.max(extent.minY, Math.floor(center.y - halfHeight)),
      maxY: Math.min(extent.maxY, Math.ceil(center.y + halfHeight)),
    }
  }, [center.x, center.y, extent.maxX, extent.maxY, extent.minX, extent.minY, tileSize, viewportSize.height, viewportSize.width])

  const paddedRange = useMemo(() => {
    return {
      minX: Math.max(extent.minX, visibleRange.minX - prefetchPaddingTiles),
      maxX: Math.min(extent.maxX, visibleRange.maxX + prefetchPaddingTiles),
      minY: Math.max(extent.minY, visibleRange.minY - prefetchPaddingTiles),
      maxY: Math.min(extent.maxY, visibleRange.maxY + prefetchPaddingTiles),
    }
  }, [extent.maxX, extent.maxY, extent.minX, extent.minY, prefetchPaddingTiles, visibleRange])

  const setCenter = useCallback(
    (next: Coordinate) => {
      setCenterState(clampCoordinate(next, extent))
    },
    [extent],
  )

  const panByPixels = useCallback(
    (dx: number, dy: number) => {
      if (tileSize === 0) return
      const deltaX = dx / tileSize
      const deltaY = dy / tileSize
      setCenterState((prev) =>
        clampCoordinate(
          {
            x: prev.x - deltaX,
            y: prev.y - deltaY,
          },
          extent,
        ),
      )
    },
    [extent, tileSize],
  )

  const setZoomIndex = useCallback(
    (index: number) => {
      setZoomIndexState(clampIndex(index, zoomLevels.length))
    },
    [zoomLevels.length],
  )

  const stepZoom = useCallback(
    (direction: 1 | -1, anchor?: { x: number; y: number }) => {
      setZoomIndexState((prev) => clampIndex(prev + direction, zoomLevels.length))
      if (!anchor) return
      const anchorCoord = screenToCoordinate(anchor, center, viewportSize, tileSize, extent)
      setCenter(anchorCoord)
    },
    [center, extent, setCenter, tileSize, viewportSize, zoomLevels.length],
  )

  const screenToCoordinateBound = useCallback(
    (point: { x: number; y: number }) => screenToCoordinate(point, center, viewportSize, tileSize, extent),
    [center, extent, tileSize, viewportSize],
  )

  const coordinateToScreenBound = useCallback(
    (coord: Coordinate) => coordinateToScreen(coord, center, viewportSize, tileSize),
    [center, tileSize, viewportSize],
  )

  return {
    center,
    setCenter,
    zoomIndex,
    zoomLevel,
    setZoomIndex,
    viewportSize,
    setViewportSize,
    tileSize,
    visibleRange,
    paddedRange,
    panByPixels,
    stepZoom,
    screenToCoordinate: screenToCoordinateBound,
    coordinateToScreen: coordinateToScreenBound,
  }
}

function clampCoordinate(coord: Coordinate, extent: CoordinateRange): Coordinate {
  return {
    x: Math.min(extent.maxX, Math.max(extent.minX, coord.x)),
    y: Math.min(extent.maxY, Math.max(extent.minY, coord.y)),
  }
}

function clampIndex(index: number, length: number): number {
  if (length === 0) return 0
  return Math.min(length - 1, Math.max(0, index))
}

function midpoint(extent: CoordinateRange): Coordinate {
  return {
    x: Math.round((extent.minX + extent.maxX) / 2),
    y: Math.round((extent.minY + extent.maxY) / 2),
  }
}

function screenToCoordinate(
  point: { x: number; y: number },
  center: Coordinate,
  viewportSize: { width: number; height: number },
  tileSize: number,
  extent: CoordinateRange,
): Coordinate {
  const offsetX = point.x - viewportSize.width / 2
  const offsetY = point.y - viewportSize.height / 2
  const tileOffsetX = offsetX / tileSize
  const tileOffsetY = offsetY / tileSize
  return clampCoordinate(
    {
      x: center.x + tileOffsetX,
      y: center.y + tileOffsetY,
    },
    extent,
  )
}

function coordinateToScreen(
  coord: Coordinate,
  center: Coordinate,
  viewportSize: { width: number; height: number },
  tileSize: number,
): { x: number; y: number } {
  const dx = coord.x - center.x
  const dy = coord.y - center.y
  return {
    x: viewportSize.width / 2 + dx * tileSize,
    y: viewportSize.height / 2 + dy * tileSize,
  }
}

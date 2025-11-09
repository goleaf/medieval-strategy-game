"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { CoordinateRange, Coordinate } from "@/lib/map-vision/types"

type PlayerProfileResponse = {
  success: boolean
  data?: {
    profile: {
      id: string
      playerName: string
      rank?: number | null
      tribe?: { id: string; tag: string | null; name: string | null } | null
      territory: {
        villages: Array<{ id: string; name: string; x: number; y: number; isCapital: boolean; points: number }>
        villageCount: number
        averageVillagePoints: number
        bounds: CoordinateRange
        expansionHistory?: Array<{ villageId: string; name: string; happenedAt: string; coordinate: { x: number; y: number }; type: "CONQUERED" | "EXPANDED" | "FOUNDED" }>
      } | null
    }
  }
  error?: string
}

type WorldVillage = {
  id: string
  name: string
  x: number
  y: number
  population: number
  playerId: string
  playerName: string
  tribeId: string | null
  tribeTag: string | null
  tribeName: string | null
  isBarbarian: boolean
  blockId: string
}

type WorldResponse = {
  success: boolean
  data?: {
    villages: WorldVillage[]
    blocks: Array<{ id: string; villageCount: number }>
    extent: CoordinateRange
  }
  error?: string
}

type OwnershipResponse = {
  success: boolean
  data?: {
    recentlyConquered: Array<{
      id: string
      name: string
      x: number
      y: number
      blockId: string
      population: number
      newOwner: { id: string; name: string; tribeTag: string | null }
      prevOwnerId: string | null
    }>
    recentlyAbandoned: Array<{
      id: string
      x: number
      y: number
      blockId: string
      villageId: string | null
      name: string | null
      population: number | null
      prevOwner: { id: string; name: string; tribeTag: string | null } | null
      spawnedAt: string
    }>
  }
  error?: string
}

export interface IntelPanelProps {
  authToken?: string | null
  origin?: { x: number; y: number; label?: string }
  onHighlightTribe?: (tag: string | null) => void
}

export function IntelPanel({ authToken, origin, onHighlightTribe }: IntelPanelProps) {
  const [playerQuery, setPlayerQuery] = useState("")
  const [playerProfile, setPlayerProfile] = useState<PlayerProfileResponse["data"]["profile"] | null>(null)
  const [loadingPlayer, setLoadingPlayer] = useState(false)
  const [playerSort, setPlayerSort] = useState<"distance" | "points" | "coords">("distance")

  const [tribeTag, setTribeTag] = useState("")
  const [world, setWorld] = useState<WorldVillage[] | null>(null)
  const [blockTotals, setBlockTotals] = useState<Record<string, number>>({})
  const [loadingWorld, setLoadingWorld] = useState(false)
  const [tribeProfile, setTribeProfile] = useState<{ id: string; name: string; tag: string; memberCount: number } | null>(null)
  const [loadingTribe, setLoadingTribe] = useState(false)

  const [ownership, setOwnership] = useState<OwnershipResponse["data"] | null>(null)
  const [loadingOwnership, setLoadingOwnership] = useState(false)
  const [selectedTargetIds, setSelectedTargetIds] = useState<Set<string>>(new Set())
  const [carryCapacity, setCarryCapacity] = useState(2000)
  const [tfMaxDistance, setTfMaxDistance] = useState(50)
  const [tfMinPoints, setTfMinPoints] = useState(0)
  const [tfMaxPoints, setTfMaxPoints] = useState(Number.MAX_SAFE_INTEGER)

  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : undefined

  const fetchPlayer = useCallback(async () => {
    if (!playerQuery.trim()) return
    setLoadingPlayer(true)
    try {
      const res = await fetch(`/api/players/profile?playerName=${encodeURIComponent(playerQuery.trim())}`, { headers })
      const json: PlayerProfileResponse = await res.json()
      if (!json.success || !json.data?.profile) {
        setPlayerProfile(null)
        return
      }
      setPlayerProfile(json.data.profile)
    } finally {
      setLoadingPlayer(false)
    }
  }, [headers, playerQuery])

  const allBlocksCsv = useMemo(() => {
    const items: string[] = []
    for (let col = 0; col < 10; col++) {
      for (let row = 0; row < 10; row++) {
        items.push(`K${col}${row}`)
      }
    }
    return items.join(",")
  }, [])

  const fetchWorld = useCallback(async () => {
    setLoadingWorld(true)
    try {
      const res = await fetch(`/api/map/world?blocks=${allBlocksCsv}`, { headers })
      const json: WorldResponse = await res.json()
      if (!json.success || !json.data) {
        setWorld(null)
        setBlockTotals({})
        return
      }
      setWorld(json.data.villages)
      const totals: Record<string, number> = {}
      json.data.blocks.forEach((b) => (totals[b.id] = b.villageCount))
      setBlockTotals(totals)
    } finally {
      setLoadingWorld(false)
    }
  }, [allBlocksCsv, headers])

  const fetchTribeProfile = useCallback(async () => {
    if (!tribeTag.trim()) return
    setLoadingTribe(true)
    try {
      const res = await fetch(`/api/tribes?tag=${encodeURIComponent(tribeTag.trim())}`)
      const json = await res.json()
      if (!json.success || !json.data?.tribe) {
        setTribeProfile(null)
        return
      }
      const t = json.data.tribe
      setTribeProfile({ id: t.id, name: t.name, tag: t.tag, memberCount: t._count?.members ?? (t.members?.length ?? 0) })
    } finally {
      setLoadingTribe(false)
    }
  }, [tribeTag])

  const fetchOwnership = useCallback(async () => {
    setLoadingOwnership(true)
    try {
      const res = await fetch(`/api/intel/ownership?hours=48`)
      const json: OwnershipResponse = await res.json()
      if (!json.success || !json.data) {
        setOwnership(null)
        return
      }
      setOwnership(json.data)
    } finally {
      setLoadingOwnership(false)
    }
  }, [])

  const playerVillagesSorted = useMemo(() => {
    if (!playerProfile?.territory?.villages) return []
    const list = [...playerProfile.territory.villages]
    if (playerSort === "distance" && origin) {
      list.sort((a, b) => {
        const da = Math.hypot(a.x - origin.x, a.y - origin.y)
        const db = Math.hypot(b.x - origin.x, b.y - origin.y)
        return da - db
      })
    } else if (playerSort === "points") {
      list.sort((a, b) => b.points - a.points)
    } else {
      list.sort((a, b) => (a.x - b.x) || (a.y - b.y))
    }
    return list
  }, [origin, playerProfile?.territory?.villages, playerSort])

  const tribeTerritory = useMemo(() => {
    if (!world || !tribeTag.trim()) return null
    const tag = tribeTag.trim().toLowerCase()
    const villages = world.filter((v) => v.tribeTag?.toLowerCase() === tag)
    const perBlock = villages.reduce<Record<string, number>>((acc, v) => {
      acc[v.blockId] = (acc[v.blockId] || 0) + 1
      return acc
    }, {})
    const blocks = Object.entries(perBlock)
      .map(([blockId, count]) => ({ blockId, count, total: blockTotals[blockId] || count }))
      .sort((a, b) => (b.count / Math.max(1, b.total)) - (a.count / Math.max(1, a.total)))
    return { villages, blocks }
  }, [blockTotals, tribeTag, world])

  const barbarianTargets = useMemo(() => {
    if (!world || !origin) return []
    const minPoints = tfMinPoints
    const maxPoints = tfMaxPoints
    return world
      .filter((v) => v.isBarbarian)
      .map((v) => ({ ...v, distance: Math.hypot(v.x - origin.x, v.y - origin.y) }))
      .filter((v) => v.distance <= tfMaxDistance && v.population >= minPoints && v.population <= maxPoints)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 50)
  }, [origin, tfMaxDistance, tfMaxPoints, tfMinPoints, world])

  const toggleTarget = (id: string) => {
    setSelectedTargetIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const bookmarkSelected = () => {
    if (!world) return
    const key = "world-map-bookmarks"
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null
    const list: Array<{ id: string; name: string; x: number; y: number; blockId: string; savedAt: number }> = raw ? JSON.parse(raw) : []
    const add = barbarianTargets.filter((t) => selectedTargetIds.has(t.id)).map((t) => ({ id: t.id, name: t.name, x: t.x, y: t.y, blockId: t.blockId, savedAt: Date.now() }))
    const map = new Map<string, { id: string; name: string; x: number; y: number; blockId: string; savedAt: number }>()
    ;[...add, ...list].forEach((e) => map.set(e.id, e))
    const next = Array.from(map.values()).slice(0, 100)
    if (typeof window !== "undefined") {
      window.localStorage.setItem(key, JSON.stringify(next))
    }
    setSelectedTargetIds(new Set())
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Player Intel</CardTitle>
          <CardDescription>Track a player’s villages and growth.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Input placeholder="Player name" value={playerQuery} onChange={(e) => setPlayerQuery(e.target.value)} />
            <Button variant="outline" onClick={fetchPlayer} disabled={loadingPlayer}>Lookup</Button>
          </div>
          {playerProfile && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{playerProfile.playerName}</Badge>
                {playerProfile.tribe?.tag && <Badge variant="outline">{playerProfile.tribe.tag}</Badge>}
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Villages: {playerProfile.territory?.villageCount ?? 0}</span>
                <span>Avg pts: {Math.round(playerProfile.territory?.averageVillagePoints ?? 0)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Sort:</span>
                <Button size="sm" variant={playerSort === "distance" ? "default" : "outline"} onClick={() => setPlayerSort("distance")} disabled={!origin}>Distance</Button>
                <Button size="sm" variant={playerSort === "points" ? "default" : "outline"} onClick={() => setPlayerSort("points")}>Points</Button>
                <Button size="sm" variant={playerSort === "coords" ? "default" : "outline"} onClick={() => setPlayerSort("coords")}>Coords</Button>
              </div>
              <div className="max-h-48 overflow-auto border rounded">
                <div className="grid grid-cols-[1fr_auto_auto] gap-2 p-2 text-xs font-semibold">
                  <span>Village</span><span>Coords</span><span>{origin ? "Dist" : "Pts"}</span>
                </div>
                {playerVillagesSorted.map((v) => (
                  <div key={v.id} className="grid grid-cols-[1fr_auto_auto] gap-2 p-2 text-xs border-t">
                    <span>{v.name}</span>
                    <span>({v.x}|{v.y})</span>
                    <span>
                      {origin ? Math.ceil(Math.hypot(v.x - origin.x, v.y - origin.y)) : v.points}
                    </span>
                  </div>
                ))}
              </div>
              {playerProfile.territory?.villages && playerProfile.territory.villages.length > 0 && (
                <div className="pt-1">
                  <div className="text-xs text-muted-foreground mb-1">Territory map</div>
                  <PlayerTerritoryMiniMap villages={playerProfile.territory.villages} />
                </div>
              )}
              {playerProfile.territory?.expansionHistory && (
                <div className="pt-2">
                  <div className="text-xs text-muted-foreground mb-1">Growth (expansion/conquest timeline)</div>
                  <GrowthSparkline events={playerProfile.territory.expansionHistory} />
                  <div className="text-xs mt-2">
                    <div className="font-semibold mb-1">Conquest history</div>
                    <div className="max-h-32 overflow-auto border rounded">
                      {playerProfile.territory.expansionHistory
                        .filter((e) => e.type === 'CONQUERED')
                        .slice(-20)
                        .reverse()
                        .map((e) => (
                          <div key={`${e.villageId}-${e.happenedAt}`} className="flex justify-between gap-2 p-2 border-b last:border-b-0">
                            <span>{e.name} ({e.coordinate.x}|{e.coordinate.y})</span>
                            <span>{new Date(e.happenedAt).toLocaleDateString()}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Tribe Territory</CardTitle>
          <CardDescription>Estimate presence across continents.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Input placeholder="Tribe tag (e.g. KOR)" value={tribeTag} onChange={(e) => setTribeTag(e.target.value)} />
            <Button variant="outline" onClick={fetchWorld} disabled={loadingWorld}>Compute</Button>
            <Button variant="outline" onClick={fetchTribeProfile} disabled={loadingTribe}>Profile</Button>
            <Button variant="outline" onClick={() => onHighlightTribe?.(tribeTag || null)}>Highlight</Button>
          </div>
          {tribeProfile && (
            <div className="text-xs flex gap-3">
              <Badge variant="secondary">{tribeProfile.tag}</Badge>
              <span>Members: {tribeProfile.memberCount}</span>
              {tribeTerritory && <span>Villages: {tribeTerritory.villages.length}</span>}
              {tribeTerritory && (
                <span>
                  Avg pts: {
                    Math.round(
                      (tribeTerritory.villages.reduce((s, v) => s + (v.population || 0), 0) /
                        Math.max(1, tribeTerritory.villages.length)) || 0,
                    )
                  }
                </span>
              )}
            </div>
          )}
          {tribeTerritory && (
            <div className="space-y-2 text-xs">
              <div className="flex gap-2">
                <Badge variant="secondary">Villages: {tribeTerritory.villages.length}</Badge>
              </div>
              <div className="max-h-48 overflow-auto border rounded">
                <div className="grid grid-cols-[auto_auto_auto] gap-2 p-2 font-semibold">
                  <span>Continent</span><span>Tribe</span><span>Share</span>
                </div>
                {tribeTerritory.blocks.slice(0, 20).map((b) => (
                  <div key={b.blockId} className="grid grid-cols-[auto_auto_auto] gap-2 p-2 border-t">
                    <span>{b.blockId}</span>
                    <span>{b.count}</span>
                    <span>{Math.round((b.count / Math.max(1, b.total)) * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Recent Changes</CardTitle>
          <CardDescription>Conquests and abandoned villages (48h).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchOwnership} disabled={loadingOwnership}>Refresh</Button>
          </div>
          {ownership && (
            <div className="grid gap-3 text-xs md:grid-cols-2">
              <div>
                <div className="font-semibold mb-1">Recently conquered</div>
                <div className="max-h-40 overflow-auto border rounded">
                  {ownership.recentlyConquered.map((v) => (
                    <div key={v.id} className="flex justify-between gap-2 p-2 border-b last:border-b-0">
                      <span>{v.name} ({v.x}|{v.y})</span>
                      <span>{v.newOwner.name}{v.newOwner.tribeTag ? ` [${v.newOwner.tribeTag}]` : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-semibold mb-1">Abandoned</div>
                <div className="max-h-40 overflow-auto border rounded">
                  {ownership.recentlyAbandoned.map((b) => (
                    <div key={b.id} className="flex justify-between gap-2 p-2 border-b last:border-b-0">
                      <span>({b.x}|{b.y})</span>
                      <span>{b.prevOwner ? b.prevOwner.name : "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {origin && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Target Finder</CardTitle>
            <CardDescription>Nearby barbarian villages (≤50 tiles by default).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!world && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={fetchWorld} disabled={loadingWorld}>Load world snapshot</Button>
              </div>
            )}
            {world && (
              <>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={bookmarkSelected} disabled={selectedTargetIds.size === 0}>Add selected to bookmarks</Button>
                  <span className="text-xs text-muted-foreground self-center">{selectedTargetIds.size} selected</span>
                  <Input type="number" className="w-20" value={tfMaxDistance} onChange={(e) => setTfMaxDistance(Number(e.target.value) || 0)} placeholder="Max dist" />
                  <Input type="number" className="w-24" value={tfMinPoints} onChange={(e) => setTfMinPoints(Number(e.target.value) || 0)} placeholder="Min pts" />
                  <Input type="number" className="w-24" value={Number.isFinite(tfMaxPoints) ? tfMaxPoints : 0} onChange={(e) => setTfMaxPoints(Number(e.target.value) || 0)} placeholder="Max pts" />
                  <Input type="number" className="w-28" value={carryCapacity} onChange={(e) => setCarryCapacity(Number(e.target.value) || 0)} placeholder="Carry cap" />
                </div>
                <div className="max-h-56 overflow-auto border rounded text-xs">
                  <div className="grid grid-cols-[auto_auto_auto_auto_auto_auto] gap-2 p-2 font-semibold">
                    <span></span><span>Coords</span><span>Points</span><span>Dist</span><span>Est Res</span><span>Owner</span>
                  </div>
                  {barbarianTargets.map((v) => {
                    const est = estimateResources(v.population)
                    const effective = Math.min(est, carryCapacity)
                    return (
                      <label key={v.id} className="grid grid-cols-[auto_auto_auto_auto_auto_auto] gap-2 p-2 border-t items-center">
                        <input type="checkbox" className="h-3 w-3" checked={selectedTargetIds.has(v.id)} onChange={() => toggleTarget(v.id)} />
                        <span>({v.x}|{v.y})</span>
                        <span>{v.population}</span>
                        <span>{Math.ceil(v.distance)}</span>
                        <span>{effective.toLocaleString()}</span>
                        <span>{v.tribeTag ? v.tribeTag : "Barb"}</span>
                      </label>
                    )
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Raid Calculator</CardTitle>
          <CardDescription>Estimate plunderable resources from village points.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <RaidCalculator />
        </CardContent>
      </Card>

      {origin && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Noble Target Selector</CardTitle>
            <CardDescription>Valuable non‑barbarian targets near your origin.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!world && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={fetchWorld} disabled={loadingWorld}>Load world snapshot</Button>
              </div>
            )}
            {world && (
              <NobleSelector origin={origin} world={world} />
            )}
          </CardContent>
        </Card>
      )}

      {origin && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Front‑Line Identifier</CardTitle>
            <CardDescription>Find border villages between two tribes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!world && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={fetchWorld} disabled={loadingWorld}>Load world snapshot</Button>
              </div>
            )}
            {world && (
              <FrontLineTool world={world} />
            )}
          </CardContent>
        </Card>
      )}

      {origin && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Vulnerability Scanner</CardTitle>
            <CardDescription>Scout‑based difficulty for nearby targets.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <VulnerabilityScanner origin={origin} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function PlayerTerritoryMiniMap({ villages }: { villages: Array<{ x: number; y: number }> }) {
  const [canvasRef, setCanvasRef] = useState<HTMLCanvasElement | null>(null)
  useEffect(() => {
    const canvas = canvasRef
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    const width = 180
    const height = 100
    const ratio = window.devicePixelRatio || 1
    canvas.width = width * ratio
    canvas.height = height * ratio
    ctx.resetTransform()
    ctx.scale(ratio, ratio)
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = "#0b1220"
    ctx.fillRect(0, 0, width, height)

    const minX = 0
    const minY = 0
    const maxX = 999
    const maxY = 999
    const scaleX = width / (maxX - minX)
    const scaleY = height / (maxY - minY)

    ctx.fillStyle = "#60a5fa"
    villages.forEach((v) => {
      const x = (v.x - minX) * scaleX
      const y = (v.y - minY) * scaleY
      ctx.fillRect(x, y, 2, 2)
    })
  }, [canvasRef, villages])

  return <canvas ref={setCanvasRef} width={180} height={100} className="w-[180px] h-[100px] rounded border" />
}

function GrowthSparkline({ events }: { events: Array<{ happenedAt: string }> }) {
  const [ref, setRef] = useState<HTMLCanvasElement | null>(null)
  useEffect(() => {
    if (!ref) return
    const ctx = ref.getContext('2d')
    if (!ctx) return
    const width = 180
    const height = 50
    const ratio = window.devicePixelRatio || 1
    ref.width = width * ratio
    ref.height = height * ratio
    ctx.resetTransform()
    ctx.scale(ratio, ratio)
    ctx.clearRect(0, 0, width, height)

    if (events.length === 0) return
    const dates = events.map((e) => new Date(e.happenedAt).getTime())
    dates.sort((a, b) => a - b)
    const minT = dates[0]!
    const maxT = dates[dates.length - 1]!
    const span = Math.max(1, maxT - minT)
    const counts: Array<{ x: number; y: number }> = []
    let count = 0
    dates.forEach((t, i) => {
      count += 1
      const x = ((t - minT) / span) * (width - 4) + 2
      const y = height - 4 - (count / dates.length) * (height - 8)
      counts.push({ x, y })
    })
    ctx.strokeStyle = '#60a5fa'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    counts.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y) })
    ctx.stroke()
  }, [events, ref])
  return <canvas ref={setRef} width={180} height={50} className="w-[180px] h-[50px] rounded border" />
}

function estimateResources(points: number): number {
  // Simple heuristic: scale resources with points
  // Tweak factor as needed; prefer intel payload when available.
  return Math.round(points * 30)
}

function RaidCalculator() {
  const [points, setPoints] = useState(500)
  const [carry, setCarry] = useState(2000)
  const est = estimateResources(points)
  const haul = Math.min(est, carry)
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <div className="text-muted-foreground">Village points</div>
        <Input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value) || 0)} className="w-28" />
      </div>
      <div>
        <div className="text-muted-foreground">Carry capacity</div>
        <Input type="number" value={carry} onChange={(e) => setCarry(Number(e.target.value) || 0)} className="w-28" />
      </div>
      <div className="ml-2">
        <div className="text-muted-foreground">Est. resources</div>
        <div className="font-semibold">{est.toLocaleString()}</div>
      </div>
      <div>
        <div className="text-muted-foreground">Plunder (cap)</div>
        <div className="font-semibold">{haul.toLocaleString()}</div>
      </div>
    </div>
  )
}

function NobleSelector({ origin, world }: { origin: Coordinate; world: WorldVillage[] }) {
  const [minPoints, setMinPoints] = useState(200)
  const [maxDistance, setMaxDistance] = useState(30)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const villages = useMemo(() => {
    return world
      .filter((v) => !v.isBarbarian)
      .map((v) => ({ ...v, distance: Math.hypot(v.x - origin.x, v.y - origin.y) }))
      .filter((v) => v.distance <= maxDistance && v.population >= minPoints)
      .sort((a, b) => (a.distance - b.distance) || (b.population - a.population))
      .slice(0, 100)
  }, [origin, world, minPoints, maxDistance])

  const toggle = (id: string) => setSelected((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  const addBookmarks = () => {
    const key = "world-map-bookmarks"
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null
    const list: any[] = raw ? JSON.parse(raw) : []
    const add = villages.filter((v) => selected.has(v.id)).map((v) => ({ id: v.id, name: v.name, x: v.x, y: v.y, blockId: v.blockId, savedAt: Date.now() }))
    const map = new Map<string, any>(); [...add, ...list].forEach((e) => map.set(e.id, e))
    if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify(Array.from(map.values()).slice(0, 200)))
    setSelected(new Set())
  }

  return (
    <div className="space-y-2 text-xs">
      <div className="flex gap-2">
        <Input type="number" value={minPoints} onChange={(e) => setMinPoints(Number(e.target.value) || 0)} placeholder="Min points" />
        <Input type="number" value={maxDistance} onChange={(e) => setMaxDistance(Number(e.target.value) || 0)} placeholder="Max distance" />
        <Button variant="outline" size="sm" onClick={addBookmarks} disabled={selected.size === 0}>Bookmark selected</Button>
        <span className="self-center text-muted-foreground">{selected.size} selected</span>
      </div>
      <div className="max-h-56 overflow-auto border rounded">
        <div className="grid grid-cols-[auto_auto_auto_auto_auto] gap-2 p-2 font-semibold">
          <span></span><span>Coords</span><span>Pts</span><span>Dist</span><span>Owner</span>
        </div>
        {villages.map((v) => (
          <label key={v.id} className="grid grid-cols-[auto_auto_auto_auto_auto] gap-2 p-2 border-t items-center">
            <input type="checkbox" className="h-3 w-3" checked={selected.has(v.id)} onChange={() => toggle(v.id)} />
            <span>({v.x}|{v.y})</span>
            <span>{v.population}</span>
            <span>{Math.ceil(v.distance)}</span>
            <span>{v.playerName}{v.tribeTag ? ` [${v.tribeTag}]` : ''}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function FrontLineTool({ world }: { world: WorldVillage[] }) {
  const [tribeA, setTribeA] = useState("")
  const [tribeB, setTribeB] = useState("")
  const [radius, setRadius] = useState(20)
  const [pairs, setPairs] = useState<Array<{ id: string; x: number; y: number; enemy: string; dist: number }>>([])

  const compute = () => {
    const A = world.filter((v) => v.tribeTag?.toLowerCase() === tribeA.trim().toLowerCase())
    const B = world.filter((v) => v.tribeTag?.toLowerCase() === tribeB.trim().toLowerCase())
    const result: Array<{ id: string; x: number; y: number; enemy: string; dist: number }> = []
    // Naive: for each A, check nearest B within radius
    for (const a of A) {
      let best = { dist: Number.POSITIVE_INFINITY, enemy: "" }
      for (const b of B) {
        const d = Math.hypot(a.x - b.x, a.y - b.y)
        if (d < best.dist) best = { dist: d, enemy: `${b.playerName}${b.tribeTag ? ` [${b.tribeTag}]` : ''}` }
      }
      if (best.dist <= radius) result.push({ id: a.id, x: a.x, y: a.y, enemy: best.enemy, dist: best.dist })
    }
    result.sort((p, q) => p.dist - q.dist)
    setPairs(result.slice(0, 200))
  }

  return (
    <div className="space-y-2 text-xs">
      <div className="flex gap-2">
        <Input placeholder="Tribe A" value={tribeA} onChange={(e) => setTribeA(e.target.value)} />
        <Input placeholder="Tribe B" value={tribeB} onChange={(e) => setTribeB(e.target.value)} />
        <Input type="number" value={radius} onChange={(e) => setRadius(Number(e.target.value) || 0)} />
        <Button variant="outline" onClick={compute}>Compute</Button>
      </div>
      <div className="max-h-56 overflow-auto border rounded">
        <div className="grid grid-cols-[auto_auto_auto] gap-2 p-2 font-semibold">
          <span>Coords</span><span>Nearest Enemy</span><span>Dist</span>
        </div>
        {pairs.map((p) => (
          <div key={p.id} className="grid grid-cols-[auto_auto_auto] gap-2 p-2 border-t">
            <span>({p.x}|{p.y})</span>
            <span>{p.enemy}</span>
            <span>{Math.ceil(p.dist)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function VulnerabilityScanner({ origin }: { origin: Coordinate }) {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [maxDistance, setMaxDistance] = useState(40)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports/intel?playerId=temp-player-id`)
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setReports(json.data)
      } else {
        setReports([])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const entries = useMemo(() => {
    return reports
      .map((r) => {
        const dx = (r.defender?.x ?? 0) - origin.x
        const dy = (r.defender?.y ?? 0) - origin.y
        const distance = Math.hypot(dx, dy)
        const troop = r.summary?.troopCount ?? null
        const wall = r.summary?.wallLevel ?? null
        const rating = troop == null ? "unknown" : troop < 200 && (wall == null || wall <= 3) ? "easy" : troop < 1200 ? "medium" : "hard"
        return {
          id: r.id,
          coords: r.defender?.coordsLabel ?? "",
          distance,
          lastScouted: r.resolvedAt,
          troop,
          wall,
          rating,
        }
      })
      .filter((e) => e.distance <= maxDistance)
      .sort((a, b) => a.distance - b.distance)
  }, [maxDistance, origin, reports])

  return (
    <div className="space-y-2 text-xs">
      <div className="flex gap-2">
        <Button variant="outline" onClick={load} disabled={loading}>Load scout intel</Button>
        <Input type="number" value={maxDistance} onChange={(e) => setMaxDistance(Number(e.target.value) || 0)} />
      </div>
      <div className="max-h-56 overflow-auto border rounded">
        <div className="grid grid-cols-[auto_auto_auto_auto] gap-2 p-2 font-semibold">
          <span>Coords</span><span>Dist</span><span>Defenses</span><span>Rating</span>
        </div>
        {entries.map((e) => (
          <div key={e.id} className="grid grid-cols-[auto_auto_auto_auto] gap-2 p-2 border-t">
            <span>{e.coords}</span>
            <span>{Math.ceil(e.distance)}</span>
            <span>{e.troop ?? "?"} troops{e.wall != null ? `, wall ${e.wall}` : ""}</span>
            <span className={e.rating === 'easy' ? 'text-green-600' : e.rating === 'hard' ? 'text-red-600' : 'text-yellow-600'}>{e.rating}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

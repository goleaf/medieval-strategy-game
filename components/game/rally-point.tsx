"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Shield, Settings, Info, SendHorizontal, RefreshCw, Loader2, Crosshair, Target, AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"

interface AvailableTroop {
  id: string
  type: string
  quantity: number
}

interface RallyPointMovement {
  id: string
  mission: "attack" | "raid" | "reinforce" | "siege" | "return"
  ownerAccountId: string
  fromVillageId: string
  toVillageId: string | null
  toTileX: number
  toTileY: number
  departAt: string
  arriveAt: string
  payload: {
    units: Record<string, number>
    catapultTargets?: string[]
    metadata?: Record<string, unknown>
  }
  status: "scheduled" | "en_route" | "resolved" | "returning" | "done" | "cancelled"
  createdBy: "player" | "route" | "system"
  idempotencyKey?: string
  waveGroupId?: string
  waveMemberId?: string
}

interface RallyPointProps {
  villageId: string
  ownerAccountId?: string
  isCapital: boolean
  troopEvasionEnabled: boolean
  onEvasionToggle: (enabled: boolean) => Promise<void>
  hasGoldClub: boolean
  availableTroops: AvailableTroop[]
}

const missionOptions: Array<{ label: string; value: RallyPointMovement["mission"] }> = [
  { label: "Attack", value: "attack" },
  { label: "Raid", value: "raid" },
  { label: "Reinforce", value: "reinforce" },
  { label: "Siege", value: "siege" },
]

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Unknown"
  return date.toLocaleString()
}

function summarizeUnits(units: Record<string, number>) {
  const parts = Object.entries(units)
    .filter(([, count]) => count > 0)
    .map(([unit, count]) => `${count} ${unit}`)
  return parts.length ? parts.join(", ") : "None"
}

export function RallyPoint({
  villageId,
  ownerAccountId,
  isCapital,
  troopEvasionEnabled,
  onEvasionToggle,
  hasGoldClub,
  availableTroops,
}: RallyPointProps) {
  const { toast } = useToast()

  const [missionType, setMissionType] = useState<RallyPointMovement["mission"]>("attack")
  const [targetMode, setTargetMode] = useState<"coords" | "village">("coords")
  const [targetVillageId, setTargetVillageId] = useState("")
  const [targetX, setTargetX] = useState("")
  const [targetY, setTargetY] = useState("")
  const [arriveAt, setArriveAt] = useState("")
  const [catapultTargets, setCatapultTargets] = useState("")
  const [unitSelection, setUnitSelection] = useState<Record<string, number>>({})
  const [warnings, setWarnings] = useState<string[]>([])
  const [sending, setSending] = useState(false)

  const [outgoingMovements, setOutgoingMovements] = useState<RallyPointMovement[]>([])
  const [incomingMovements, setIncomingMovements] = useState<RallyPointMovement[]>([])
  const [movementsLoading, setMovementsLoading] = useState(false)
  const [movementError, setMovementError] = useState<string | null>(null)
  const [cancellingMovementId, setCancellingMovementId] = useState<string | null>(null)
  const [garrison, setGarrison] = useState<Record<string, number>>({})
  const [recallUnits, setRecallUnits] = useState<Record<string, number>>({})
  const [recallTargetVillageId, setRecallTargetVillageId] = useState<string>("")
  const [myVillages, setMyVillages] = useState<Array<{ id: string; name: string }>>([])
  const [recalling, setRecalling] = useState(false)

  const [evasionLoading, setEvasionLoading] = useState(false)

  const mergedTroops = useMemo(() => {
    const map = new Map<string, number>()
    for (const troop of availableTroops) {
      map.set(troop.type, (map.get(troop.type) ?? 0) + troop.quantity)
    }
    return Array.from(map.entries()).map(([type, quantity]) => ({ type, quantity }))
  }, [availableTroops])

  useEffect(() => {
    setUnitSelection((prev) => {
      const next: Record<string, number> = {}
      for (const [unit, count] of Object.entries(prev)) {
        if (mergedTroops.some((entry) => entry.type === unit)) {
          const max = mergedTroops.find((entry) => entry.type === unit)?.quantity ?? 0
          next[unit] = Math.min(count, max)
        }
      }
      return next
    })
  }, [mergedTroops])

  const hasUnitsSelected = useMemo(() => Object.values(unitSelection).some((count) => count > 0), [unitSelection])
  const targetIsValid = useMemo(() => {
    if (targetMode === "village") {
      return targetVillageId.trim().length > 0
    }
    return targetX.trim() !== "" && targetY.trim() !== ""
  }, [targetMode, targetVillageId, targetX, targetY])

  const canSend = Boolean(ownerAccountId && hasUnitsSelected && targetIsValid && !sending)

  const fetchMovements = useCallback(async () => {
    setMovementsLoading(true)
    setMovementError(null)
    try {
      const paramsOutgoing = new URLSearchParams({ villageId, direction: "outgoing", limit: "25" })
      const paramsIncoming = new URLSearchParams({ villageId, direction: "incoming", limit: "25" })
      const [outgoingRes, incomingRes] = await Promise.all([
        fetch(`/api/rally-point/movements?${paramsOutgoing.toString()}`),
        fetch(`/api/rally-point/movements?${paramsIncoming.toString()}`),
      ])

      const outgoingJson = await outgoingRes.json()
      const incomingJson = await incomingRes.json()

      if (!outgoingJson.success) throw new Error(outgoingJson.error || "Failed to load outgoing movements")
      if (!incomingJson.success) throw new Error(incomingJson.error || "Failed to load incoming movements")

      setOutgoingMovements(outgoingJson.data || [])
      setIncomingMovements(incomingJson.data || [])
    } catch (error) {
      setMovementError(error instanceof Error ? error.message : "Unable to load movements")
    } finally {
      setMovementsLoading(false)
    }
  }, [villageId])

  useEffect(() => {
    fetchMovements()
    const interval = setInterval(fetchMovements, 10000)
    return () => {
      clearInterval(interval)
    }
  }, [fetchMovements])

  // Load my stationed garrison at this village and my villages for recall target
  useEffect(() => {
    const run = async () => {
      try {
        // Garrisons
        const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null
        const headers = token ? { Authorization: `Bearer ${token}` } : {}
        const gRes = await fetch(`/api/rally-point/garrisons?villageId=${encodeURIComponent(villageId)}`, { headers })
        const gJson = await gRes.json()
        if (gJson?.success && gJson.data?.stacks) {
          const map: Record<string, number> = {}
          for (const s of gJson.data.stacks as Array<{ unitTypeId: string; count: number }>) {
            map[s.unitTypeId] = s.count
          }
          setGarrison(map)
          setRecallUnits(map)
        }
        // My villages for recall destination
        if (ownerAccountId) {
          const vRes = await fetch(`/api/villages?playerId=${ownerAccountId}`)
          const vJson = await vRes.json()
          if (vJson?.success && Array.isArray(vJson.data)) {
            setMyVillages(vJson.data.map((v: any) => ({ id: v.id, name: v.name })))
            if (vJson.data.length && !recallTargetVillageId) {
              setRecallTargetVillageId(vJson.data[0].id)
            }
          }
        }
      } catch {}
    }
    run()
  }, [villageId, ownerAccountId])

  const handleEvasionToggleInternal = async (checked: boolean) => {
    setEvasionLoading(true)
    try {
      await onEvasionToggle(checked)
    } catch (error) {
      toast({ title: "Failed to update troop evasion", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" })
    } finally {
      setEvasionLoading(false)
    }
  }

  const handleUnitChange = (unit: string, value: number) => {
    setUnitSelection((prev) => {
      const max = mergedTroops.find((entry) => entry.type === unit)?.quantity ?? 0
      const clamped = Math.max(0, Math.min(max, Number.isFinite(value) ? value : 0))
      const next = { ...prev }
      if (clamped === 0) delete next[unit]
      else next[unit] = clamped
      return next
    })
  }

  const handleSetMax = (unit: string) => {
    const max = mergedTroops.find((entry) => entry.type === unit)?.quantity ?? 0
    setUnitSelection((prev) => ({ ...prev, [unit]: max }))
  }

  const handleSendMission = async () => {
    if (!ownerAccountId) {
      toast({ title: "Login required", description: "You must be signed in to send missions", variant: "destructive" })
      return
    }
    if (!hasUnitsSelected || !targetIsValid) {
      toast({ title: "Incomplete order", description: "Select units and a valid target before sending", variant: "destructive" })
      return
    }

    const payloadUnits = Object.fromEntries(
      Object.entries(unitSelection)
        .filter(([, count]) => count > 0)
        .map(([unit, count]) => [unit, Math.floor(count)]),
    )

    const target =
      targetMode === "village"
        ? { type: "village", villageId: targetVillageId.trim() }
        : { type: "coords", x: Number(targetX), y: Number(targetY) }

    if (targetMode === "coords" && (!Number.isFinite(target.x) || !Number.isFinite(target.y))) {
      toast({ title: "Invalid coordinates", description: "Please enter numeric X and Y targets", variant: "destructive" })
      return
    }

    const catapultList = catapultTargets
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)

    setSending(true)
    try {
      const body = {
        sourceVillageId: villageId,
        sourceAccountId: ownerAccountId,
        mission: missionType,
        target,
        units: payloadUnits,
        catapultTargets: catapultList.length ? catapultList : undefined,
        arriveAt: arriveAt ? new Date(arriveAt).toISOString() : undefined,
        idempotencyKey: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      }

      const res = await fetch("/api/rally-point/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error || "Failed to send mission")
      }

      setWarnings(json.data?.warnings ?? [])
      toast({ title: "Mission dispatched", description: `Your ${missionType} is en route.` })
      setArriveAt("")
      fetchMovements()
    } catch (error) {
      toast({ title: "Mission failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" })
    } finally {
      setSending(false)
    }
  }

  const handleCancelMovement = async (movementId: string) => {
    if (!ownerAccountId) return
    setCancellingMovementId(movementId)
    try {
      const res = await fetch(`/api/rally-point/movements/${movementId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerAccountId }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error || "Unable to cancel movement")
      toast({ title: "Movement cancelled" })
      fetchMovements()
    } catch (error) {
      toast({ title: "Failed to cancel", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" })
    } finally {
      setCancellingMovementId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Rally Point - {isCapital ? "Capital" : "Village"} Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Management</h3>
                <p className="text-sm text-muted-foreground">Configure your rally point settings and troop management options.</p>
              </div>
              <Settings className="w-5 h-5 text-muted-foreground" />
            </div>

            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Troop Evasion (Gold Club Feature)
              </h4>

              {!hasGoldClub ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>Troop Evasion is a Gold Club premium feature. Upgrade to Gold Club to access this feature.</AlertDescription>
                </Alert>
              ) : !isCapital ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>Troop Evasion is only available for capital villages.</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="troop-evasion"
                      checked={troopEvasionEnabled}
                      onCheckedChange={(value) => handleEvasionToggleInternal(Boolean(value))}
                      disabled={evasionLoading}
                    />
                    <label htmlFor="troop-evasion" className="text-sm font-medium leading-none">
                      Activate troop evasion for your capital
                    </label>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      <strong>How it works:</strong> When an attack is incoming, your troops automatically leave the capital to avoid being destroyed.
                    </p>
                    <p>
                      <strong>Return time:</strong> Troops return 180 seconds (3 minutes) after evasion.
                    </p>
                    <p>
                      <strong>Important:</strong> Only troops trained in the capital will evade. Reinforcements from other players will NOT evade.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <CardTitle className="flex items-center gap-2">
            <SendHorizontal className="w-5 h-5" />
            Dispatch Mission
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {ownerAccountId ? (
              <span>Commander: {ownerAccountId.slice(0, 6)}…</span>
            ) : (
              <span className="text-amber-600">Sign in to issue commands</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {warnings.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Warnings</AlertTitle>
              <AlertDescription className="space-y-1">
                {warnings.map((warning) => (
                  <p key={warning}>{warning}</p>
                ))}
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Mission Type</Label>
              <Select value={missionType} onValueChange={(value: RallyPointMovement["mission"]) => setMissionType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mission" />
                </SelectTrigger>
                <SelectContent>
                  {missionOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Arrival (Optional)</Label>
              <Input type="datetime-local" value={arriveAt} onChange={(event) => setArriveAt(event.target.value)} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={targetMode === "coords" ? "default" : "outline"}
                onClick={() => setTargetMode("coords")}
                className="gap-1"
              >
                <Crosshair className="w-4 h-4" /> Coords
              </Button>
              <Button
                type="button"
                size="sm"
                variant={targetMode === "village" ? "default" : "outline"}
                onClick={() => setTargetMode("village")}
                className="gap-1"
              >
                <Target className="w-4 h-4" /> Village ID
              </Button>
            </div>

            {targetMode === "coords" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="target-x">Target X</Label>
                  <Input id="target-x" type="number" value={targetX} onChange={(event) => setTargetX(event.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="target-y">Target Y</Label>
                  <Input id="target-y" type="number" value={targetY} onChange={(event) => setTargetY(event.target.value)} />
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <Label htmlFor="target-village">Village ID</Label>
                <Input id="target-village" value={targetVillageId} onChange={(event) => setTargetVillageId(event.target.value)} placeholder="ex: clt2z6g1b0005y42k5u3f9m01" />
              </div>
            )}
          </div>

          {(missionType === "attack" || missionType === "siege") && (
            <div className="space-y-2">
              <Label htmlFor="catapult-targets">Catapult Targets (comma separated)</Label>
              <Input
                id="catapult-targets"
                value={catapultTargets}
                onChange={(event) => setCatapultTargets(event.target.value)}
                placeholder="e.g. warehouse,granary"
              />
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Unit Composition</Label>
              <span className="text-xs text-muted-foreground">
                Selected: {Object.values(unitSelection).reduce((sum, count) => sum + count, 0).toLocaleString()} units
              </span>
            </div>
            {mergedTroops.length === 0 ? (
              <p className="text-sm text-muted-foreground">No troops available in this village.</p>
            ) : (
              <div className="space-y-3">
                {mergedTroops.map((troop) => (
                  <div key={troop.type} className="grid gap-2 sm:grid-cols-[1fr_auto_auto] items-center">
                    <div>
                      <Label className="text-sm">{troop.type}</Label>
                      <p className="text-xs text-muted-foreground">Available: {troop.quantity.toLocaleString()}</p>
                    </div>
                    <Input
                      type="number"
                      min={0}
                      max={troop.quantity}
                      value={unitSelection[troop.type] ?? ""}
                      onChange={(event) => handleUnitChange(troop.type, Number(event.target.value))}
                    />
                    <Button variant="secondary" size="sm" type="button" onClick={() => handleSetMax(troop.type)}>
                      Max
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button disabled={!canSend} onClick={handleSendMission} className="gap-2">
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <SendHorizontal className="w-4 h-4" />}
              <span>Send Mission</span>
            </Button>
            <Button type="button" variant="outline" onClick={fetchMovements} className="gap-2">
              <RefreshCw className="w-4 h-4" /> Refresh Movements
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Outgoing Movements</CardTitle>
            <Button variant="ghost" size="icon" onClick={fetchMovements}>
              <RefreshCw className={movementsLoading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {movementError && (
              <Alert variant="destructive">
                <AlertTitle>Unable to load movements</AlertTitle>
                <AlertDescription>{movementError}</AlertDescription>
              </Alert>
            )}
            {outgoingMovements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No outgoing movements.</p>
            ) : (
              <div className="space-y-3">
                {outgoingMovements.map((movement) => (
                  <div key={movement.id} className="border rounded p-3 text-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold capitalize">{movement.mission}</div>
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">{movement.status}</span>
                    </div>
                    <p>Arrive: {formatDateTime(movement.arriveAt)}</p>
                    <p>Target: ({movement.toTileX}, {movement.toTileY})</p>
                    <p className="text-xs text-muted-foreground">Units: {summarizeUnits(movement.payload.units)}</p>
                    {movement.status === "en_route" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={cancellingMovementId === movement.id}
                        onClick={() => handleCancelMovement(movement.id)}
                        className="gap-2"
                      >
                        {cancellingMovementId === movement.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancel"}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recall stationed reinforcements (owned by me at this village) */}
        <Card>
          <CardHeader>
            <CardTitle>Your Stationed Reinforcements Here</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(garrison).length === 0 ? (
              <p className="text-sm text-muted-foreground">No reinforcements from your account are stationed in this village.</p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.entries(garrison).map(([unit, count]) => (
                    <div key={unit} className="flex items-center justify-between gap-2">
                      <div className="text-sm">
                        <span className="font-medium">{unit}</span> — <span className="text-muted-foreground">{count}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          className="h-8 w-24"
                          value={recallUnits[unit] ?? 0}
                          onChange={(e) => setRecallUnits((prev) => ({ ...prev, [unit]: Math.max(0, parseInt(e.target.value || '0', 10)) }))}
                        />
                        <Button variant="outline" size="sm" onClick={() => setRecallUnits((prev) => ({ ...prev, [unit]: count }))}>Max</Button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Return to</Label>
                  <select className="border rounded h-9 px-2 bg-background" value={recallTargetVillageId} onChange={(e) => setRecallTargetVillageId(e.target.value)}>
                    {myVillages.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={async () => {
                      const payloadUnits: Record<string, number> = {}
                      for (const [unit, count] of Object.entries(recallUnits)) {
                        const n = Math.max(0, Math.min(garrison[unit] ?? 0, Math.floor(count)))
                        if (n > 0) payloadUnits[unit] = n
                      }
                      const total = Object.values(payloadUnits).reduce((a, b) => a + b, 0)
                      if (!total) {
                        toast({ title: 'No units selected', description: 'Set quantities to recall.', variant: 'destructive' })
                        return
                      }
                      if (!recallTargetVillageId) {
                        toast({ title: 'Select destination', description: 'Choose a village to return to.', variant: 'destructive' })
                        return
                      }
                      setRecalling(true)
                      try {
                        const token = localStorage.getItem('authToken')
                        const res = await fetch('/api/rally-point/reinforcements/recall', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                          body: JSON.stringify({
                            fromVillageId: villageId,
                            toVillageId: recallTargetVillageId,
                            ownerAccountId: ownerAccountId,
                            units: payloadUnits,
                            idempotencyKey: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
                          })
                        })
                        const json = await res.json()
                        if (!res.ok || !json.success) throw new Error(json.error || 'Recall failed')
                        toast({ title: 'Recall dispatched', description: 'Your reinforcements are returning.' })
                        // Refresh stacks
                        const gRes = await fetch(`/api/rally-point/garrisons?villageId=${encodeURIComponent(villageId)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
                        const gJson = await gRes.json()
                        if (gJson?.success && gJson.data?.stacks) {
                          const map: Record<string, number> = {}
                          for (const s of gJson.data.stacks as Array<{ unitTypeId: string; count: number }>) map[s.unitTypeId] = s.count
                          setGarrison(map)
                          setRecallUnits(map)
                        }
                        fetchMovements()
                      } catch (e) {
                        toast({ title: 'Recall failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' })
                      } finally {
                        setRecalling(false)
                      }
                    }}
                    disabled={recalling}
                  >
                    {recalling ? 'Recalling…' : 'Recall Selected'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Incoming Movements</CardTitle>
            <Button variant="ghost" size="icon" onClick={fetchMovements}>
              <RefreshCw className={movementsLoading ? "w-4 h-4 animate-spin" : "w-4 h-4"} />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {incomingMovements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No incoming movements detected.</p>
            ) : (
              <div className="space-y-3">
                {incomingMovements.map((movement) => (
                  <div key={movement.id} className="border rounded p-3 text-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold capitalize">{movement.mission}</div>
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">{movement.status}</span>
                    </div>
                    <p>Arrive: {formatDateTime(movement.arriveAt)}</p>
                    <p>Origin: {movement.fromVillageId}</p>
                    <p className="text-xs text-muted-foreground">Units: {summarizeUnits(movement.payload.units)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

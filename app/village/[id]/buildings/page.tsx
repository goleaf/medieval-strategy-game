"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, Zap } from "lucide-react"
import { BuildingQueue } from "@/components/game/building-queue"
import { TextTable } from "@/components/game/text-table"
import { CountdownTimer } from "@/components/game/countdown-timer"
import { Button } from "@/components/ui/button"
import { CONSTRUCTION_CONFIG, type ConstructionEntityKey } from "@/lib/config/construction"
import { getBlueprintKeyForType, getDisplayNameFromType, getTypeForBlueprint } from "@/lib/config/building-blueprint-map"

type VillageWithBuildings = {
  id: string
  name: string
  wood: number
  stone: number
  iron: number
  gold: number
  food: number
  buildings: Array<{
    id: string
    type: string
    level: number
    isBuilding: boolean
    completionAt: string | null
    queuePosition: number | null
    isDemolishing: boolean
    demolitionAt: string | null
    demolitionMode: string | null
    research?: { isResearching: boolean } | null
  }>
  buildQueueTasks: Array<{
    id: string
    buildingId: string | null
    entityKey: string
    fromLevel: number
    toLevel: number
    status: string
    position: number
    startedAt: string | null
    finishesAt: string | null
  }>
  player?: {
    beginnerProtectionUntil?: string | null
    hasGoldClubMembership?: boolean
    goldClubExpiresAt?: string | null
  }
}

function getBuildingImage(type: string): string {
  const imageMap: Record<string, string> = {
    HEADQUARTER: "/buildings/headquarter.svg",
    MARKETPLACE: "/buildings/marketplace.svg",
    BARRACKS: "/buildings/barracks.svg",
    STABLES: "/buildings/stables.svg",
    WATCHTOWER: "/buildings/watchtower.svg",
    WALL: "/buildings/wall.svg",
    WAREHOUSE: "/buildings/warehouse.svg",
    GRANARY: "/buildings/granary.svg",
    SAWMILL: "/buildings/sawmill.svg",
    QUARRY: "/buildings/quarry.svg",
    IRON_MINE: "/buildings/iron_mine.svg",
    TREASURY: "/buildings/treasury.svg",
    ACADEMY: "/buildings/academy.svg",
    TEMPLE: "/buildings/temple.svg",
    HOSPITAL: "/buildings/hospital.svg",
    FARM: "/buildings/farm.svg",
    SNOB: "/buildings/snob.svg",
    // Huns-specific buildings
    COMMAND_CENTER: "/buildings/command_center.svg",
    MAKESHIFT_WALL: "/buildings/makeshift_wall.svg",
  }
  return imageMap[type] || "/placeholder.svg"
}

// Building costs (should match BuildingService.BUILDING_COSTS)
const BUILDING_COSTS: Record<string, Record<string, number>> = {
  HEADQUARTER: { wood: 100, stone: 100, iron: 50, gold: 20, food: 100 },
  MARKETPLACE: { wood: 150, stone: 150, iron: 100, gold: 50, food: 150 },
  BARRACKS: { wood: 200, stone: 100, iron: 150, gold: 0, food: 200 },
  STABLES: { wood: 250, stone: 150, iron: 200, gold: 50, food: 250 },
  WATCHTOWER: { wood: 100, stone: 200, iron: 100, gold: 0, food: 100 },
  WALL: { wood: 50, stone: 300, iron: 50, gold: 0, food: 50 },
  WAREHOUSE: { wood: 300, stone: 200, iron: 100, gold: 0, food: 300 },
  GRANARY: { wood: 200, stone: 150, iron: 50, gold: 0, food: 200 },
  SAWMILL: { wood: 100, stone: 100, iron: 50, gold: 0, food: 100 },
  QUARRY: { wood: 100, stone: 100, iron: 50, gold: 0, food: 100 },
  IRON_MINE: { wood: 100, stone: 100, iron: 100, gold: 0, food: 100 },
  TREASURY: { wood: 200, stone: 200, iron: 200, gold: 100, food: 200 },
  ACADEMY: { wood: 300, stone: 300, iron: 200, gold: 100, food: 300 },
  TEMPLE: { wood: 250, stone: 250, iron: 100, gold: 50, food: 250 },
  HOSPITAL: { wood: 200, stone: 200, iron: 150, gold: 0, food: 200 },
  FARM: { wood: 150, stone: 100, iron: 50, gold: 0, food: 150 },
  SNOB: { wood: 500, stone: 500, iron: 500, gold: 500, food: 500 },
}

type Requirement = { type: string; level: number }
type RequirementStatus = Requirement & { label: string; met: boolean }
type DependencyCard = { type: string; name: string; requirements: RequirementStatus[] }

const ADDITIONAL_REQUIREMENTS: Record<string, Requirement[]> = {
  SNOB: [{ type: "ACADEMY", level: 1 }],
}

const BLUEPRINTS = CONSTRUCTION_CONFIG.buildingBlueprints

function formatBuildingName(type: string): string {
  return getDisplayNameFromType(type) || type
}

function getRequirementsForType(type: string): Requirement[] {
  const requirements: Requirement[] = []
  const normalizedType = type.toUpperCase()
  const blueprintKey = getBlueprintKeyForType(normalizedType)
  if (blueprintKey) {
    const blueprint = BLUEPRINTS[blueprintKey]
    if (blueprint?.prerequisites) {
      for (const [key, value] of Object.entries(blueprint.prerequisites)) {
        const requirementLevel = typeof value === "number" ? value : Number(value)
        if (!requirementLevel) continue
        const normalizedType = (getTypeForBlueprint(key as ConstructionEntityKey) ?? key).toUpperCase()
        requirements.push({ type: normalizedType, level: requirementLevel })
      }
    }
  }
  if (ADDITIONAL_REQUIREMENTS[normalizedType]) {
    requirements.push(
      ...ADDITIONAL_REQUIREMENTS[normalizedType].map((req) => ({
        type: req.type.toUpperCase(),
        level: req.level,
      })),
    )
  }
  return requirements
}

function buildRequirementStatuses(
  type: string,
  levelMap: Map<string, number>,
): RequirementStatus[] {
  return getRequirementsForType(type).map((requirement) => {
    const normalizedType = requirement.type.toUpperCase()
    const currentLevel = levelMap.get(normalizedType) ?? 0
    const label = `${formatBuildingName(normalizedType)} level ${requirement.level}`
    return {
      ...requirement,
      label,
      met: currentLevel >= requirement.level,
    }
  })
}

function summarizeMissingRequirements(statuses: RequirementStatus[]): string[] {
  return statuses.filter((status) => !status.met).map((status) => status.label)
}

function getMaxLevelForType(type: string): number {
  const blueprintKey = getBlueprintKeyForType(type)
  if (blueprintKey) {
    const blueprint = BLUEPRINTS[blueprintKey]
    if (blueprint?.maxLevel) {
      return blueprint.maxLevel
    }
  }
  return 30
}

export default function BuildingsPage() {
  const params = useParams()
  const villageId = params.id as string
  const [village, setVillage] = useState<VillageWithBuildings | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [completionMessage, setCompletionMessage] = useState<string | null>(null)
  const previousActiveTasksRef = useRef<string[]>([])
  const completionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { requirementStatusByType, dependencyCards } = useMemo(() => {
    if (!village) {
      return {
        requirementStatusByType: new Map<string, RequirementStatus[]>(),
        dependencyCards: [] as DependencyCard[],
      }
    }

    const levelMap = new Map<string, number>()
    village.buildings.forEach((building) => {
      const type = building.type.toUpperCase()
      const current = levelMap.get(type) ?? 0
      levelMap.set(type, Math.max(current, building.level))
    })

    const seen = new Set<string>()
    const statusMap = new Map<string, RequirementStatus[]>()
    const cards: DependencyCard[] = []

    village.buildings.forEach((building) => {
      const type = building.type.toUpperCase()
      if (seen.has(type)) return
      seen.add(type)
      const statuses = buildRequirementStatuses(type, levelMap)
      statusMap.set(type, statuses)
      if (statuses.length > 0) {
        cards.push({ type, name: formatBuildingName(type), requirements: statuses })
      }
    })

    cards.sort((a, b) => a.name.localeCompare(b.name))

    return { requirementStatusByType: statusMap, dependencyCards: cards }
  }, [village])

  const fetchVillage = useCallback(async () => {
    try {
      const res = await fetch("/api/villages?playerId=temp-player-id")
      const data = await res.json()
      if (data.success && data.data) {
        const found = data.data.find((v: any) => v.id === villageId)
        setVillage(found || null)
      }
    } catch (error) {
      console.error("Failed to fetch village:", error)
    }
  }, [villageId])

  const handleUpgrade = async (buildingId: string) => {
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const res = await fetch("/api/buildings/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buildingId }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess("Building upgrade started!")
        setTimeout(() => setSuccess(null), 5000)
        await fetchVillage()
      } else {
        setError(data.error || "Failed to upgrade building")
        setTimeout(() => setError(null), 5000)
      }
    } catch (error) {
      console.error("Failed to upgrade building:", error)
      setError("Failed to upgrade building. Please try again.")
      setTimeout(() => setError(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  const handleStartDemolition = async (buildingId: string, buildingName: string) => {
    const confirmation = window.confirm(
      `Demolishing ${buildingName} permanently removes its current level, cancels any training that was running there, and cannot be undone. Proceed?`,
    )
    if (!confirmation) return

    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const res = await fetch("/api/buildings/demolish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buildingId, mode: "LEVEL_BY_LEVEL" }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess("Demolition queued")
        setTimeout(() => setSuccess(null), 5000)
        await fetchVillage()
      } else {
        setError(data.error || "Failed to start demolition")
        setTimeout(() => setError(null), 5000)
      }
    } catch (err) {
      console.error("Failed to start demolition:", err)
      setError("Failed to start demolition. Please try again.")
      setTimeout(() => setError(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelDemolition = async (buildingId: string) => {
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const res = await fetch("/api/buildings/demolish", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buildingId }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess("Demolition cancelled")
        setTimeout(() => setSuccess(null), 5000)
        await fetchVillage()
      } else {
        setError(data.error || "Failed to cancel demolition")
        setTimeout(() => setError(null), 5000)
      }
    } catch (err) {
      console.error("Failed to cancel demolition:", err)
      setError("Failed to cancel demolition. Please try again.")
      setTimeout(() => setError(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (buildingId: string) => {
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const res = await fetch("/api/buildings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buildingId }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess("Construction cancelled")
        setTimeout(() => setSuccess(null), 5000)
        await fetchVillage()
      } else {
        setError(data.error || "Failed to cancel construction")
        setTimeout(() => setError(null), 5000)
      }
    } catch (err) {
      console.error("Failed to cancel construction:", err)
      setError("Failed to cancel construction. Please try again.")
      setTimeout(() => setError(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  const handleSpeedUp = async (buildingId: string) => {
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const res = await fetch("/api/buildings/speed-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buildingId }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess("Construction finished instantly")
        setTimeout(() => setSuccess(null), 5000)
        await fetchVillage()
      } else {
        setError(data.error || "Failed to speed up construction")
        setTimeout(() => setError(null), 5000)
      }
    } catch (err) {
      console.error("Failed to speed up construction:", err)
      setError("Unable to speed up construction. Please try again.")
      setTimeout(() => setError(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  const handleInstantComplete = async () => {
    if (!village) return
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const res = await fetch("/api/villages/instant-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ villageId: village.id }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess("All constructions completed instantly")
        setTimeout(() => setSuccess(null), 5000)
        await fetchVillage()
      } else {
        setError(data.error || "Failed to complete instantly")
        setTimeout(() => setError(null), 5000)
      }
    } catch (err) {
      console.error("Failed to instant complete:", err)
      setError("Instant completion failed. Please try again.")
      setTimeout(() => setError(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  const hasPremiumAccess = Boolean(
    village?.player?.hasGoldClubMembership &&
      (!village.player?.goldClubExpiresAt || new Date(village.player.goldClubExpiresAt) > new Date())
  )

  const demolitionBuildings = village?.buildings.filter((building) => building.isDemolishing && building.demolitionAt) ?? []

  const checkInsufficientResources = (buildingType: string) => {
    if (!village) return null
    const costs = BUILDING_COSTS[buildingType]
    if (!costs) return null

    const insufficient: string[] = []
    if (village.wood < costs.wood) insufficient.push("wood")
    if (village.stone < costs.stone) insufficient.push("stone")
    if (village.iron < costs.iron) insufficient.push("iron")
    if (village.gold < costs.gold) insufficient.push("gold")
    if (village.food < costs.food) insufficient.push("food")

    return insufficient.length > 0 ? insufficient : null
  }

  const calculateRequiredExchange = (buildingType: string, insufficientResources: string[]) => {
    if (!village) return []
    const costs = BUILDING_COSTS[buildingType]
    const exchanges: Array<{from: string, to: string, amount: number}> = []

    // Simple logic: try to exchange from available resources to needed ones
    const availableResources = ["wood", "stone", "iron", "gold", "food"].filter(
      resource => !insufficientResources.includes(resource)
    )

    insufficientResources.forEach(needed => {
      const neededAmount = costs[needed as keyof typeof costs]
      const currentAmount = village[needed as keyof typeof village] as number
      const requiredAmount = Math.max(0, neededAmount - currentAmount)

      if (requiredAmount > 0 && availableResources.length > 0) {
        // Use the first available resource as source
        const fromResource = availableResources[0]
        exchanges.push({
          from: fromResource.toUpperCase(),
          to: needed.toUpperCase(),
          amount: Math.min(requiredAmount, village[fromResource as keyof typeof village] as number)
        })
      }
    })

    return exchanges
  }

  const handleNpcMerchantExchange = async (fromResource: string, toResource: string, amount: number) => {
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      const res = await fetch("/api/market/npc-merchant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          villageId,
          fromResource,
          toResource,
          amount,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(`Successfully exchanged ${amount} ${fromResource} for ${amount} ${toResource}!`)
        setTimeout(() => setSuccess(null), 5000)
        await fetchVillage()
      } else {
        setError(data.error || "Failed to exchange resources")
        setTimeout(() => setError(null), 5000)
      }
    } catch (error) {
      console.error("Failed to exchange resources:", error)
      setError("Failed to exchange resources. Please try again.")
      setTimeout(() => setError(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVillage()
    const interval = setInterval(fetchVillage, 10000)
    return () => {
      clearInterval(interval)
    }
  }, [fetchVillage])

  useEffect(() => {
    if (!village) return
    const currentActive = village.buildQueueTasks
      .filter((task) => task.status === "BUILDING")
      .map((task) => task.id)
    const previousActive = previousActiveTasksRef.current
    const completed = previousActive.filter((taskId) => !currentActive.includes(taskId))
    if (previousActive.length > 0 && completed.length > 0) {
      setCompletionMessage("Construction completed!")
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current)
      }
      completionTimeoutRef.current = setTimeout(() => setCompletionMessage(null), 5000)
    }
    previousActiveTasksRef.current = currentActive
  }, [village])

  useEffect(() => {
    return () => {
      if (completionTimeoutRef.current) {
        clearTimeout(completionTimeoutRef.current)
      }
    }
  }, [])

  if (!village) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">Village not found</p>
          <Link href="/dashboard">
            <Button>Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href={`/village/${villageId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Buildings - {village.name}</h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="w-full p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {error && (
            <div className="bg-destructive/10 border border-destructive rounded p-3 flex items-center justify-between">
              <span className="text-destructive text-sm">❌ {error}</span>
              <button onClick={() => setError(null)} className="text-destructive hover:text-destructive/80 text-sm">✕</button>
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500 rounded p-3 flex items-center justify-between">
              <span className="text-green-600 text-sm">✅ {success}</span>
              <button onClick={() => setSuccess(null)} className="text-green-600 hover:text-green-600/80 text-sm">✕</button>
            </div>
          )}
          {completionMessage && (
            <div className="bg-blue-500/10 border border-blue-500 rounded p-3 flex items-center justify-between">
              <span className="text-blue-600 text-sm">🔔 {completionMessage}</span>
              <button onClick={() => setCompletionMessage(null)} className="text-blue-600 hover:text-blue-600/80 text-sm">✕</button>
            </div>
          )}
          {loading && <div className="text-center py-4">Processing...</div>}
          <BuildingQueue
            tasks={village.buildQueueTasks}
            activeResearchCount={village.buildings.filter((b) => (b as any).research?.isResearching).length}
            villageId={village.id}
            onCancel={handleCancel}
            onSpeedUp={handleSpeedUp}
            canUsePremiumSpeed={hasPremiumAccess}
            onInstantComplete={fetchVillage}
          />

          <section className="bg-secondary/50 border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Demolitions</h3>
                <p className="text-sm text-muted-foreground">
                  Demolitions run much faster than construction (~10% of the build timer) and return no resources. Any active training on the building is cancelled.
                </p>
              </div>
            </div>
            {demolitionBuildings.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No demolitions are currently running.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {demolitionBuildings.map((building) => (
                  <div
                    key={building.id}
                    className="flex items-center justify-between rounded border border-border bg-destructive/10 p-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <Image
                        src={getBuildingImage(building.type)}
                        alt={building.type}
                        width={32}
                        height={32}
                        className="object-contain"
                      />
                      <div>
                        <div className="font-semibold">
                          {formatBuildingName(building.type)} (Level {building.level})
                        </div>
                        {building.demolitionAt && (
                          <div className="text-xs text-muted-foreground">
                            Completes in <CountdownTimer targetDate={building.demolitionAt} />
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCancelDemolition(building.id)}
                      className="text-xs"
                    >
                      Cancel Demolition
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Instant Completion Section */}
          <section className="bg-secondary/50 border border-border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  Instant Completion
                </h3>
                <p className="text-sm text-muted-foreground">
                  Instantly complete all ongoing constructions and research in this village
                </p>
              </div>
              <Button
                onClick={handleInstantComplete}
                disabled={loading || village.buildQueueTasks.length === 0}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Complete All
              </Button>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">All Buildings</h2>
            <p className="text-sm text-muted-foreground mb-3">Upgrade caps follow each blueprint (typically level 30); meet the requirements outlined below to unlock the next stage.</p>
            <TextTable
              headers={["Building", "Type", "Level", "Status", "Actions"]}
              rows={village.buildings.map((building) => {
                const requirementStatuses = requirementStatusByType.get(building.type.toUpperCase()) ?? []
                const missingRequirements = summarizeMissingRequirements(requirementStatuses)
                const isUnlocked = missingRequirements.length === 0
                const buttonDisabled = building.isBuilding || !isUnlocked
                const buttonTitle = !isUnlocked
                  ? `Requires ${missingRequirements.join(", ")}`
                  : building.isBuilding
                    ? "Building in progress"
                    : undefined
                const maxLevel = getMaxLevelForType(building.type)

                const statusNode = building.isBuilding && building.completionAt ? (
                  <span key={`status-${building.id}`} className="text-sm">
                    Building: <CountdownTimer targetDate={building.completionAt} />
                  </span>
                ) : building.isDemolishing && building.demolitionAt ? (
                  <span key={`status-${building.id}`} className="text-sm text-destructive">
                    Demolishing: <CountdownTimer targetDate={building.demolitionAt} />
                  </span>
                ) : isUnlocked ? (
                  <span className="text-sm text-emerald-600">Ready (max {maxLevel})</span>
                ) : (
                  <span className="text-xs text-destructive">
                    Locked: {missingRequirements.join(", ")}
                  </span>
                )

                return [
                  <div key={`image-${building.id}`} className={`flex items-center justify-center ${isUnlocked ? "" : "opacity-60"}`}>
                    <Image
                      src={getBuildingImage(building.type)}
                      alt={building.type}
                      width={48}
                      height={48}
                      className="object-contain"
                    />
                  </div>,
                  formatBuildingName(building.type),
                  `${building.level}/${maxLevel}`,
                  statusNode,
                  <div key={`actions-${building.id}`} className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpgrade(building.id)}
                      disabled={buttonDisabled}
                      title={buttonTitle}
                      className={isUnlocked ? "" : "border-dashed"}
                    >
                      <Zap className="w-4 h-4" />
                      {building.isBuilding ? "Building..." : isUnlocked ? "Upgrade" : "Locked"}
                    </Button>

                    {requirementStatuses.length > 0 && (
                      <ul className="text-[11px] leading-tight text-muted-foreground">
                        {requirementStatuses.map((req) => (
                          <li key={`${building.id}-${req.type}-${req.level}`} className={req.met ? "text-emerald-600" : "text-muted-foreground"}>
                            {req.met ? "✓" : "○"} {req.label}
                          </li>
                        ))}
                      </ul>
                    )}

                    {(() => {
                      const insufficientResources = checkInsufficientResources(building.type)
                      if (insufficientResources && !building.isBuilding) {
                        const exchanges = calculateRequiredExchange(building.type, insufficientResources)
                        return exchanges.length > 0 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const exchange = exchanges[0]
                              handleNpcMerchantExchange(exchange.from, exchange.to, exchange.amount)
                            }}
                            className="text-xs"
                          >
                            💰 Exchange ({exchanges[0].amount})
                          </Button>
                        ) : null
                      }
                      return null
                    })()}
                    {!building.isDemolishing && building.level > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStartDemolition(building.id, formatBuildingName(building.type))}
                        title="Demolish this building level permanently"
                        className="text-xs border-destructive text-destructive"
                      >
                        Demolish
                      </Button>
                    )}
                  </div>,
                ]
              })}
            />
          </section>

          <section>
            <h2 className="text-lg font-bold mb-2">Technology Tree</h2>
            {dependencyCards.length === 0 ? (
              <p className="text-sm text-muted-foreground">No dependencies to show yet.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {dependencyCards.map((card) => (
                  <div key={card.type} className="rounded-lg border border-border bg-secondary/40 p-3">
                    <div className="text-sm font-semibold">{card.name}</div>
                    <ul className="mt-2 space-y-1 text-xs">
                      {card.requirements.map((req) => (
                        <li
                          key={`${card.type}-${req.type}-${req.level}`}
                          className={`flex items-center gap-2 ${req.met ? "text-emerald-600" : "text-destructive"}`}
                        >
                          <span>{req.met ? "✓" : "!"}</span>
                          <span>{req.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

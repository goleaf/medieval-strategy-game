"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { X, Coins, Timer } from "lucide-react"
import { CountdownTimer } from "./countdown-timer"

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
  }
  return imageMap[type] || "/placeholder.svg"
}

export interface QueueTask {
  id: string
  buildingId: string | null
  entityKey: string
  fromLevel: number
  toLevel: number
  status: string
  position: number
  finishesAt: string | Date | null
  startedAt: string | Date | null
}

interface BuildingQueueProps {
  tasks: QueueTask[]
  activeResearchCount?: number
  onCancel?: (buildingId: string) => void
  onSpeedUp?: (buildingId: string) => void
  canUsePremiumSpeed?: boolean
  villageId?: string
  onInstantComplete?: () => void
}

export function BuildingQueue({
  tasks,
  activeResearchCount = 0,
  onCancel,
  onSpeedUp,
  canUsePremiumSpeed = false,
  villageId,
  onInstantComplete,
}: BuildingQueueProps) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const queuedTasks = tasks.filter((task) => task.status !== "DONE" && task.status !== "CANCELLED")
  const activeBuilds = queuedTasks.filter((task) => task.status === "BUILDING").length
  const totalActiveItems = activeBuilds + activeResearchCount

  const handleInstantComplete = async () => {
    if (!villageId || totalActiveItems === 0) return

    try {
      const response = await fetch("/api/villages/instant-complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ villageId }),
      })

      const data = await response.json()

      if (data.success) {
        alert(`Successfully completed ${data.data.completedBuildings} constructions and ${data.data.completedResearch} research orders for ${data.data.totalGoldCost} gold!`)
        onInstantComplete?.()
      } else {
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error("Instant completion failed:", error)
      alert("Failed to complete constructions instantly")
    }
  }

  const sortedTasks = useMemo(() => queuedTasks.sort((a, b) => a.position - b.position), [queuedTasks])
  const activeTask = sortedTasks.find((task) => task.status === "BUILDING")
  const pendingTasks = sortedTasks.filter((task) => task.id !== activeTask?.id)
  const activeProgress = activeTask ? getProgress(activeTask) : 0

  const getProgress = (task: QueueTask): number => {
    if (!task.startedAt || !task.finishesAt) return 0
    const start = new Date(task.startedAt).getTime()
    const finish = new Date(task.finishesAt).getTime()
    if (finish <= start) return 0
    const clampedNow = Math.min(Math.max(now, start), finish)
    return (clampedNow - start) / (finish - start)
  }

  const renderQueueEmpty = () => (
    <div className="rounded border border-border bg-secondary/40 p-3 text-sm text-muted-foreground">
      No buildings in queue
    </div>
  )

  const renderProgressBar = (progress: number) => (
    <div className="mt-2 h-2 w-full rounded bg-muted">
      <div
        className="h-2 rounded bg-emerald-500 transition-[width] duration-500"
        style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
      />
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Construction Queue</h3>
        {totalActiveItems > 0 && villageId && (
          <button
            onClick={handleInstantComplete}
            className="flex items-center gap-2 rounded bg-yellow-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-yellow-700"
            title={`Complete all ${totalActiveItems} active constructions and research instantly (Cost: ${totalActiveItems * 2} Gold)`}
          >
            <Coins className="w-3 h-3" />
            Complete Instantly ({totalActiveItems * 2} Gold)
          </button>
        )}
      </div>

      <section className="rounded border border-border bg-secondary/40 p-3">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Timer className="h-4 w-4 text-muted-foreground" />
          Current Construction
        </div>
        {!activeTask && (
          <p className="mt-2 text-sm text-muted-foreground">No building is currently under construction.</p>
        )}
        {activeTask && (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <Image
                src={getBuildingImage(activeTask.entityKey.toUpperCase())}
                alt={activeTask.entityKey}
                width={36}
                height={36}
                className="object-contain"
              />
              <div className="flex-1 text-sm">
                <div className="font-semibold uppercase tracking-wide">
                  {activeTask.entityKey} L{activeTask.fromLevel} → L{activeTask.toLevel}
                </div>
                {activeTask.finishesAt && (
                  <div className="text-xs text-muted-foreground">
                    Completes in <CountdownTimer targetDate={activeTask.finishesAt} />
                  </div>
                )}
                {renderProgressBar(activeProgress)}
                <div className="mt-1 text-xs text-muted-foreground">Progress {(activeProgress * 100).toFixed(1)}%</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {onCancel && activeTask.buildingId && activeProgress <= 0.1 && (
                <button
                  onClick={() => onCancel(activeTask.buildingId!)}
                  className="inline-flex items-center gap-1 rounded border border-border bg-destructive px-3 py-1 text-xs font-semibold text-white hover:bg-destructive/80"
                >
                  <X className="h-3 w-3" />
                  Cancel (90% refund)
                </button>
              )}
              {canUsePremiumSpeed && onSpeedUp && activeTask.buildingId && (
                <button
                  onClick={() => onSpeedUp(activeTask.buildingId!)}
                  className="inline-flex items-center gap-1 rounded border border-border bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600"
                >
                  <Coins className="h-3 w-3" />
                  Speed Up (2 Gold)
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      <section>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Queue</h4>
        {pendingTasks.length === 0 ? (
          renderQueueEmpty()
        ) : (
          <div className="space-y-2">
            {pendingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between rounded border border-border bg-secondary/30 p-2 text-sm"
              >
                <div className="flex items-center gap-3">
                  <Image
                    src={getBuildingImage(task.entityKey.toUpperCase())}
                    alt={task.entityKey}
                    width={28}
                    height={28}
                    className="object-contain"
                  />
                  <div>
                    <div className="font-semibold uppercase tracking-wide">
                      {task.entityKey} L{task.fromLevel} → L{task.toLevel}
                    </div>
                    <div className="text-xs text-muted-foreground">Queue #{task.position} · Waiting for slot</div>
                  </div>
                </div>
                {onCancel && task.buildingId && (
                  <button
                    onClick={() => onCancel(task.buildingId!)}
                    className="ml-2 inline-flex items-center gap-1 rounded border border-border bg-destructive px-2 py-1 text-xs font-semibold text-white hover:bg-destructive/80"
                  >
                    <X className="h-3 w-3" />
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

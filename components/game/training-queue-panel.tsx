"use client"

import { useEffect, useMemo, useState } from "react"
import { TrainingBuilding, TrainingStatus } from "@prisma/client"

import { Button } from "@/components/ui/button"
import { CountdownTimer } from "@/components/game/countdown-timer"

const BUILDING_LABELS: Record<TrainingBuilding, string> = {
  [TrainingBuilding.BARRACKS]: "Barracks",
  [TrainingBuilding.STABLE]: "Stables",
  [TrainingBuilding.WORKSHOP]: "Workshop",
  [TrainingBuilding.RESIDENCE]: "Residence",
  [TrainingBuilding.PALACE]: "Palace",
}

const BUILDING_ORDER: TrainingBuilding[] = [
  TrainingBuilding.BARRACKS,
  TrainingBuilding.STABLE,
  TrainingBuilding.WORKSHOP,
  TrainingBuilding.RESIDENCE,
  TrainingBuilding.PALACE,
]

export interface TrainingQueueEntry {
  id: string
  building: TrainingBuilding
  count: number
  unitTypeId: string
  unitType?: { displayName?: string | null } | null
  startAt: string
  finishAt: string
  status: TrainingStatus
}

interface TrainingQueuePanelProps {
  queue: TrainingQueueEntry[]
  onCancel: (queueItemId: string) => Promise<void>
}

function formatUnitName(entry: TrainingQueueEntry): string {
  if (entry.unitType?.displayName) {
    return entry.unitType.displayName
  }
  return entry.unitTypeId
    .split("_")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1).toLowerCase())
    .join(" ")
}

export function TrainingQueuePanel({ queue, onCancel }: TrainingQueuePanelProps) {
  const [now, setNow] = useState(() => Date.now())
  const [pendingJobId, setPendingJobId] = useState<string | null>(null)

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const totalUnits = useMemo(() => queue.reduce((sum, job) => sum + job.count, 0), [queue])

  const grouped = useMemo(() => {
    const map = new Map<TrainingBuilding, { active?: TrainingQueueEntry; waiting: TrainingQueueEntry[] }>()
    for (const building of BUILDING_ORDER) {
      map.set(building, { waiting: [] })
    }
    for (const job of queue) {
      const bucket = map.get(job.building) ?? { waiting: [] }
      if (job.status === TrainingStatus.TRAINING) {
        bucket.active = job
      } else {
        bucket.waiting.push(job)
      }
      map.set(job.building, bucket)
    }
    return map
  }, [queue])

  const handleCancel = async (jobId: string) => {
    setPendingJobId(jobId)
    try {
      await onCancel(jobId)
    } finally {
      setPendingJobId((current) => (current === jobId ? null : current))
    }
  }

  if (queue.length === 0) {
    return <p className="text-sm text-muted-foreground">No troops in training</p>
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
        Total units being produced:{" "}
        <span className="font-semibold text-foreground">{totalUnits.toLocaleString()}</span>
      </div>

      {BUILDING_ORDER.map((building) => {
        const bucket = grouped.get(building)
        if (!bucket || (!bucket.active && bucket.waiting.length === 0)) {
          return null
        }

        const active = bucket.active
        const waiting = bucket.waiting

        return (
          <div key={building} className="rounded-lg border border-border bg-background p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold">{BUILDING_LABELS[building]}</p>
                <p className="text-xs text-muted-foreground">
                  {active ? "Currently training" : waiting.length > 0 ? "Idle, waiting batches queued" : "Idle"}
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                {waiting.length > 0 ? `${waiting.length} batch(es) queued` : "No queued batches"}
              </div>
            </div>

            {active ? (
              <ActiveTrainingCard
                job={active}
                now={now}
                pendingJobId={pendingJobId}
                onCancel={handleCancel}
              />
            ) : (
              <div className="mt-3 rounded border border-dashed border-border/60 p-3 text-sm text-muted-foreground">
                No active training
              </div>
            )}

            {waiting.length > 0 && (
              <QueuedTrainingList waiting={waiting} pendingJobId={pendingJobId} onCancel={handleCancel} />
            )}
          </div>
        )
      })}
    </div>
  )
}

interface ActiveTrainingCardProps {
  job: TrainingQueueEntry
  now: number
  pendingJobId: string | null
  onCancel: (queueItemId: string) => Promise<void>
}

function ActiveTrainingCard({ job, now, pendingJobId, onCancel }: ActiveTrainingCardProps) {
  const startMs = new Date(job.startAt).getTime()
  const finishMs = new Date(job.finishAt).getTime()
  const duration = Math.max(1, finishMs - startMs)
  const elapsed = Math.min(duration, Math.max(0, now - startMs))
  const progressPercent = Math.min(100, Math.max(0, (elapsed / duration) * 100))
  const canCancel = progressPercent <= 10

  return (
    <div className="mt-4 space-y-2 rounded-md border border-border/80 bg-secondary/30 p-3 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold">
            {job.count.toLocaleString()}× {formatUnitName(job)}
          </p>
          <p className="text-xs text-muted-foreground">
            Completes in <CountdownTimer targetDate={job.finishAt} />
          </p>
        </div>
        <div className="text-right text-xs text-muted-foreground">{progressPercent.toFixed(0)}%</div>
      </div>

      <div className="h-2 rounded-full bg-muted">
        <div
          className="h-2 rounded-full bg-primary transition-all"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span>Cancellation window: first 10% of progress</span>
        <Button
          size="sm"
          variant="outline"
          disabled={!canCancel || pendingJobId === job.id}
          onClick={() => onCancel(job.id)}
        >
          {pendingJobId === job.id ? "Cancelling..." : canCancel ? "Cancel (90% refund)" : "Cannot cancel"}
        </Button>
      </div>
    </div>
  )
}

interface QueuedTrainingListProps {
  waiting: TrainingQueueEntry[]
  pendingJobId: string | null
  onCancel: (queueItemId: string) => Promise<void>
}

function QueuedTrainingList({ waiting, pendingJobId, onCancel }: QueuedTrainingListProps) {
  return (
    <div className="mt-3 space-y-2 rounded-md border border-border/60 bg-muted/30 p-3 text-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Queued Batches</p>
      {waiting.map((job) => (
        <div key={job.id} className="flex flex-wrap items-center justify-between gap-3 rounded border border-border/40 bg-background/60 p-2">
          <div>
            <p className="font-semibold">
              {job.count.toLocaleString()}× {formatUnitName(job)}
            </p>
            <p className="text-xs text-muted-foreground">
              Starts at {new Date(job.startAt).toLocaleTimeString()}
            </p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            disabled={pendingJobId === job.id}
            onClick={() => onCancel(job.id)}
          >
            {pendingJobId === job.id ? "Removing..." : "Remove"}
          </Button>
        </div>
      ))}
    </div>
  )
}

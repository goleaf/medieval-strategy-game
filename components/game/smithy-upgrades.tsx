"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

export type SmithyUnitStatus = {
  unitTypeId: string
  name?: string
  role?: string
  attackLevel: number
  defenseLevel: number
  maxLevel: number
  nextAttack?: { level: number; cost: ResourceBundle; timeSeconds: number; lockedReason?: string }
  nextDefense?: { level: number; cost: ResourceBundle; timeSeconds: number; lockedReason?: string }
}

type ResourceBundle = { wood: number; stone: number; iron: number; gold: number; food: number }

export function SmithyUpgrades({
  units,
  onUpgrade,
  busyKey,
  activeJob,
  recommendations,
}: {
  units: SmithyUnitStatus[]
  onUpgrade?: (unitTypeId: string, kind: "ATTACK" | "DEFENSE") => void | Promise<void>
  busyKey?: string | null
  activeJob?: { unitTypeId: string; kind: "ATTACK" | "DEFENSE"; startedAt: string; completionAt: string } | null
  recommendations?: Array<{ unitTypeId: string; kind: "ATTACK" | "DEFENSE"; score: number; reason: string }>
}) {
  return (
    <div className="space-y-4">
      {recommendations && recommendations.length > 0 && (
        <div className="rounded-md border border-amber-700/40 bg-amber-950/40 p-3 text-sm text-amber-100">
          <div className="mb-2 font-semibold">Suggested priorities</div>
          <ul className="list-disc pl-4">
            {recommendations.map((r, idx) => (
              <li key={`${r.unitTypeId}-${r.kind}-${idx}`}>
                <span className="font-mono">{r.unitTypeId}</span> {r.kind.toLowerCase()} — {r.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {units.map((u) => (
          <SmithyCard
            key={u.unitTypeId}
            unit={u}
            onUpgrade={onUpgrade}
            busyKey={busyKey}
            activeJob={activeJob && activeJob.unitTypeId === u.unitTypeId ? activeJob : null}
          />
        ))}
      </div>
    </div>
  )
}

function fmtTime(sec: number) {
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m < 60) return `${m}m ${s}s`
  const h = Math.floor(m / 60)
  const rm = m % 60
  return `${h}h ${rm}m`
}

function SmithyCard({
  unit,
  onUpgrade,
  busyKey,
  activeJob,
}: {
  unit: SmithyUnitStatus
  onUpgrade?: (unitTypeId: string, kind: "ATTACK" | "DEFENSE") => void | Promise<void>
  busyKey?: string | null
  activeJob?: { unitTypeId: string; kind: "ATTACK" | "DEFENSE"; startedAt: string; completionAt: string } | null
}) {
  const pct = useMemo(() => {
    if (!activeJob) return 0
    const start = new Date(activeJob.startedAt)
    const end = new Date(activeJob.completionAt)
    const now = Date.now()
    const total = Math.max(1, end.getTime() - start.getTime())
    const elapsed = Math.min(total, Math.max(0, now - start.getTime()))
    return Math.round((elapsed / total) * 100)
  }, [activeJob])

  return (
    <div className="rounded-md border border-amber-700/40 bg-amber-950/40 p-3 text-amber-100">
      <div className="mb-2 flex items-center justify-between">
        <div className="font-semibold">{unit.unitTypeId}</div>
        <div className="text-xs text-amber-300/80">role: {unit.role || "n/a"}</div>
      </div>
      <div className="mb-2 grid grid-cols-2 gap-2 text-sm">
        <div>
          <div className="text-amber-300/90">Weapons</div>
          <div className="text-amber-100">Lv {unit.attackLevel}/{unit.maxLevel}</div>
          {unit.nextAttack && (
            <div className="mt-1 text-xs text-amber-200/80">
              Next Lv {unit.nextAttack.level} • {fmtTime(unit.nextAttack.timeSeconds)}
            </div>
          )}
        </div>
        <div>
          <div className="text-amber-300/90">Armor</div>
          <div className="text-amber-100">Lv {unit.defenseLevel}/{unit.maxLevel}</div>
          {unit.nextDefense && (
            <div className="mt-1 text-xs text-amber-200/80">
              Next Lv {unit.nextDefense.level} • {fmtTime(unit.nextDefense.timeSeconds)}
            </div>
          )}
        </div>
      </div>

      {activeJob ? (
        <div className="mt-2">
          <div className="mb-1 text-xs text-yellow-100">Upgrading {activeJob.kind.toLowerCase()}…</div>
          <Progress value={pct} />
          <div className="mt-1 text-right text-[11px] text-amber-200/70">{pct}%</div>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          <UpgradeButton
            label="Upgrade Weapons"
            node={unit.nextAttack}
            disabled={!!unit.nextAttack?.lockedReason}
            reason={unit.nextAttack?.lockedReason}
            onClick={() => onUpgrade?.(unit.unitTypeId, "ATTACK")}
            busy={busyKey === `${unit.unitTypeId}:ATTACK`}
          />
          <UpgradeButton
            label="Upgrade Armor"
            node={unit.nextDefense}
            disabled={!!unit.nextDefense?.lockedReason}
            reason={unit.nextDefense?.lockedReason}
            onClick={() => onUpgrade?.(unit.unitTypeId, "DEFENSE")}
            busy={busyKey === `${unit.unitTypeId}:DEFENSE`}
          />
        </div>
      )}

      {(unit.nextAttack?.lockedReason || unit.nextDefense?.lockedReason) && (
        <div className="mt-2 text-[11px] text-red-200/80">
          {unit.nextAttack?.lockedReason || unit.nextDefense?.lockedReason}
        </div>
      )}
    </div>
  )
}

function UpgradeButton({
  label,
  node,
  disabled,
  reason,
  onClick,
  busy,
}: {
  label: string
  node?: { cost: ResourceBundle; timeSeconds: number }
  disabled?: boolean
  reason?: string
  onClick?: () => void
  busy?: boolean
}) {
  return (
    <Button size="sm" variant="outline" disabled={disabled || busy} onClick={onClick} title={reason}>
      {busy ? "Starting…" : label}
    </Button>
  )
}


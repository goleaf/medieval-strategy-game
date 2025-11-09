"use client"

import { useEffect, useMemo, useState } from "react"

type LedgerResourceType = "WOOD" | "CLAY" | "IRON" | "CROP"

export interface ResourceLedgerSnapshot {
  id?: string
  resourceType: LedgerResourceType
  currentAmount: number
  productionPerHour: number
  netProductionPerHour: number
  storageCapacity: number
  lastTickAt: string
}

interface ResourceDisplayProps {
  ledgers: ResourceLedgerSnapshot[]
  showCrop?: boolean
  highlightThresholdPct?: number
  className?: string
}

const RESOURCE_META: Record<
  LedgerResourceType,
  { label: string; icon: string; accent: string; capacityLabel: string }
> = {
  WOOD: { label: "Wood", icon: "🪵", accent: "bg-emerald-500", capacityLabel: "warehouse" },
  CLAY: { label: "Clay", icon: "🧱", accent: "bg-orange-500", capacityLabel: "warehouse" },
  IRON: { label: "Iron", icon: "⛓", accent: "bg-slate-500", capacityLabel: "warehouse" },
  CROP: { label: "Crop", icon: "🌾", accent: "bg-yellow-500", capacityLabel: "granary" },
}

const NUMBER_FORMAT = new Intl.NumberFormat()

function clamp(value: number, min = 0, max = Number.POSITIVE_INFINITY) {
  return Math.max(min, Math.min(max, value))
}

export function ResourceDisplay({
  ledgers,
  showCrop = false,
  highlightThresholdPct = 0.9,
  className = "",
}: ResourceDisplayProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const ledgerMap = useMemo(() => {
    const map: Partial<Record<LedgerResourceType, ResourceLedgerSnapshot>> = {}
    for (const ledger of ledgers) {
      map[ledger.resourceType] = ledger
    }
    return map
  }, [ledgers])

  const orderedResources: LedgerResourceType[] = showCrop ? ["WOOD", "CLAY", "IRON", "CROP"] : ["WOOD", "CLAY", "IRON"]

  return (
    <div className={`space-y-3 ${className}`}>
      {orderedResources.map((type) => {
        const ledger = ledgerMap[type]
        const meta = RESOURCE_META[type]
        const capacity = ledger?.storageCapacity ?? 0
        const netPerHour = ledger?.netProductionPerHour ?? 0
        const grossPerHour = ledger?.productionPerHour ?? 0
        const elapsedSeconds = ledger ? Math.max(0, (now - new Date(ledger.lastTickAt).getTime()) / 1000) : 0
        const projected = ledger ? ledger.currentAmount + (netPerHour * elapsedSeconds) / 3600 : 0
        const amount = capacity > 0 ? clamp(projected, 0, capacity) : clamp(projected, 0)
        const percent = capacity > 0 ? clamp((amount / capacity) * 100, 0, 100) : 0
        const nearingCap = capacity > 0 && percent / 100 >= highlightThresholdPct
        const productionLabel = netPerHour === grossPerHour ? netPerHour : `${netPerHour} (gross ${grossPerHour})`

        return (
          <div key={type} className="rounded-lg border border-border bg-card/50 p-3 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
              </div>
              <div className="text-right">
                <div className="font-mono text-base">
                  {capacity > 0
                    ? `${NUMBER_FORMAT.format(Math.floor(amount))} / ${NUMBER_FORMAT.format(capacity)}`
                    : NUMBER_FORMAT.format(Math.floor(amount))}
                </div>
                {capacity > 0 && (
                  <div className="text-xs text-muted-foreground">
                    {percent.toFixed(0)}% of {meta.capacityLabel}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {netPerHour >= 0 ? "+" : ""}
                {Math.round(netPerHour)} /h
              </span>
              {nearingCap && percent < 100 && (
                <span className="text-amber-600 font-medium">Approaching capacity</span>
              )}
              {capacity > 0 && percent >= 100 && netPerHour > 0 && (
                <span className="text-red-500 font-medium">At capacity • overflow wasted</span>
              )}
              {!nearingCap && netPerHour < 0 && <span className="text-red-500 font-medium">Net loss</span>}
            </div>

            {capacity > 0 && (
              <div className="mt-2 h-2 w-full rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${nearingCap ? "bg-amber-500" : meta.accent}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            )}

            <div className="mt-1 text-[11px] text-muted-foreground italic">
              {ledger
                ? `Production: ${productionLabel}/h`
                : "No production data available"}
            </div>
          </div>
        )
      })}
    </div>
  )
}

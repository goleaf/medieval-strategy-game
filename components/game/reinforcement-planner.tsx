"use client"

import { Button } from "@/components/ui/button"
import { useMemo, useState } from "react"
import { Shield, Target, Users, X, ArrowRight, ArrowLeft, Bookmark, RefreshCw, BookmarkCheck, Trash2 } from "lucide-react"
import type { Troop } from "@prisma/client"
import { TextTable } from "./text-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAttackPresets } from "@/hooks/use-attack-presets"
import { AttackPresetMission } from "@prisma/client"

interface ReinforcementPlannerProps {
  villageId: string
  troops: Troop[]
  playerId?: string | null
  playerHasGoldClub?: boolean
  onSendReinforcements: (toX: number, toY: number, selection: Record<string, number>) => Promise<void>
}

type Mode = "inactive" | "coordinates" | "troops"

export function ReinforcementPlanner({
  villageId,
  troops,
  playerId,
  playerHasGoldClub = false,
  onSendReinforcements,
}: ReinforcementPlannerProps) {
  const [mode, setMode] = useState<Mode>("inactive")
  const [targetX, setTargetX] = useState("")
  const [targetY, setTargetY] = useState("")
  const [troopSelection, setTroopSelection] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [presetName, setPresetName] = useState("")
  const [presetRequiresGoldClub, setPresetRequiresGoldClub] = useState(false)
  const [presetSaving, setPresetSaving] = useState(false)
  const [presetActionError, setPresetActionError] = useState<string | null>(null)

  const { presets, loading: presetsLoading, error: presetError, refresh, createPreset, deletePreset } = useAttackPresets({
    playerId,
    villageId,
    mission: AttackPresetMission.SUPPORT,
  })

  const handleTroopChange = (troopId: string, value: number) => {
    setTroopSelection((prev) => {
      const next = { ...prev }
      if (value <= 0) delete next[troopId]
      else next[troopId] = value
      return next
    })
  }

  const handleSend = async () => {
    if (!targetX || !targetY || Object.keys(troopSelection).length === 0) return
    setLoading(true)
    try {
      await onSendReinforcements(parseInt(targetX), parseInt(targetY), troopSelection)
      setMode("inactive")
      setTargetX("")
      setTargetY("")
      setTroopSelection({})
    } catch (error) {
      console.error("Failed to send reinforcements:", error)
    } finally {
      setLoading(false)
    }
  }

  const selectedTroopCount = Object.values(troopSelection).reduce((sum, count) => sum + count, 0)

  const applyPreset = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId)
    if (!preset) return
    if (preset.targetX !== null) setTargetX(String(preset.targetX))
    if (preset.targetY !== null) setTargetY(String(preset.targetY))

    const selection: Record<string, number> = {}
    preset.units.forEach((unit) => {
      const troop = troops.find((t) => t.type === unit.troopType)
      if (!troop) return
      const amount = Math.min(unit.quantity, troop.quantity)
      if (amount > 0) selection[troop.id] = amount
    })
    setTroopSelection(selection)
    setMode("troops")
  }

  const canSavePreset = useMemo(() => {
    return (
      !!playerId &&
      targetX.trim() !== "" &&
      targetY.trim() !== "" &&
      Object.keys(troopSelection).length > 0 &&
      presetName.trim().length > 0
    )
  }, [playerId, targetX, targetY, troopSelection, presetName])

  const handleSavePreset = async () => {
    if (!canSavePreset) return
    setPresetSaving(true)
    setPresetActionError(null)
    try {
      const units = Object.entries(troopSelection)
        .map(([troopId, quantity]) => {
          const troop = troops.find((t) => t.id === troopId)
          if (!troop) return null
          return { troopType: troop.type, quantity }
        })
        .filter((unit): unit is { troopType: any; quantity: number } => unit !== null)

      await createPreset({
        name: presetName.trim(),
        type: "SUPPRESSION",
        requiresGoldClub: playerHasGoldClub ? presetRequiresGoldClub : false,
        targetX: parseInt(targetX),
        targetY: parseInt(targetY),
        units,
      })
      setPresetName("")
      setPresetRequiresGoldClub(false)
    } catch (error) {
      setPresetActionError(error instanceof Error ? error.message : "Failed to save preset")
    } finally {
      setPresetSaving(false)
    }
  }

  const handleDeletePreset = async (presetId: string) => {
    if (!confirm("Delete this preset?")) return
    try {
      await deletePreset(presetId)
    } catch (error) {
      setPresetActionError(error instanceof Error ? error.message : "Failed to delete preset")
    }
  }

  if (mode === "inactive") {
    return (
      <Button onClick={() => setMode("coordinates")} className="flex items-center gap-2" variant="outline">
        <Shield className="w-4 h-4" />
        Send Reinforcements
      </Button>
    )
  }

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <div className="border border-border rounded p-3 bg-background/60 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-sm">
            <Bookmark className="w-4 h-4" /> Support Presets
          </div>
          <button
            onClick={refresh}
            className="inline-flex items-center gap-1 text-xs px-2 py-1 border rounded hover:bg-secondary"
            title="Refresh support presets"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>
        {presetError && (
          <Alert variant="destructive">
            <AlertDescription>{presetError}</AlertDescription>
          </Alert>
        )}
        {presetActionError && (
          <Alert variant="destructive">
            <AlertDescription>{presetActionError}</AlertDescription>
          </Alert>
        )}
        {presetsLoading ? (
          <p className="text-xs text-muted-foreground">Loading presets…</p>
        ) : presets.length === 0 ? (
          <p className="text-xs text-muted-foreground">Save your favorite reinforcement stacks for quick access.</p>
        ) : (
          <div className="space-y-2">
            {presets.map((preset) => (
              <div key={preset.id} className="flex items-start justify-between gap-2 border border-border rounded px-3 py-2 bg-background">
                <div className="text-xs">
                  <p className="font-semibold flex items-center gap-2">
                    {preset.name}
                    {preset.requiresGoldClub && (
                      <span className="text-[10px] uppercase tracking-wide text-amber-600 border border-amber-600/60 px-1 rounded">
                        Gold Club
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Target: {preset.targetX !== null && preset.targetY !== null ? `(${preset.targetX}, ${preset.targetY})` : "Manual"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Units: {preset.units.map((unit) => `${unit.quantity}x ${unit.troopType}`).join(", ")}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="secondary" onClick={() => applyPreset(preset.id)}>
                    <BookmarkCheck className="w-4 h-4" />
                    Load
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDeletePreset(preset.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Send Reinforcements
        </h3>
        <Button onClick={() => setMode("inactive")} variant="ghost" size="sm">
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className={`w-2 h-2 rounded-full ${mode === "coordinates" ? "bg-primary" : "bg-muted"}`} />
        <span className={mode === "coordinates" ? "font-medium" : ""}>Target</span>
        <ArrowRight className="w-3 h-3" />
        <div className={`w-2 h-2 rounded-full ${mode === "troops" ? "bg-primary" : "bg-muted"}`} />
        <span className={mode === "troops" ? "font-medium" : ""}>Troops</span>
      </div>

      {mode === "coordinates" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Target Village Coordinates</label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="X"
                value={targetX}
                onChange={(e) => setTargetX(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md bg-background"
                min="0"
                max="1000"
              />
              <input
                type="number"
                placeholder="Y"
                value={targetY}
                onChange={(e) => setTargetY(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-md bg-background"
                min="0"
                max="1000"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setMode("inactive")} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button onClick={() => setMode("troops")} disabled={!targetX || !targetY} className="flex-1">
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {mode === "troops" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Troops ({selectedTroopCount} selected)</label>
            <div className="max-h-60 overflow-y-auto">
              <TextTable
                headers={["Type", "Available", "Send"]}
                rows={troops.map((troop) => [
                  troop.type,
                  troop.quantity.toString(),
                  <input
                    key={troop.id}
                    type="number"
                    min="0"
                    max={troop.quantity}
                    value={troopSelection[troop.id] || ""}
                    onChange={(e) => handleTroopChange(troop.id, parseInt(e.target.value) || 0)}
                    className="w-20 px-2 py-1 border rounded text-center bg-background"
                  />,
                ])}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setMode("coordinates")} variant="outline" className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleSend} disabled={selectedTroopCount === 0 || loading} className="flex-1">
              {loading ? "Sending..." : "Send Reinforcements"}
            </Button>
          </div>

          {playerId && (
            <div className="border border-border rounded p-3 space-y-3 bg-secondary/40">
              <p className="font-semibold text-sm">Save as preset</p>
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Preset name"
                className="w-full p-2 border border-border rounded bg-background"
              />
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="support-goldclub"
                  checked={presetRequiresGoldClub && playerHasGoldClub}
                  onCheckedChange={(checked) => setPresetRequiresGoldClub(Boolean(checked))}
                  disabled={!playerHasGoldClub}
                />
                <label htmlFor="support-goldclub" className="text-xs text-muted-foreground">
                  Requires Gold Club
                </label>
              </div>
              <Button onClick={handleSavePreset} disabled={!canSavePreset || presetSaving} className="w-full">
                {presetSaving ? "Saving..." : "Save preset"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

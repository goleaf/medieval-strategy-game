"use client"

import { Button } from "@/components/ui/button"
import { useEffect, useMemo, useState } from "react"
import { Swords, Target, Users, X, ArrowRight, ArrowLeft, Bookmark, Trash2, RefreshCw, BookmarkCheck } from "lucide-react"
import type { AttackType, Troop } from "@prisma/client"
import { TextTable } from "./text-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAttackPresets } from "@/hooks/use-attack-presets"
import { AttackPresetMission } from "@prisma/client"

interface AttackPlannerProps {
  villageId: string
  troops: Troop[]
  playerId?: string | null
  playerHasGoldClub?: boolean
  onLaunchAttack: (toX: number, toY: number, selection: Record<string, number>, type: AttackType) => Promise<void>
  prefillTarget?: { x?: number | null; y?: number | null }
}

type Mode = "inactive" | "coordinates" | "troops"

export function AttackPlanner({
  villageId,
  troops,
  playerId,
  playerHasGoldClub = false,
  onLaunchAttack,
  prefillTarget,
}: AttackPlannerProps) {
  const [mode, setMode] = useState<Mode>("inactive")
  const [targetX, setTargetX] = useState(prefillTarget?.x != null ? String(prefillTarget.x) : "")
  const [targetY, setTargetY] = useState(prefillTarget?.y != null ? String(prefillTarget.y) : "")
  const [attackType, setAttackType] = useState<AttackType>('RAID')
  const [troopSelection, setTroopSelection] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [presetName, setPresetName] = useState("")
  const [presetRequiresGoldClub, setPresetRequiresGoldClub] = useState(false)
  const [presetSaving, setPresetSaving] = useState(false)
  const {
    presets,
    loading: presetsLoading,
    error: presetError,
    refresh: refreshPresets,
    createPreset,
    deletePreset,
  } = useAttackPresets({
    playerId,
    villageId,
    mission: AttackPresetMission.ATTACK,
  })
  const [presetActionError, setPresetActionError] = useState<string | null>(null)

  useEffect(() => {
    if (prefillTarget?.x != null) {
      setTargetX(String(prefillTarget.x))
      setMode("coordinates")
    }
    if (prefillTarget?.y != null) {
      setTargetY(String(prefillTarget.y))
      setMode("coordinates")
    }
  }, [prefillTarget?.x, prefillTarget?.y])

  const handleTroopChange = (troopId: string, value: number) => {
    setTroopSelection(prev => {
      const newSelection = { ...prev }
      if (value <= 0) {
        delete newSelection[troopId]
      } else {
        newSelection[troopId] = value
      }
      return newSelection
    })
  }

  const handleLaunch = async () => {
    if (!targetX || !targetY || Object.keys(troopSelection).length === 0) return
    setLoading(true)
    try {
      await onLaunchAttack(
        parseInt(targetX),
        parseInt(targetY),
        troopSelection,
        attackType
      )
      setMode('inactive')
      setTargetX('')
      setTargetY('')
      setTroopSelection({})
    } catch (error) {
      console.error('Failed to launch attack:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyPreset = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId)
    if (!preset) return
    if (preset.targetX !== null) setTargetX(String(preset.targetX))
    if (preset.targetY !== null) setTargetY(String(preset.targetY))
    setAttackType(preset.type)

    const selection: Record<string, number> = {}
    preset.units.forEach((unit) => {
      const troop = troops.find((t) => t.type === unit.troopType)
      if (!troop) return
      const amount = Math.min(unit.quantity, troop.quantity)
      if (amount > 0) {
        selection[troop.id] = amount
      }
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
        type: attackType,
        requiresGoldClub: playerHasGoldClub ? presetRequiresGoldClub : false,
        targetX: targetX ? parseInt(targetX) : null,
        targetY: targetY ? parseInt(targetY) : null,
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

  return (
    <div className="w-full space-y-4">
      <div className="border border-border rounded p-3 space-y-3 bg-card/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Bookmark className="w-4 h-4" />
            Attack Presets
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={refreshPresets}
              className="text-xs inline-flex items-center gap-1 px-2 py-1 border rounded hover:bg-secondary"
              title="Refresh presets"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </button>
          </div>
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
          <p className="text-sm text-muted-foreground">Loading presets…</p>
        ) : presets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No presets yet. Configure a target and troop mix, then save it below.</p>
        ) : (
          <div className="space-y-2">
            {presets.map((preset) => (
              <div key={preset.id} className="flex items-start justify-between gap-2 border border-border rounded px-3 py-2 bg-background/70">
                <div className="text-sm">
                  <p className="font-semibold flex items-center gap-2">
                    {preset.name}
                    {preset.requiresGoldClub && (
                      <span className="text-[10px] uppercase tracking-wide text-amber-600 border border-amber-600/60 px-1 rounded">
                        Gold Club
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Target:{" "}
                    {preset.targetX !== null && preset.targetY !== null ? `(${preset.targetX}, ${preset.targetY})` : "Manual"} · {preset.type}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Units: {preset.units.map((unit) => `${unit.quantity}x ${unit.troopType}`).join(", ")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => applyPreset(preset.id)}>
                    <BookmarkCheck className="w-4 h-4" />
                    Apply
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

      {mode === 'inactive' && (
        <Button onClick={() => setMode('coordinates')} className="w-full">
          <Target className="w-4 h-4" />
          Plan Attack
        </Button>
      )}

      {mode === 'coordinates' && (
        <div className="space-y-4 p-3 border border-border rounded bg-secondary">
          <div>
            <label htmlFor="target-x" className="text-sm font-bold block mb-2">
              Target Coordinates
            </label>
            <div className="flex gap-2">
              <input
                id="target-x"
                type="number"
                placeholder="X"
                value={targetX}
                onChange={(e) => setTargetX(e.target.value)}
                className="flex-1 p-2 border border-border rounded bg-background"
              />
              <input
                id="target-y"
                type="number"
                placeholder="Y"
                value={targetY}
                onChange={(e) => setTargetY(e.target.value)}
                className="flex-1 p-2 border border-border rounded bg-background"
              />
            </div>
          </div>

          <div>
            <label htmlFor="attack-type" className="text-sm font-bold block mb-2">
              Attack Type
            </label>
            <select
              id="attack-type"
              value={attackType}
              onChange={(e) => setAttackType(e.target.value as AttackType)}
              className="w-full p-2 border border-border rounded bg-background"
            >
              <option value="RAID">Raid (steal resources)</option>
              <option value="CONQUEST">Conquest (take village)</option>
              <option value="SUPPRESSION">Suppression</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setMode('troops')}
              disabled={!targetX || !targetY}
              className="flex-1"
            >
              <Users className="w-4 h-4" />
              Select Troops
            </Button>
            <Button onClick={() => setMode('inactive')} variant="outline" className="flex-1">
              <X className="w-4 h-4" />
              Cancel
            </Button>
          </div>
        </div>
      )}

      {mode === 'troops' && (
        <div className="space-y-4">
          <div className="p-3 border border-border rounded bg-secondary">
            <p className="font-bold">Target: ({targetX}, {targetY})</p>
            <p className="text-sm text-muted-foreground">Type: {attackType}</p>
          </div>

          <TextTable
            headers={["Troop Type", "Available", "Send"]}
            rows={troops.length === 0 ? [] : troops.map((troop) => [
              troop.type,
              <span key={`available-${troop.id}`} className="font-mono text-right block">{troop.quantity.toLocaleString()}</span>,
              <input
                key={`input-${troop.id}`}
                type="number"
                min="0"
                max={troop.quantity}
                value={troopSelection[troop.id] || ''}
                onChange={(e) => handleTroopChange(troop.id, parseInt(e.target.value) || 0)}
                className="w-full p-2 border border-border rounded bg-background text-foreground"
                aria-label={`Send ${troop.type}`}
              />,
            ])}
          />

          <div className="flex gap-2">
            <Button
              onClick={handleLaunch}
              disabled={loading || Object.keys(troopSelection).length === 0}
              className="flex-1"
            >
              <Swords className="w-4 h-4" />
              {loading ? 'Launching...' : 'Launch Attack'}
            </Button>
            <Button onClick={() => setMode('coordinates')} variant="outline" className="flex-1">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>

          {playerId && (
            <div className="border border-border rounded p-3 space-y-3 bg-secondary/50">
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
                  id="preset-goldclub"
                  checked={presetRequiresGoldClub && playerHasGoldClub}
                  onCheckedChange={(checked) => setPresetRequiresGoldClub(Boolean(checked))}
                  disabled={!playerHasGoldClub}
                />
                <label htmlFor="preset-goldclub" className="text-xs text-muted-foreground">
                  Requires Gold Club (only available if you have membership)
                </label>
              </div>
              <Button
                onClick={handleSavePreset}
                disabled={!canSavePreset || presetSaving}
                className="w-full"
              >
                {presetSaving ? "Saving…" : "Save preset"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

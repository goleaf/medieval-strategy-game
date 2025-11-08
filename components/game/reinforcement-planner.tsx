"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Shield, Target, Users, X, ArrowRight, ArrowLeft } from "lucide-react"
import type { Troop } from "@prisma/client"
import { TextTable } from "./text-table"

interface ReinforcementPlannerProps {
  villageId: string
  troops: Troop[]
  onSendReinforcements: (toX: number, toY: number, selection: Record<string, number>) => Promise<void>
}

type Mode = "inactive" | "coordinates" | "troops"

export function ReinforcementPlanner({ villageId, troops, onSendReinforcements }: ReinforcementPlannerProps) {
  const [mode, setMode] = useState<Mode>('inactive')
  const [targetX, setTargetX] = useState('')
  const [targetY, setTargetY] = useState('')
  const [troopSelection, setTroopSelection] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)

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

  const handleSend = async () => {
    if (!targetX || !targetY || Object.keys(troopSelection).length === 0) return
    setLoading(true)
    try {
      await onSendReinforcements(
        parseInt(targetX),
        parseInt(targetY),
        troopSelection
      )
      setMode('inactive')
      setTargetX('')
      setTargetY('')
      setTroopSelection({})
    } catch (error) {
      console.error('Failed to send reinforcements:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedTroopCount = Object.values(troopSelection).reduce((sum, count) => sum + count, 0)

  if (mode === 'inactive') {
    return (
      <Button
        onClick={() => setMode('coordinates')}
        className="flex items-center gap-2"
        variant="outline"
      >
        <Shield className="w-4 h-4" />
        Send Reinforcements
      </Button>
    )
  }

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Send Reinforcements
        </h3>
        <Button
          onClick={() => setMode('inactive')}
          variant="ghost"
          size="sm"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <div className={`w-2 h-2 rounded-full ${mode === 'coordinates' ? 'bg-primary' : 'bg-muted'}`} />
        <span className={mode === 'coordinates' ? 'font-medium' : ''}>Target</span>
        <ArrowRight className="w-3 h-3" />
        <div className={`w-2 h-2 rounded-full ${mode === 'troops' ? 'bg-primary' : 'bg-muted'}`} />
        <span className={mode === 'troops' ? 'font-medium' : ''}>Troops</span>
      </div>

      {mode === 'coordinates' && (
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
            <Button
              onClick={() => setMode('inactive')}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={() => setMode('troops')}
              disabled={!targetX || !targetY}
              className="flex-1"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {mode === 'troops' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Select Troops ({selectedTroopCount} selected)
            </label>
            <div className="max-h-60 overflow-y-auto">
              <TextTable
                headers={['Type', 'Available', 'Send']}
                rows={troops.map((troop) => [
                  troop.type,
                  troop.quantity.toString(),
                  <input
                    key={troop.id}
                    type="number"
                    min="0"
                    max={troop.quantity}
                    value={troopSelection[troop.id] || ''}
                    onChange={(e) => handleTroopChange(troop.id, parseInt(e.target.value) || 0)}
                    className="w-20 px-2 py-1 border rounded text-center bg-background"
                  />,
                ])}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => setMode('coordinates')}
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button
              onClick={handleSend}
              disabled={selectedTroopCount === 0 || loading}
              className="flex-1"
            >
              {loading ? 'Sending...' : 'Send Reinforcements'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

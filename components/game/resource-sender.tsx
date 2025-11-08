"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import { Send, Target, X, ArrowRight, ArrowLeft, Package } from "lucide-react"

interface ResourceSenderProps {
  villageId: string
  availableResources: {
    wood: number
    stone: number
    iron: number
    gold: number
    food: number
  }
  onSendResources: (toX: number, toY: number, resources: {
    wood: number
    stone: number
    iron: number
    gold: number
    food: number
  }) => Promise<void>
}

type Mode = "inactive" | "coordinates" | "resources"

export function ResourceSender({ villageId, availableResources, onSendResources }: ResourceSenderProps) {
  const [mode, setMode] = useState<Mode>('inactive')
  const [targetX, setTargetX] = useState('')
  const [targetY, setTargetY] = useState('')
  const [resources, setResources] = useState({
    wood: 0,
    stone: 0,
    iron: 0,
    gold: 0,
    food: 0,
  })
  const [loading, setLoading] = useState(false)

  const handleResourceChange = (resource: keyof typeof resources, value: number) => {
    setResources(prev => ({
      ...prev,
      [resource]: Math.max(0, Math.min(value, availableResources[resource])),
    }))
  }

  const handleSend = async () => {
    const totalResources = Object.values(resources).reduce((sum, amount) => sum + amount, 0)
    if (!targetX || !targetY || totalResources === 0) return

    setLoading(true)
    try {
      await onSendResources(parseInt(targetX), parseInt(targetY), resources)
      setMode('inactive')
      setTargetX('')
      setTargetY('')
      setResources({ wood: 0, stone: 0, iron: 0, gold: 0, food: 0 })
    } catch (error) {
      console.error('Failed to send resources:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalSending = Object.values(resources).reduce((sum, amount) => sum + amount, 0)

  if (mode === 'inactive') {
    return (
      <Button
        onClick={() => setMode('coordinates')}
        className="flex items-center gap-2"
        variant="outline"
      >
        <Send className="w-4 h-4" />
        Send Resources
      </Button>
    )
  }

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Package className="w-5 h-5" />
          Send Resources
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
        <div className={`w-2 h-2 rounded-full ${mode === 'resources' ? 'bg-primary' : 'bg-muted'}`} />
        <span className={mode === 'resources' ? 'font-medium' : ''}>Resources</span>
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
              onClick={() => setMode('resources')}
              disabled={!targetX || !targetY}
              className="flex-1"
            >
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {mode === 'resources' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Select Resources ({totalSending.toLocaleString()} total)
            </label>
            <div className="grid grid-cols-1 gap-3">
              {Object.entries(resources).map(([resource, amount]) => (
                <div key={resource} className="flex items-center gap-3">
                  <label className="w-16 text-sm capitalize font-medium">
                    {resource}:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={availableResources[resource as keyof typeof availableResources]}
                    value={amount}
                    onChange={(e) => handleResourceChange(resource as keyof typeof resources, parseInt(e.target.value) || 0)}
                    className="flex-1 px-3 py-2 border rounded-md bg-background text-center"
                  />
                  <span className="w-20 text-sm text-muted-foreground text-right">
                    / {availableResources[resource as keyof typeof availableResources].toLocaleString()}
                  </span>
                </div>
              ))}
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
              disabled={totalSending === 0 || loading}
              className="flex-1"
            >
              {loading ? 'Sending...' : 'Send Resources'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SuccessMessage } from "@/components/ui/success-message"
import { ErrorMessage } from "@/components/ui/error-message"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

interface Village {
  id: string
  name: string
  wood: number
  stone: number
  iron: number
  gold: number
  food: number
  x: number
  y: number
}

interface NpcMerchantProps {
  villages: Village[]
  onResourcesUpdated: () => void
  readOnly?: boolean
}

const RESOURCE_TYPES = [
  { value: "WOOD", label: "Wood" },
  { value: "STONE", label: "Stone" },
  { value: "IRON", label: "Iron" },
  { value: "GOLD", label: "Gold" },
  { value: "FOOD", label: "Food" },
] as const

const NPC_MERCHANT_GOLD_COST = 3

export function NpcMerchant({ villages, onResourcesUpdated, readOnly = false }: NpcMerchantProps) {
  const [selectedVillage, setSelectedVillage] = useState<Village | null>(null)
  const [fromResource, setFromResource] = useState<string>("")
  const [toResource, setToResource] = useState<string>("")
  const [amount, setAmount] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Reset success/error messages when inputs change
  useEffect(() => {
    setSuccess(null)
    setError(null)
  }, [fromResource, toResource, amount, selectedVillage])

  const handleExchange = async () => {
    if (readOnly) {
      return
    }

    if (!selectedVillage || !fromResource || !toResource || !amount) {
      setError("Please fill in all fields")
      return
    }

    const exchangeAmount = parseInt(amount)
    if (isNaN(exchangeAmount) || exchangeAmount < 50) {
      setError("Exchange amount must be at least 50")
      return
    }

    if (fromResource === toResource) {
      setError("Cannot exchange resource with itself")
      return
    }

    // Check if village has enough gold
    if (selectedVillage.gold < NPC_MERCHANT_GOLD_COST) {
      setError(`Insufficient gold (need ${NPC_MERCHANT_GOLD_COST} Gold)`)
      return
    }

    // Check if village has enough of the source resource
    const fromResourceKey = fromResource.toLowerCase() as keyof Village
    const currentAmount = selectedVillage[fromResourceKey] as number
    if (currentAmount < exchangeAmount) {
      setError(`Insufficient ${fromResource} (available: ${currentAmount})`)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/market/npc-merchant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          villageId: selectedVillage.id,
          fromResource,
          toResource,
          amount: exchangeAmount,
        }),
      })

      const result = await res.json()

      if (result.success) {
        setSuccess(`Successfully exchanged ${exchangeAmount} ${fromResource} for ${exchangeAmount} ${toResource} (Cost: ${NPC_MERCHANT_GOLD_COST} Gold)`)
        setAmount("")
        onResourcesUpdated()
      } else {
        setError(result.error || "Exchange failed")
      }
    } catch (error) {
      console.error("Exchange error:", error)
      setError("Failed to process exchange")
    } finally {
      setLoading(false)
    }
  }

  const handleBalanceResources = async () => {
    if (readOnly) {
      return
    }

    if (!selectedVillage) {
      setError("Please select a village")
      return
    }

    if (selectedVillage.gold < NPC_MERCHANT_GOLD_COST) {
      setError(`Insufficient gold (need ${NPC_MERCHANT_GOLD_COST} Gold)`)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/market/npc-merchant?action=balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          villageId: selectedVillage.id,
        }),
      })

      const result = await res.json()

      if (result.success) {
        setSuccess(`Successfully balanced resources (Cost: ${NPC_MERCHANT_GOLD_COST} Gold)`)
        onResourcesUpdated()
      } else {
        setError(result.error || "Balance failed")
      }
    } catch (error) {
      console.error("Balance error:", error)
      setError("Failed to balance resources")
    } finally {
      setLoading(false)
    }
  }

  const maxExchangeAmount = selectedVillage && fromResource
    ? selectedVillage[fromResource.toLowerCase() as keyof Village] as number
    : 0
  const exchangeDisabled = loading || readOnly || !selectedVillage || !fromResource || !toResource || !amount
  const balanceDisabled = loading || readOnly || !selectedVillage

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>NPC Merchant</CardTitle>
          <CardDescription>
            Exchange resources within your village at a 1:1 ratio. Cost: {NPC_MERCHANT_GOLD_COST} Gold per use.
            Minimum exchange: 50 units.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {readOnly && (
            <div className="rounded border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              Demo villages are shown for preview purposes. NPC Merchant actions are disabled until you connect to a live account.
            </div>
          )}
          {/* Village Selection */}
          <div>
            <Label htmlFor="village">Select Village</Label>
            <Select
              value={selectedVillage?.id || ""}
              onValueChange={(value) => {
                const village = villages.find(v => v.id === value)
                setSelectedVillage(village || null)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a village" />
              </SelectTrigger>
              <SelectContent>
                {villages.map((village) => (
                  <SelectItem key={village.id} value={village.id}>
                    {village.name} ({village.x}, {village.y}) - Gold: {village.gold}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedVillage && (
            <>
              {/* Current Resources Display */}
              <div className="grid grid-cols-5 gap-2 p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <div className="text-sm font-medium">Wood</div>
                  <div className="text-lg">{selectedVillage.wood.toLocaleString()}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">Stone</div>
                  <div className="text-lg">{selectedVillage.stone.toLocaleString()}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">Iron</div>
                  <div className="text-lg">{selectedVillage.iron.toLocaleString()}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">Gold</div>
                  <div className="text-lg">{selectedVillage.gold.toLocaleString()}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium">Food</div>
                  <div className="text-lg">{selectedVillage.food.toLocaleString()}</div>
                </div>
              </div>

              {/* Resource Exchange */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fromResource">From Resource</Label>
                  <Select value={fromResource} onValueChange={setFromResource}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select resource to exchange from" />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOURCE_TYPES.map((resource) => (
                        <SelectItem key={resource.value} value={resource.value}>
                          {resource.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="toResource">To Resource</Label>
                  <Select value={toResource} onValueChange={setToResource}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select resource to exchange to" />
                    </SelectTrigger>
                    <SelectContent>
                      {RESOURCE_TYPES.map((resource) => (
                        <SelectItem key={resource.value} value={resource.value}>
                          {resource.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="amount">Amount (min: 50)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="50"
                  max={maxExchangeAmount}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount to exchange"
                />
                {selectedVillage && fromResource && (
                  <div className="text-sm text-muted-foreground mt-1">
                    Available: {maxExchangeAmount.toLocaleString()} {fromResource}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleExchange}
                  disabled={exchangeDisabled}
                  className="flex-1"
                >
                  {loading ? <LoadingSpinner /> : "Exchange Resources"}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleBalanceResources}
                  disabled={balanceDisabled}
                >
                  {loading ? <LoadingSpinner /> : "Balance Resources"}
                </Button>
              </div>
            </>
          )}

          {success && <SuccessMessage message={success} />}
          {error && <ErrorMessage message={error} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Select a village and choose which resources to exchange</p>
          <p>• Exchange rate is always 1:1 (e.g., 100 Wood = 100 Stone)</p>
          <p>• Each exchange costs {NPC_MERCHANT_GOLD_COST} Gold</p>
          <p>• Minimum exchange amount is 50 units</p>
          <p>• "Balance Resources" distributes all resources equally across Wood, Stone, Iron, and Food</p>
          <p>• Useful for construction, troop training, or resource optimization</p>
        </CardContent>
      </Card>
    </div>
  )
}

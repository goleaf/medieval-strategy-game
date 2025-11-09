"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"
import { TextTable } from "@/components/game/text-table"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NpcMerchant } from "@/components/game/npc-merchant"

type ResourceBundle = {
  wood: number
  stone: number
  iron: number
  gold: number
  food: number
}

type TradeVillage = {
  id: string
  name: string
  x: number
  y: number
  wood: number
  stone: number
  iron: number
  gold: number
  food: number
  merchants: {
    total: number
    busy: number
    reserved: number
    free: number
    capacityPerMerchant: number
    baseCapacityPerMerchant: number
    capacityBonusPercentage: number
    premiumActive: boolean
    tilesPerHour: number
  } | null
}

type TradeContact = {
  villageId: string
  villageName: string
  playerId: string
  playerName: string
  x: number
  y: number
  type: "SELF" | "ALLY" | "RECENT"
}

type TradeShipment = {
  id: string
  direction: "OUTGOING" | "INCOMING"
  status: string
  departAt: string
  arriveAt: string
  returnAt: string
  cancelledAt?: string | null
  deliveredAt?: string | null
  merchantsUsed: number
  travelMinutes: number
  totalResources: number
  resources: ResourceBundle
  origin: {
    id: string
    name: string
    x: number
    y: number
    playerId: string
    playerName: string
  }
  destination: {
    id: string
    name: string
    x: number
    y: number
    playerId: string
    playerName: string
  }
  updatedAt: string
}

type QuickTemplate = {
  key: string
  targetVillageId: string
  targetName: string
  coords: { x: number; y: number }
  bundle: ResourceBundle
  merchantsRequired: number
  travelMinutes: number
  recentCount: number
}

type TradeOverview = {
  player: {
    id: string
    name: string
    premium: { hasGoldClub: boolean; expiresAt: string | null }
  }
  world: { speed: number }
  villages: TradeVillage[]
  shipments: { outgoing: TradeShipment[]; incoming: TradeShipment[] }
  history: TradeShipment[]
  contacts: TradeContact[]
  quickTemplates: QuickTemplate[]
  totals: { merchants: { total: number; free: number } }
}

type MarketOrder = {
  id: string
  type: "SELL" | "BUY"
  offeringResource: string
  offeringAmount: number
  requestResource: string
  requestAmount: number
  player: { playerName: string }
  village: { name: string; x: number; y: number }
  isDemo?: boolean
}

type SimpleVillage = {
  id: string
  name: string
  wood: number
  stone: number
  iron: number
  gold: number
  food: number
  x: number
  y: number
  isDemo?: boolean
}

const RESOURCE_KEYS: Array<keyof ResourceBundle> = ["wood", "stone", "iron", "gold", "food"]

const EMPTY_BUNDLE: ResourceBundle = { wood: 0, stone: 0, iron: 0, gold: 0, food: 0 }

const FALLBACK_MARKET_ORDERS: MarketOrder[] = [
  {
    id: "demo-order-wood-stone",
    type: "SELL",
    offeringResource: "WOOD",
    offeringAmount: 2400,
    requestResource: "STONE",
    requestAmount: 1900,
    player: { playerName: "Lady Maera" },
    village: { name: "Sunspire", x: 512, y: 284 },
    isDemo: true,
  },
  {
    id: "demo-order-gold-iron",
    type: "BUY",
    offeringResource: "GOLD",
    offeringAmount: 120,
    requestResource: "IRON",
    requestAmount: 900,
    player: { playerName: "Guildmaster Rurik" },
    village: { name: "Ironmarch", x: -87, y: 37 },
    isDemo: true,
  },
  {
    id: "demo-order-food-wood",
    type: "SELL",
    offeringResource: "FOOD",
    offeringAmount: 3200,
    requestResource: "WOOD",
    requestAmount: 2800,
    player: { playerName: "Duchess Elys" },
    village: { name: "Greenveil", x: 205, y: -146 },
    isDemo: true,
  },
  {
    id: "demo-order-stone-gold",
    type: "BUY",
    offeringResource: "STONE",
    offeringAmount: 1500,
    requestResource: "GOLD",
    requestAmount: 90,
    player: { playerName: "Baron Caldor" },
    village: { name: "Frostgate", x: -342, y: 410 },
    isDemo: true,
  },
]

const FALLBACK_VILLAGES: SimpleVillage[] = [
  {
    id: "demo-village-emberfall",
    name: "Emberfall",
    wood: 12800,
    stone: 9100,
    iron: 6400,
    gold: 210,
    food: 15800,
    x: 74,
    y: -112,
    isDemo: true,
  },
  {
    id: "demo-village-oakenshield",
    name: "Oakenshield",
    wood: 9800,
    stone: 12200,
    iron: 7100,
    gold: 180,
    food: 13400,
    x: -256,
    y: 89,
    isDemo: true,
  },
  {
    id: "demo-village-stormwatch",
    name: "Stormwatch",
    wood: 7600,
    stone: 6800,
    iron: 9400,
    gold: 260,
    food: 10100,
    x: 342,
    y: 233,
    isDemo: true,
  },
]

const formatNumber = (value: number) => value.toLocaleString()

const minutesToDuration = (minutes: number | null) => {
  if (minutes === null) return "—"
  if (minutes <= 0) return "instant"
  const hrs = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hrs === 0) return `${mins}m`
  return mins === 0 ? `${hrs}h` : `${hrs}h ${mins}m`
}

const formatArrival = (timestamp: string) => {
  if (!timestamp) return "—"
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

const relativeTimeFromNow = (timestamp: string) => {
  if (!timestamp) return ""
  const diffMs = new Date(timestamp).getTime() - Date.now()
  const minutes = Math.round(diffMs / 60000)
  if (minutes <= 0) return "arrived"
  if (minutes < 60) return `in ${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `in ${hours}h ${mins > 0 ? `${mins}m` : ""}`
}

const sumBundle = (bundle: ResourceBundle) => RESOURCE_KEYS.reduce((sum, key) => sum + (bundle[key] ?? 0), 0)

const computeTravelMinutes = (
  village: TradeVillage | null,
  targetX: string,
  targetY: string,
  worldSpeed: number,
) => {
  if (!village || !village.merchants || targetX === "" || targetY === "") return null
  const x = Number(targetX)
  const y = Number(targetY)
  if (Number.isNaN(x) || Number.isNaN(y)) return null
  const distance = Math.hypot(village.x - x, village.y - y)
  if (distance === 0) return 0
  const tilesPerHour = village.merchants.tilesPerHour * Math.max(1, worldSpeed)
  if (!tilesPerHour) return null
  const hours = distance / tilesPerHour
  return Math.max(0, Math.round(hours * 60))
}

const summarizeBundle = (bundle: ResourceBundle) => {
  const parts = RESOURCE_KEYS.filter((key) => bundle[key] > 0).map(
    (key) => `${key.charAt(0).toUpperCase()}${key.slice(1)} ${formatNumber(bundle[key])}`,
  )
  return parts.join(", ") || "—"
}

export default function MarketPage() {
  const { auth, initialized } = useAuth({ redirectOnMissing: true, redirectTo: "/login" })
  const [orders, setOrders] = useState<MarketOrder[]>([])
  const [villages, setVillages] = useState<SimpleVillage[]>(FALLBACK_VILLAGES)
  const [usingMockOrders, setUsingMockOrders] = useState(false)
  const [usingMockVillages, setUsingMockVillages] = useState(true)
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [orderError, setOrderError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("trading")

  const [tradeOverview, setTradeOverview] = useState<TradeOverview | null>(null)
  const [tradeLoading, setTradeLoading] = useState(false)
  const [tradeError, setTradeError] = useState<string | null>(null)
  const [selectedVillageId, setSelectedVillageId] = useState<string | null>(null)
  const [destinationVillageId, setDestinationVillageId] = useState<string | null>(null)
  const [targetX, setTargetX] = useState("")
  const [targetY, setTargetY] = useState("")
  const [contactQuery, setContactQuery] = useState("")
  const [resourcesToSend, setResourcesToSend] = useState<ResourceBundle>({ ...EMPTY_BUNDLE })
  const [submittingTrade, setSubmittingTrade] = useState(false)
  const [cancellingShipmentId, setCancellingShipmentId] = useState<string | null>(null)
  const [calculatorSelection, setCalculatorSelection] = useState<string[]>([])
  const [calculatorTarget, setCalculatorTarget] = useState<ResourceBundle>({ wood: 3000, stone: 3000, iron: 3000, gold: 0, food: 0 })
  const [calculatorPlan, setCalculatorPlan] = useState<{ plan: Array<{ villageId: string; villageName: string; bundle: ResourceBundle; merchantsRequired: number }>; remaining: ResourceBundle } | null>(null)

  const fetchOrders = useCallback(async () => {
    try {
      if (!selectedVillageId) {
        setOrderError("Select a village before accepting trades")
        setTimeout(() => setOrderError(null), 5000)
        return
      }
      setLoadingOrders(true)
      const res = await fetch("/api/market/orders")
      const result = await res.json()
      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        setOrders(result.data)
        setUsingMockOrders(false)
      } else {
        setOrders(FALLBACK_MARKET_ORDERS)
        setUsingMockOrders(true)
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error)
      setOrders(FALLBACK_MARKET_ORDERS)
      setUsingMockOrders(true)
    } finally {
      setLoadingOrders(false)
    }
  }, [])

  const fetchTradeOverview = useCallback(async () => {
    if (!auth) return
    try {
      setTradeLoading(true)
      setTradeError(null)
      const res = await fetch("/api/market/trades", {
        headers: { Authorization: `Bearer ${auth.token}` },
      })
      const result = await res.json()
      if (result.success) {
        const overview: TradeOverview = result.data
        setTradeOverview(overview)
        setVillages(
          overview.villages.map((village) => ({
            id: village.id,
            name: village.name,
            wood: village.wood,
            stone: village.stone,
            iron: village.iron,
            gold: village.gold,
            food: village.food,
            x: village.x,
            y: village.y,
          })),
        )
        setUsingMockVillages(false)
        if (!selectedVillageId && overview.villages.length > 0) {
          setSelectedVillageId(overview.villages[0].id)
          setCalculatorSelection(overview.villages.map((village) => village.id))
        }
      } else {
        setTradeError(result.error || "Failed to load trading data")
        setTradeOverview(null)
        setUsingMockVillages(true)
        setVillages(FALLBACK_VILLAGES)
      }
    } catch (error) {
      console.error("Failed to load trading data:", error)
      setTradeError("Failed to load trading data")
      setTradeOverview(null)
      setUsingMockVillages(true)
      setVillages(FALLBACK_VILLAGES)
    } finally {
      setTradeLoading(false)
    }
  }, [auth, selectedVillageId])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  useEffect(() => {
    if (auth) {
      fetchTradeOverview()
    }
  }, [auth, fetchTradeOverview])

  useEffect(() => {
    if (!tradeOverview) return
    if (selectedVillageId && !tradeOverview.villages.some((village) => village.id === selectedVillageId)) {
      setSelectedVillageId(tradeOverview.villages[0]?.id ?? null)
    }
  }, [tradeOverview, selectedVillageId])

  const handleResourcesUpdated = useCallback(async () => {
    await fetchTradeOverview()
  }, [fetchTradeOverview])

  const handleAccept = useCallback(
    async (orderId: string) => {
      const targetOrder = orders.find((order) => order.id === orderId)
      if (targetOrder?.isDemo) {
        setOrderError("Demo orders are for display only. Connect to the live server to trade.")
        setTimeout(() => setOrderError(null), 5000)
        return
      }
      if (!auth) {
        setOrderError("Login required to accept trades")
        setTimeout(() => setOrderError(null), 5000)
        return
      }
      setLoadingOrders(true)
      setOrderError(null)
      try {
        const res = await fetch("/api/market/orders", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({ orderId, action: "ACCEPT", acceptingVillageId: selectedVillageId }),
        })
        const result = await res.json()
        if (result.success) {
          await fetchOrders()
          await fetchTradeOverview()
        } else {
          setOrderError(result.error || "Failed to accept order")
          setTimeout(() => setOrderError(null), 5000)
        }
      } catch (error) {
        console.error("Failed to accept order:", error)
        setOrderError("Failed to accept order")
        setTimeout(() => setOrderError(null), 5000)
      } finally {
        setLoadingOrders(false)
      }
    },
    [orders, auth, selectedVillageId, fetchOrders, fetchTradeOverview],
  )

  const selectedVillage = tradeOverview?.villages.find((village) => village.id === selectedVillageId) || null
  const totalResources = sumBundle(resourcesToSend)
  const merchantsNeeded =
    totalResources > 0 && selectedVillage?.merchants
      ? Math.ceil(totalResources / selectedVillage.merchants.capacityPerMerchant)
      : 0
  const merchantLimit = selectedVillage?.merchants?.free ?? 0
  const merchantWarning = merchantsNeeded > merchantLimit && merchantLimit > 0
  const travelPreviewMinutes = computeTravelMinutes(selectedVillage, targetX, targetY, tradeOverview?.world.speed ?? 1)
  const projectedArrival =
    travelPreviewMinutes !== null ? new Date(Date.now() + travelPreviewMinutes * 60000).toISOString() : null

  const contactOptions = useMemo(() => {
    if (!tradeOverview) {
      return { list: [] as Array<{ label: string; contact: TradeContact }>, lookup: new Map<string, TradeContact>() }
    }
    const lookup = new Map<string, TradeContact>()
    const list = tradeOverview.contacts.map((contact) => {
      const label = `${contact.villageName} (${contact.x}|${contact.y}) — ${contact.playerName}`
      lookup.set(label, contact)
      return { label, contact }
    })
    return { list, lookup }
  }, [tradeOverview])

  const setResourceValue = (key: keyof ResourceBundle, value: number) => {
    setResourcesToSend((prev) => ({ ...prev, [key]: Math.max(0, Math.floor(value)) }))
  }

  const handleTemplateLoad = (template: QuickTemplate) => {
    setDestinationVillageId(template.targetVillageId)
    setTargetX(String(template.coords.x))
    setTargetY(String(template.coords.y))
    setContactQuery(`${template.targetName} (${template.coords.x}|${template.coords.y})`)
    setResourcesToSend({ ...template.bundle })
  }

  const handleSendTrade = async () => {
    if (!auth || !selectedVillageId) {
      setTradeError("Select a village before sending merchants")
      return
    }
    if (totalResources <= 0) {
      setTradeError("Add at least one resource to the shipment")
      return
    }
    if (!destinationVillageId && (targetX === "" || targetY === "")) {
      setTradeError("Provide destination coordinates or select a contact")
      return
    }
    if (merchantWarning) {
      setTradeError("Not enough merchants available for this shipment")
      return
    }
    setSubmittingTrade(true)
    setTradeError(null)
    try {
      const body = {
        fromVillageId: selectedVillageId,
        toVillageId: destinationVillageId ?? undefined,
        toX: destinationVillageId ? undefined : Number(targetX),
        toY: destinationVillageId ? undefined : Number(targetY),
        resources: resourcesToSend,
      }
      const res = await fetch("/api/market/trades", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(body),
      })
      const result = await res.json()
      if (result.success) {
        setResourcesToSend({ ...EMPTY_BUNDLE })
        await fetchTradeOverview()
      } else {
        setTradeError(result.error || "Failed to dispatch merchants")
      }
    } catch (error) {
      console.error("Failed to send trade:", error)
      setTradeError("Failed to send trade")
    } finally {
      setSubmittingTrade(false)
    }
  }

  const handleCancelShipment = async (shipmentId: string) => {
    if (!auth) return
    setCancellingShipmentId(shipmentId)
    try {
      const res = await fetch("/api/market/trades", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ shipmentId, action: "CANCEL" }),
      })
      const result = await res.json()
      if (!result.success) {
        setTradeError(result.error || "Failed to cancel shipment")
      } else {
        await fetchTradeOverview()
      }
    } catch (error) {
      console.error("Failed to cancel shipment:", error)
      setTradeError("Failed to cancel shipment")
    } finally {
      setCancellingShipmentId(null)
    }
  }

  const toggleCalculatorSelection = (villageId: string) => {
    setCalculatorSelection((prev) =>
      prev.includes(villageId) ? prev.filter((id) => id !== villageId) : [...prev, villageId],
    )
  }

  const runCalculator = () => {
    if (!tradeOverview) return
    const selectedVillages = tradeOverview.villages.filter((village) => calculatorSelection.includes(village.id))
    if (selectedVillages.length === 0) {
      setCalculatorPlan(null)
      return
    }
    const remaining: ResourceBundle = { ...calculatorTarget }
    const plan: Array<{ villageId: string; villageName: string; bundle: ResourceBundle; merchantsRequired: number }> = []

    for (const village of selectedVillages) {
      if (!village.merchants || village.merchants.free <= 0) continue
      const allocation: ResourceBundle = { ...EMPTY_BUNDLE }
      RESOURCE_KEYS.forEach((key) => {
        const available = village[key]
        if (available <= 0 || remaining[key] <= 0) return
        const amount = Math.min(remaining[key], available)
        allocation[key] = amount
        remaining[key] -= amount
      })
      let total = sumBundle(allocation)
      if (total === 0) continue
      const maxCapacity = village.merchants.free * village.merchants.capacityPerMerchant
      if (total > maxCapacity) {
        const ratio = maxCapacity / total
        RESOURCE_KEYS.forEach((key) => {
          const scaled = Math.floor(allocation[key] * ratio)
          const refund = allocation[key] - scaled
          allocation[key] = scaled
          remaining[key] += refund
        })
        total = sumBundle(allocation)
      }
      if (total === 0) continue
      const merchantsRequired = Math.ceil(total / village.merchants.capacityPerMerchant)
      plan.push({
        villageId: village.id,
        villageName: village.name,
        bundle: allocation,
        merchantsRequired,
      })
    }

    setCalculatorPlan({ plan, remaining })
  }

  const showingDemoData = usingMockOrders || usingMockVillages

  if (!initialized) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        Loading marketplace...
      </div>
    )
  }

  if (!auth) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        Redirecting to login...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="text-sm hover:underline">
            ← Back
          </Link>
          <h1 className="text-xl font-bold">🏪 Marketplace</h1>
          <Button variant="outline" size="sm" onClick={() => fetchTradeOverview()}>
            Refresh
          </Button>
        </div>
      </header>

      <main className="w-full p-4">
        <div className="max-w-6xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="trading">Trading</TabsTrigger>
              <TabsTrigger value="orders">Market Orders</TabsTrigger>
              <TabsTrigger value="management">Management</TabsTrigger>
            </TabsList>

            <TabsContent value="trading" className="space-y-4">
              {tradeError && (
                <div className="bg-destructive/10 border border-destructive rounded p-3 text-sm text-destructive">
                  {tradeError}
                </div>
              )}
              {tradeLoading && (
                <div className="rounded border border-dashed border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  Loading trading data...
                </div>
              )}
              {tradeOverview && (
                <>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>Merchant Capacity</CardTitle>
                      <CardDescription>
                        {tradeOverview.totals.merchants.free}/{tradeOverview.totals.merchants.total} merchants available across your villages
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Selected village</p>
                        <div className="text-xl font-semibold">
                          {selectedVillage ? selectedVillage.name : "Select a village"}
                        </div>
                        {selectedVillage?.merchants && (
                          <p className="text-sm text-muted-foreground">
                            {selectedVillage.merchants.free}/{selectedVillage.merchants.total} merchants free •{" "}
                            {formatNumber(selectedVillage.merchants.capacityPerMerchant)} capacity each
                            {selectedVillage.merchants.premiumActive && (
                              <span className="text-amber-600"> (+{selectedVillage.merchants.capacityBonusPercentage}% Gold Club)</span>
                            )}
                          </p>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>World speed: x{tradeOverview.world.speed}</p>
                        <p>Premium status: {tradeOverview.player.premium.hasGoldClub ? "Gold Club active" : "Standard"}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Send Resources</CardTitle>
                        <CardDescription>Plan a shipment with automatic merchant + travel calculations.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label>Origin village</Label>
                          <Select value={selectedVillageId ?? ""} onValueChange={setSelectedVillageId}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a village" />
                            </SelectTrigger>
                            <SelectContent>
                              {(tradeOverview?.villages ?? []).map((village) => (
                                <SelectItem key={village.id} value={village.id}>
                                  {village.name} ({village.x}|{village.y})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Destination</Label>
                          <Input
                            list="contacts"
                            placeholder="Search contacts or type coordinates"
                            value={contactQuery}
                            onChange={(event) => {
                              const value = event.target.value
                              setContactQuery(value)
                              const contact = contactOptions.lookup.get(value)
                              if (contact) {
                                setDestinationVillageId(contact.villageId)
                                setTargetX(String(contact.x))
                                setTargetY(String(contact.y))
                              }
                            }}
                          />
                          <datalist id="contacts">
                            {contactOptions.list.map(({ label, contact }) => (
                              <option key={contact.villageId} value={label} />
                            ))}
                          </datalist>
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              type="number"
                              placeholder="X"
                              value={targetX}
                              onChange={(event) => {
                                setTargetX(event.target.value)
                                setDestinationVillageId(null)
                              }}
                            />
                            <Input
                              type="number"
                              placeholder="Y"
                              value={targetY}
                              onChange={(event) => {
                                setTargetY(event.target.value)
                                setDestinationVillageId(null)
                              }}
                            />
                          </div>
                        </div>

                        <div className="space-y-3">
                          {RESOURCE_KEYS.map((key) => (
                            <div key={key}>
                              <div className="flex justify-between text-sm">
                                <Label className="capitalize">{key}</Label>
                                <span className="text-muted-foreground">
                                  {formatNumber(resourcesToSend[key])}/{formatNumber(selectedVillage?.[key] ?? 0)}
                                </span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={selectedVillage ? selectedVillage[key] : 0}
                                step={50}
                                value={resourcesToSend[key]}
                                onChange={(event) => setResourceValue(key, Number(event.target.value))}
                                className="w-full"
                              />
                              <Input
                                type="number"
                                min={0}
                                value={resourcesToSend[key]}
                                onChange={(event) => setResourceValue(key, Number(event.target.value))}
                              />
                            </div>
                          ))}
                        </div>

                        <div className="rounded border border-border p-3 text-sm space-y-1">
                          <div>Total cargo: {formatNumber(totalResources)}</div>
                          <div>
                            Merchants required: {merchantsNeeded || "—"} {merchantWarning && <span className="text-destructive">(insufficient)</span>}
                          </div>
                          <div>
                            Travel time: {minutesToDuration(travelPreviewMinutes)}{" "}
                            {projectedArrival && (
                              <span className="text-muted-foreground">arrives {formatArrival(projectedArrival)} ({relativeTimeFromNow(projectedArrival)})</span>
                            )}
                          </div>
                        </div>

                        <Button disabled={submittingTrade || tradeLoading} onClick={handleSendTrade} className="w-full">
                          {submittingTrade ? "Dispatching..." : "Send Trade"}
                        </Button>
                      </CardContent>
                    </Card>

                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Quick Templates</CardTitle>
                          <CardDescription>Load saved routes for frontline support.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {tradeOverview.quickTemplates.length === 0 && (
                            <p className="text-sm text-muted-foreground">No recent trade routes yet.</p>
                          )}
                          {tradeOverview.quickTemplates.map((template) => (
                            <div key={template.key} className="rounded border border-border p-3">
                              <div className="font-semibold">{template.targetName}</div>
                              <p className="text-sm text-muted-foreground">
                                {summarizeBundle(template.bundle)} • {minutesToDuration(template.travelMinutes)} one-way
                              </p>
                              <Button size="sm" variant="outline" className="mt-2" onClick={() => handleTemplateLoad(template)}>
                                Load template
                              </Button>
                            </div>
                          ))}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Trade Calculator</CardTitle>
                          <CardDescription>Distribute multi-village shipments automatically.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="text-sm text-muted-foreground">Select villages</div>
                          <div className="flex flex-wrap gap-2">
                            {(tradeOverview?.villages ?? []).map((village) => (
                              <Button
                                key={village.id}
                                variant={calculatorSelection.includes(village.id) ? "default" : "outline"}
                                size="sm"
                                onClick={() => toggleCalculatorSelection(village.id)}
                              >
                                {village.name}
                              </Button>
                            ))}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {RESOURCE_KEYS.map((key) => (
                              <div key={key}>
                                <Label className="capitalize">{key}</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={calculatorTarget[key]}
                                  onChange={(event) =>
                                    setCalculatorTarget((prev) => ({ ...prev, [key]: Math.max(0, Number(event.target.value) || 0) }))
                                  }
                                />
                              </div>
                            ))}
                          </div>
                          <Button size="sm" onClick={runCalculator}>
                            Calculate Plan
                          </Button>
                          {calculatorPlan && (
                            <div className="text-sm space-y-2">
                              {calculatorPlan.plan.length === 0 && <p className="text-muted-foreground">No feasible plan found.</p>}
                              {calculatorPlan.plan.map((entry) => (
                                <div key={entry.villageId} className="rounded border border-border p-2">
                                  <div className="font-semibold">{tradeOverview?.villages.find((v) => v.id === entry.villageId)?.name}</div>
                                  <p className="text-muted-foreground">{summarizeBundle(entry.bundle)}</p>
                                  <p>{entry.merchantsRequired} merchants</p>
                                </div>
                              ))}
                              <div className="text-muted-foreground">
                                Remaining need: {summarizeBundle(calculatorPlan.remaining)}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle>Outgoing Trades</CardTitle>
                        <CardDescription>Active shipments from your villages.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {tradeOverview.shipments.outgoing.length === 0 && (
                          <p className="text-sm text-muted-foreground">No outgoing shipments.</p>
                        )}
                        {tradeOverview.shipments.outgoing.map((shipment) => (
                          <div key={shipment.id} className="rounded border border-border p-3 text-sm">
                            <div className="flex justify-between font-semibold">
                              <span>
                                → {shipment.destination.name} ({shipment.destination.x}|{shipment.destination.y})
                              </span>
                              <span>{shipment.status}</span>
                            </div>
                            <div className="text-muted-foreground">
                              Arrives {formatArrival(shipment.arriveAt)} ({relativeTimeFromNow(shipment.arriveAt)})
                            </div>
                            <div>{summarizeBundle(shipment.resources)}</div>
                            {["SCHEDULED", "EN_ROUTE"].includes(shipment.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2"
                                disabled={cancellingShipmentId === shipment.id}
                                onClick={() => handleCancelShipment(shipment.id)}
                              >
                                {cancellingShipmentId === shipment.id ? "Cancelling..." : "Cancel"}
                              </Button>
                            )}
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Incoming Trades</CardTitle>
                        <CardDescription>Support headed to your villages.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {tradeOverview.shipments.incoming.length === 0 && (
                          <p className="text-sm text-muted-foreground">No incoming shipments.</p>
                        )}
                        {tradeOverview.shipments.incoming.map((shipment) => (
                          <div key={shipment.id} className="rounded border border-border p-3 text-sm">
                            <div className="flex justify-between font-semibold">
                              <span>
                                ← {shipment.origin.name} ({shipment.origin.x}|{shipment.origin.y})
                              </span>
                              <span>{shipment.status}</span>
                            </div>
                            <div className="text-muted-foreground">
                              Arrives {formatArrival(shipment.arriveAt)} ({relativeTimeFromNow(shipment.arriveAt)})
                            </div>
                            <div>{summarizeBundle(shipment.resources)}</div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle>Trade History</CardTitle>
                      <CardDescription>Latest completed or cancelled shipments.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {tradeOverview.history.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No history recorded yet.</p>
                      ) : (
                        <TextTable
                          headers={["When", "Direction", "Village", "Resources", "Status"]}
                          rows={tradeOverview.history.slice(0, 10).map((shipment) => [
                            formatArrival(shipment.updatedAt),
                            shipment.direction,
                            shipment.direction === "OUTGOING"
                              ? `${shipment.destination.name} (${shipment.destination.x}|${shipment.destination.y})`
                              : `${shipment.origin.name} (${shipment.origin.x}|${shipment.origin.y})`,
                            summarizeBundle(shipment.resources),
                            shipment.cancelledAt ? "Cancelled" : shipment.status,
                          ])}
                        />
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </TabsContent>

            <TabsContent value="orders" className="space-y-4">
              {showingDemoData && (
                <div className="rounded border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                  Showing demo marketplace data. Connect the API to see live trades and enable interactions.
                </div>
              )}
              {orderError && (
                <div className="bg-destructive/10 border border-destructive rounded p-3 text-sm text-destructive">{orderError}</div>
              )}
              {loadingOrders && <div className="text-center py-4">Processing...</div>}
              {!loadingOrders && (
                <TextTable
                  headers={["Type", "Offering", "Requesting", "Player", "Village", "Actions"]}
                  rows={orders.map((order) => [
                    order.type,
                    `${order.offeringAmount} ${order.offeringResource}`,
                    `${order.requestAmount} ${order.requestResource}`,
                    order.player.playerName,
                    `${order.village.name} (${order.village.x}, ${order.village.y})`,
                    <Button
                      key={order.id}
                      variant="outline"
                      size="sm"
                      disabled={order.isDemo}
                      title={order.isDemo ? "Demo orders cannot be accepted" : undefined}
                      onClick={() => handleAccept(order.id)}
                    >
                      Accept
                    </Button>,
                  ])}
                />
              )}
            </TabsContent>

            <TabsContent value="management" className="space-y-4">
              <NpcMerchant villages={villages} readOnly={usingMockVillages} onResourcesUpdated={handleResourcesUpdated} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { TextTable } from "@/components/game/text-table"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NpcMerchant } from "@/components/game/npc-merchant"

interface MarketOrder {
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
  isDemo?: boolean
}

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

const FALLBACK_VILLAGES: Village[] = [
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

export default function MarketPage() {
  const [orders, setOrders] = useState<MarketOrder[]>([])
  const [villages, setVillages] = useState<Village[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("orders")
  const [usingMockOrders, setUsingMockOrders] = useState(false)
  const [usingMockVillages, setUsingMockVillages] = useState(false)

  const showingDemoData = usingMockOrders || usingMockVillages

  const fetchOrders = async () => {
    try {
      setLoading(true)
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
      setLoading(false)
    }
  }

  const fetchVillages = async () => {
    try {
      // Get player data to find villages
      const playerRes = await fetch("/api/auth/player-data")
      const playerResult = await playerRes.json()

      if (playerResult.success && Array.isArray(playerResult.data?.villages) && playerResult.data.villages.length > 0) {
        setVillages(playerResult.data.villages)
        setUsingMockVillages(false)
      } else {
        setVillages(FALLBACK_VILLAGES)
        setUsingMockVillages(true)
      }
    } catch (error) {
      console.error("Failed to fetch villages:", error)
      setVillages(FALLBACK_VILLAGES)
      setUsingMockVillages(true)
    }
  }

  const handleAccept = async (orderId: string) => {
    const targetOrder = orders.find(order => order.id === orderId)
    if (targetOrder?.isDemo) {
      setError("Demo orders are for display only. Connect to the live server to trade.")
      setTimeout(() => setError(null), 5000)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/market/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action: "ACCEPT" }),
      })
      const result = await res.json()
      if (result.success) {
        await fetchOrders()
        await fetchVillages() // Refresh village data after trade
      } else {
        setError(result.error || "Failed to accept order")
        setTimeout(() => setError(null), 5000)
      }
    } catch (error) {
      console.error("Failed to accept order:", error)
      setError("Failed to accept order")
      setTimeout(() => setError(null), 5000)
    } finally {
      setLoading(false)
    }
  }

  const handleResourcesUpdated = async () => {
    await fetchVillages() // Refresh village data after NPC merchant transaction
  }

  useEffect(() => {
    fetchOrders()
    fetchVillages()
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="text-sm hover:underline">
            ← Back
          </Link>
          <h1 className="text-xl font-bold">🏪 Marketplace</h1>
          <Button variant="outline" size="sm">
            Create Order
          </Button>
        </div>
      </header>

      <main className="w-full p-4">
        <div className="max-w-6xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="orders">Market Orders</TabsTrigger>
              <TabsTrigger value="management">Management</TabsTrigger>
            </TabsList>

            <TabsContent value="orders" className="space-y-4">
              {showingDemoData && (
                <div className="rounded border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                  Showing demo marketplace data. Connect the API to see live trades and enable interactions.
                </div>
              )}
              {error && <div className="bg-destructive/10 border border-destructive rounded p-3 text-sm text-destructive">{error}</div>}
              {loading && <div className="text-center py-4">Processing...</div>}
              {!loading && (
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
              <NpcMerchant
                villages={villages}
                readOnly={usingMockVillages}
                onResourcesUpdated={handleResourcesUpdated}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

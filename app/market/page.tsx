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
}

export default function MarketPage() {
  const [orders, setOrders] = useState<MarketOrder[]>([])
  const [villages, setVillages] = useState<Village[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("orders")

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/market/orders")
      const result = await res.json()
      if (result.success && result.data) {
        setOrders(result.data)
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchVillages = async () => {
    try {
      // Get player data to find villages
      const playerRes = await fetch("/api/auth/player-data")
      const playerResult = await playerRes.json()

      if (playerResult.success && playerResult.data) {
        setVillages(playerResult.data.villages || [])
      }
    } catch (error) {
      console.error("Failed to fetch villages:", error)
    }
  }

  const handleAccept = async (orderId: string) => {
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
                onResourcesUpdated={handleResourcesUpdated}
              />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

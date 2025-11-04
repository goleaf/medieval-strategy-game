"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface MarketOrder {
  id: string
  type: "SELL" | "BUY"
  offeringResource: string
  offeringAmount: number
  requestResource: string
  requestAmount: number
  player: { playerName: string }
}

export default function MarketPage() {
  const [orders, setOrders] = useState<MarketOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch("/api/market/orders")
        const data = await res.json()
        setOrders(data)
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
    const interval = setInterval(fetchOrders, 10000)
    return () => clearInterval(interval)
  }, [])

  const sellOrders = orders.filter((o) => o.type === "SELL")
  const buyOrders = orders.filter((o) => o.type === "BUY")

  return (
    <main className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Global Marketplace</h1>

        {loading ? (
          <Card className="p-6 text-center">Loading marketplace...</Card>
        ) : (
          <Tabs defaultValue="sell" className="space-y-4">
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="sell">Sell Orders ({sellOrders.length})</TabsTrigger>
              <TabsTrigger value="buy">Buy Orders ({buyOrders.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="sell">
              <div className="space-y-3">
                {sellOrders.map((order) => (
                  <Card key={order.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-bold">{order.player.playerName}</p>
                        <p className="text-sm text-muted-foreground">
                          Selling {order.offeringAmount} {order.offeringResource} for {order.requestAmount}{" "}
                          {order.requestResource}
                        </p>
                      </div>
                      <Button size="sm">Accept</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="buy">
              <div className="space-y-3">
                {buyOrders.map((order) => (
                  <Card key={order.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-bold">{order.player.playerName}</p>
                        <p className="text-sm text-muted-foreground">
                          Buying {order.offeringAmount} {order.offeringResource} for {order.requestAmount}{" "}
                          {order.requestResource}
                        </p>
                      </div>
                      <Button size="sm">Accept</Button>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </main>
  )
}

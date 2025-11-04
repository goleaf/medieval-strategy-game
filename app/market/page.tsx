"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Navbar } from "@/components/game/navbar"

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
  const [activeTab, setActiveTab] = useState<"sell" | "buy">("sell")
  const [villages] = useState<any[]>([])

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
  const displayOrders = activeTab === "sell" ? sellOrders : buyOrders

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar
        villages={villages}
        currentVillageId={null}
        onVillageChange={() => {}}
        notificationCount={0}
      />
      
      <main className="flex-1 w-full p-4">
        <div className="w-full max-w-4xl mx-auto space-y-4">
          <h1 className="text-2xl font-bold">Global Marketplace</h1>

          {/* Tab Switcher */}
          <section>
            <div className="flex gap-2 border-b border-border">
              <button
                onClick={() => setActiveTab("sell")}
                className={`px-4 py-2 border-b-2 transition ${
                  activeTab === "sell"
                    ? "border-primary font-bold"
                    : "border-transparent hover:border-border"
                }`}
              >
                Sell Orders ({sellOrders.length})
              </button>
              <button
                onClick={() => setActiveTab("buy")}
                className={`px-4 py-2 border-b-2 transition ${
                  activeTab === "buy"
                    ? "border-primary font-bold"
                    : "border-transparent hover:border-border"
                }`}
              >
                Buy Orders ({buyOrders.length})
              </button>
            </div>
          </section>

          {/* Orders Table */}
          {loading ? (
            <section>
              <p>Loading marketplace...</p>
            </section>
          ) : (
            <section>
              <h2 className="text-lg font-bold mb-2">
                {activeTab === "sell" ? "Sell Orders" : "Buy Orders"}
              </h2>
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr>
                    <th className="border border-border p-2 text-left bg-secondary">Player</th>
                    <th className="border border-border p-2 text-left bg-secondary">Offering</th>
                    <th className="border border-border p-2 text-left bg-secondary">Requesting</th>
                    <th className="border border-border p-2 text-left bg-secondary">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {displayOrders.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="border border-border p-4 text-center text-muted-foreground">
                        No {activeTab === "sell" ? "sell" : "buy"} orders available
                      </td>
                    </tr>
                  ) : (
                    displayOrders.map((order) => (
                      <tr key={order.id}>
                        <td className="border border-border p-2">{order.player.playerName}</td>
                        <td className="border border-border p-2">
                          {order.offeringAmount.toLocaleString()} {order.offeringResource}
                        </td>
                        <td className="border border-border p-2">
                          {order.requestAmount.toLocaleString()} {order.requestResource}
                        </td>
                        <td className="border border-border p-2">
                          <Button size="sm" className="w-full">Accept</Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { TextTable } from "@/components/game/text-table"
import { Button } from "@/components/ui/button"

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

export default function MarketPage() {
  const [orders, setOrders] = useState<MarketOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  useEffect(() => {
    fetchOrders()
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
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
        <div className="max-w-4xl mx-auto space-y-4">
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
        </div>
      </main>
    </div>
  )
}

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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
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
    try {
      const res = await fetch("/api/market/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action: "ACCEPT" }),
      })
      const result = await res.json()
      if (result.success) {
        fetchOrders()
      } else {
        alert(result.error || "Failed to accept order")
      }
    } catch (error) {
      console.error("Failed to accept order:", error)
      alert("Failed to accept order")
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

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
        </div>
      </main>
    </div>
  )
}

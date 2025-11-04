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

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/market/orders")
      const result = await res.json()
      if (result.success && result.data) {
        setOrders(result.data)
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error)
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
        await fetchOrders()
        return { success: true }
      } else {
        return { success: false, error: result.error || "Failed to accept order" }
      }
    } catch (error) {
      console.error("Failed to accept order:", error)
      return { success: false, error: "Failed to accept order" }
    }
  }

  useEffect(() => {
    fetchOrders()
    if (typeof window !== "undefined") {
      (window as any).__marketAcceptHandler = handleAccept
      (window as any).__marketFetchHandler = fetchOrders
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).__marketAcceptHandler
        delete (window as any).__marketFetchHandler
      }
    }
  }, [])

  return (
    <div
      x-data={`{
        orders: ${JSON.stringify(orders)},
        loading: false,
        error: null,
        async init() {
          if (window.__marketFetchHandler) {
            await window.__marketFetchHandler();
            this.orders = ${JSON.stringify(orders)};
          }
        },
        async handleAccept(orderId) {
          this.loading = true;
          this.error = null;
          try {
            if (window.__marketAcceptHandler) {
              const result = await window.__marketAcceptHandler(orderId);
              if (result.success) {
                if (window.__marketFetchHandler) {
                  await window.__marketFetchHandler();
                }
              } else {
                this.error = result.error;
                setTimeout(() => this.error = null, 5000);
              }
            }
          } finally {
            this.loading = false;
          }
        }
      }`}
      className="min-h-screen bg-background text-foreground"
    >
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
          <div x-show="error" className="bg-destructive/10 border border-destructive rounded p-3 text-sm text-destructive" x-text="error" />
          <div x-show="loading" className="text-center py-4">Processing...</div>
          <div x-show="!loading">
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
                  x-on:click={`handleAccept('${order.id}')`}
                >
                  Accept
                </Button>,
              ])}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

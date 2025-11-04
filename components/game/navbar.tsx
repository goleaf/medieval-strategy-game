"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import type { Village, Building } from "@prisma/client"

interface NavbarProps {
  villages: (Village & { buildings: Building[] })[]
  currentVillageId: string | null
  onVillageChange: (villageId: string) => void
  notificationCount?: number
}

export function Navbar({ villages, currentVillageId, onVillageChange, notificationCount = 0 }: NavbarProps) {
  const currentVillage = villages.find((v) => v.id === currentVillageId)
  
  // Calculate farm capacity from FARM building level
  const farmBuilding = currentVillage?.buildings.find((b) => b.type === "FARM")
  const farmLevel = farmBuilding?.level || 0
  const farmCapacity = farmLevel * 240 + 240 // Base 240 + 240 per level
  const farmUsed = currentVillage?.population || 0
  
  // Calculate warehouse capacity from WAREHOUSE building level
  const warehouseBuilding = currentVillage?.buildings.find((b) => b.type === "WAREHOUSE")
  const warehouseLevel = warehouseBuilding?.level || 0
  const warehouseCapacity = warehouseLevel * 10000 + 10000 // Base 10000 + 10000 per level
  const warehouseUsed = (currentVillage?.wood || 0) + (currentVillage?.stone || 0) + (currentVillage?.iron || 0)
  
  return (
    <nav className="w-full border-b border-border bg-card">
      <div className="w-full p-2 space-y-2">
        {/* Village Switcher */}
        <div className="w-full">
          <label htmlFor="village-select" className="sr-only">Select Village</label>
          <select
            id="village-select"
            value={currentVillageId || ""}
            onChange={(e) => onVillageChange(e.target.value)}
            className="w-full p-2 border border-border rounded bg-background text-foreground"
          >
            {villages.map((village) => (
              <option key={village.id} value={village.id}>
                {village.name} ({village.x}, {village.y})
              </option>
            ))}
          </select>
        </div>
        
        {/* Resources Row */}
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="px-2 py-1 bg-secondary rounded">
            🪵 {currentVillage?.wood.toLocaleString() || 0}
          </span>
          <span className="px-2 py-1 bg-secondary rounded">
            🧱 {currentVillage?.stone.toLocaleString() || 0}
          </span>
          <span className="px-2 py-1 bg-secondary rounded">
            ⛓ {currentVillage?.iron.toLocaleString() || 0}
          </span>
          <span className="px-2 py-1 bg-secondary rounded">
            🪙 {currentVillage?.gold.toLocaleString() || 0}
          </span>
        </div>
        
        {/* Farm and Warehouse Row */}
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="px-2 py-1 bg-secondary rounded">
            👨‍🌾 {farmUsed}/{farmCapacity}
          </span>
          <span className="px-2 py-1 bg-secondary rounded">
            📦 {warehouseUsed.toLocaleString()}/{warehouseCapacity.toLocaleString()}
          </span>
        </div>
        
        {/* Notifications */}
        <div className="flex justify-end">
          <Link
            href="/reports"
            className="px-3 py-2 bg-secondary rounded border border-border hover:bg-accent transition"
            aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ""}`}
          >
            🔔 {notificationCount > 0 && <span className="font-bold">({notificationCount})</span>}
          </Link>
        </div>
      </div>
    </nav>
  )
}


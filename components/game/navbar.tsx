"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import type { Village, Building } from "@prisma/client"
import { CentralVillageOverview } from "./central-village-overview"
import { SitterLogin } from "./sitter-login"

interface NavbarProps {
  villages: (Village & { buildings: Building[] })[]
  currentVillageId: string | null
  onVillageChange: (villageId: string) => void
  notificationCount?: number
  playerId: string
}

export function Navbar({ villages, currentVillageId, onVillageChange, notificationCount = 0, playerId }: NavbarProps) {
  const [showCentralOverview, setShowCentralOverview] = useState(false)
  const [showSitterLogin, setShowSitterLogin] = useState(false)
  const [selectedVillageId, setSelectedVillageId] = useState(currentVillageId || '')
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

  useEffect(() => {
    setSelectedVillageId(currentVillageId || '')
  }, [currentVillageId])
  
  return (
    <nav className="w-full border-b border-border bg-card">
      <div className="w-full p-2 space-y-2">
        {/* Village Switcher */}
        <div className="flex gap-2 w-full">
          <div className="flex-1">
            <label htmlFor="village-select" className="sr-only">Select Village</label>
            <select
              id="village-select"
              value={selectedVillageId}
              onChange={(e) => {
                setSelectedVillageId(e.target.value)
                onVillageChange(e.target.value)
              }}
              className="w-full p-2 border border-border rounded bg-background text-foreground"
            >
              {villages.map((village) => (
                <option key={village.id} value={village.id}>
                  {village.name} ({village.x}, {village.y})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowCentralOverview(true)}
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
            title="Central Village Overview"
          >
            📊
          </button>
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
        
        {/* Navigation Links */}
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setShowSitterLogin(true)}
            className="px-3 py-2 bg-secondary rounded border border-border hover:bg-accent transition"
            aria-label="Sitter Login"
          >
            👤 Sitter
          </button>
          <Link
            href="/sitters"
            className="px-3 py-2 bg-secondary rounded border border-border hover:bg-accent transition"
            aria-label="Account Management"
          >
            👥 Sitters
          </Link>
          <Link
            href="/reports"
            className="px-3 py-2 bg-secondary rounded border border-border hover:bg-accent transition"
            aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ""}`}
          >
            🔔 {notificationCount > 0 && <span className="font-bold">({notificationCount})</span>}
          </Link>
        </div>
      </div>

      {/* Central Village Overview Modal */}
      {showCentralOverview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold">Central Village Overview</h2>
              <button
                onClick={() => setShowCentralOverview(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              <CentralVillageOverview
                playerId={playerId}
                onVillageSelect={(villageId) => {
                  onVillageChange(villageId)
                  setShowCentralOverview(false)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Sitter Login Modal */}
      {showSitterLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold">Sitter Login</h2>
              <button
                onClick={() => setShowSitterLogin(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <SitterLogin
                onLoginSuccess={() => setShowSitterLogin(false)}
              />
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}


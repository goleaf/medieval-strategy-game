"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

interface Village {
  id: string
  name: string
  playerName: string
  x: number
  y: number
  isOwn: boolean
  population?: number
  loyalty?: number
  level?: number
}

interface MapData {
  villages: Village[]
  worldSize: { width: number; height: number }
}

export default function MapPage() {
  const [mapData, setMapData] = useState<MapData | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedVillage, setSelectedVillage] = useState<Village | null>(null)
  const [searchX, setSearchX] = useState("")
  const [searchY, setSearchY] = useState("")
  const [searchPlayer, setSearchPlayer] = useState("")

  // Fetch map data
  useEffect(() => {
    const fetchMapData = async () => {
      try {
        setLoading(true)
        const authToken = localStorage.getItem("authToken")
        const playerId = localStorage.getItem("playerId")

        if (!authToken || !playerId) {
          console.error("No auth token or player ID found")
          return
        }

        const res = await fetch("/api/world/map", {
          headers: {
            "Authorization": `Bearer ${authToken}`,
          },
        })

        const data = await res.json()

        if (data.success && data.data) {
          setMapData(data.data)
        }
      } catch (error) {
        console.error("Failed to fetch map:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchMapData()
  }, [])

  // Filter villages based on search criteria
  const filteredVillages = mapData?.villages.filter((village) => {
    const matchesX = searchX === "" || village.x.toString().includes(searchX)
    const matchesY = searchY === "" || village.y.toString().includes(searchY)
    const matchesPlayer = searchPlayer === "" ||
      village.playerName.toLowerCase().includes(searchPlayer.toLowerCase())
    return matchesX && matchesY && matchesPlayer
  }) || []

  // Get villages grouped by continent (simplified)
  const villagesByContinent = filteredVillages.reduce((acc, village) => {
    const continentKey = `${Math.floor(village.x / 50)},${Math.floor(village.y / 50)}`
    if (!acc[continentKey]) {
      acc[continentKey] = []
    }
    acc[continentKey].push(village)
    return acc
  }, {} as Record<string, Village[]>)

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700 p-4 bg-slate-800">
        <div className="flex items-center justify-between">
          <Link href="/dashboard" className="text-sm hover:text-blue-400 flex items-center gap-1">
            ← Back to Dashboard
          </Link>
          <h1 className="text-xl font-bold">🗺️ World Map (Text View)</h1>
          <div className="text-sm text-slate-400">
            World Size: {mapData?.worldSize.width || 0} x {mapData?.worldSize.height || 0}
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Main Map Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-white text-lg">Loading map data...</div>
            </div>
          )}

          {/* Search Controls */}
          <Card className="mb-6 bg-slate-800 border-slate-700">
            <div className="p-4">
              <h3 className="font-bold mb-3">Search Villages</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">X Coordinate</label>
                  <Input
                    type="number"
                    placeholder="Enter X..."
                    value={searchX}
                    onChange={(e) => setSearchX(e.target.value)}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Y Coordinate</label>
                  <Input
                    type="number"
                    placeholder="Enter Y..."
                    value={searchY}
                    onChange={(e) => setSearchY(e.target.value)}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Player Name</label>
                  <Input
                    type="text"
                    placeholder="Enter player name..."
                    value={searchPlayer}
                    onChange={(e) => setSearchPlayer(e.target.value)}
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
              </div>
              <div className="mt-4 text-sm text-slate-400">
                Showing {filteredVillages.length} of {mapData?.villages.length || 0} villages
              </div>
            </div>
          </Card>

          {/* Text-based Map Display */}
          <div className="space-y-6">
            {Object.entries(villagesByContinent).map(([continentKey, villages]) => {
              const [continentX, continentY] = continentKey.split(',').map(Number)
              return (
                <Card key={continentKey} className="bg-slate-800 border-slate-700">
                  <div className="p-4">
                    <h3 className="font-bold mb-4 text-lg">
                      Continent ({continentX * 50}-{continentX * 50 + 49}, {continentY * 50}-{continentY * 50 + 49})
                      <span className="text-sm font-normal text-slate-400 ml-2">
                        ({villages.length} villages)
                      </span>
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {villages.map((village) => (
                        <div
                          key={village.id}
                          className={`p-3 rounded border cursor-pointer transition-colors ${
                            selectedVillage?.id === village.id
                              ? 'border-yellow-400 bg-yellow-400/10'
                              : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                          }`}
                          onClick={() => setSelectedVillage(village)}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">🏰</span>
                            <div className="flex-1">
                              <div className="font-semibold truncate">{village.name}</div>
                              <div className="text-sm text-slate-400 truncate">
                                {village.playerName}
                              </div>
                            </div>
                          </div>
                          <div className="text-xs space-y-1">
                            <div>📍 ({village.x}, {village.y})</div>
                            {village.level && <div>🏛️ Level {village.level}</div>}
                            {village.population && <div>👥 Population: {village.population}</div>}
                            {village.loyalty && <div>❤️ Loyalty: {village.loyalty}%</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>

          {filteredVillages.length === 0 && !loading && (
            <Card className="bg-slate-800 border-slate-700">
              <div className="p-8 text-center">
                <div className="text-slate-400">No villages found matching your search criteria.</div>
              </Card>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-slate-800 border-l border-slate-700 p-4 overflow-y-auto">
          {/* Village Details */}
          {selectedVillage && (
            <Card className="mb-4 bg-slate-700 border-slate-600">
              <div className="p-4">
                <h3 className="font-bold text-lg mb-2">{selectedVillage.name}</h3>
                <div className="space-y-2 text-sm">
                  <div>👤 <strong>Owner:</strong> {selectedVillage.playerName}</div>
                  <div>📍 <strong>Position:</strong> ({selectedVillage.x}, {selectedVillage.y})</div>
                  {selectedVillage.level && (
                    <div>🏛️ <strong>Level:</strong> {selectedVillage.level}</div>
                  )}
                  {selectedVillage.population && (
                    <div>👥 <strong>Population:</strong> {selectedVillage.population}</div>
                  )}
                  {selectedVillage.loyalty && (
                    <div>❤️ <strong>Loyalty:</strong> {selectedVillage.loyalty}%</div>
                  )}
                  <div className={`inline-block px-2 py-1 rounded text-xs mt-2 ${
                    selectedVillage.isOwn ? 'bg-blue-600' : 'bg-red-600'
                  }`}>
                    {selectedVillage.isOwn ? 'Your Village' : 'Enemy Village'}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* World Statistics */}
          <Card className="mb-4 bg-slate-700 border-slate-600">
            <div className="p-4">
              <h3 className="font-bold mb-3">World Statistics</h3>
              <div className="space-y-2 text-sm">
                <div>🌍 <strong>Total Villages:</strong> {mapData?.villages.length || 0}</div>
                <div>👥 <strong>Total Players:</strong> {new Set(mapData?.villages.map(v => v.playerName)).size || 0}</div>
                <div>📐 <strong>World Size:</strong> {mapData?.worldSize.width || 0} x {mapData?.worldSize.height || 0}</div>
              </div>
            </div>
          </Card>

          {/* Legend */}
          <Card className="bg-slate-700 border-slate-600">
            <div className="p-4">
              <h3 className="font-bold mb-3">Legend</h3>
              <div className="space-y-2 text-sm">
                <div>🏰 <strong>Village</strong> - Click to view details</div>
                <div>👤 <strong>Player</strong> - Village owner</div>
                <div>📍 <strong>Coordinates</strong> - Position on map</div>
                <div>🏛️ <strong>Level</strong> - Village development level</div>
                <div>👥 <strong>Population</strong> - Village inhabitants</div>
                <div>❤️ <strong>Loyalty</strong> - Village morale</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

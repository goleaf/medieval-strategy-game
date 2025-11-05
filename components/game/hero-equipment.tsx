"use client"

import { useState, useEffect } from "react"
import { EquipmentSlot, ItemRarity, CraftingActionType } from "@prisma/client"

interface EquipmentData {
  heroId: string
  equipment: Record<string, EquipmentItem | null>
  inventory: InventoryItem[]
}

interface EquipmentItem {
  id: string
  name: string
  rarity: ItemRarity
  qualityTier: number
  effects: Record<string, number>
}

interface InventoryItem {
  id: string
  name: string
  rarity: ItemRarity
  qualityTier: number
  effects: Record<string, number>
  source: string
}

interface CraftingAction {
  id: string
  actionType: CraftingActionType
  status: string
  startedAt: string
  completedAt: string | null
  durationHours: number
  materialRarity?: ItemRarity
  materialCount?: number
  item?: {
    id: string
    name: string
    rarity: ItemRarity
    qualityTier: number
  }
  resultItem?: {
    id: string
    name: string
    rarity: ItemRarity
    qualityTier: number
  }
  materialGained?: number
}

interface Material {
  rarity: ItemRarity
  quantity: number
}

interface ItemTemplate {
  id: string
  name: string
  category: string
  slot: EquipmentSlot
  rarity: ItemRarity
  qualityTier: number
  effects: Record<string, number>
  description?: string
}

interface CraftingData {
  craftingActions: CraftingAction[]
  materials: Material[]
  itemTemplates: ItemTemplate[]
}

const SLOT_ORDER = [
  EquipmentSlot.HELMET,
  EquipmentSlot.ARMOR,
  EquipmentSlot.WEAPON,
  EquipmentSlot.SHIELD,
  EquipmentSlot.BOOTS,
  EquipmentSlot.HORSE
]

const RARITY_COLORS = {
  [ItemRarity.COMMON]: "border-gray-400 bg-gray-100",
  [ItemRarity.UNCOMMON]: "border-green-400 bg-green-100",
  [ItemRarity.RARE]: "border-blue-400 bg-blue-100",
  [ItemRarity.EPIC]: "border-purple-400 bg-purple-100"
}

export function HeroEquipment() {
  const [equipmentData, setEquipmentData] = useState<EquipmentData | null>(null)
  const [craftingData, setCraftingData] = useState<CraftingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<ItemTemplate | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'equipment' | 'crafting'>('equipment')

  useEffect(() => {
    fetchEquipment()
    fetchCraftingData()
  }, [])

  const fetchEquipment = async () => {
    try {
      const response = await fetch("/api/hero/equipment")
      if (response.ok) {
        const data = await response.json()
        setEquipmentData(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch equipment:", error)
    }
  }

  const fetchCraftingData = async () => {
    try {
      const response = await fetch("/api/hero/crafting")
      if (response.ok) {
        const data = await response.json()
        setCraftingData(data.data)
      }
    } catch (error) {
      console.error("Failed to fetch crafting data:", error)
    }
  }

  const refreshData = async () => {
    await Promise.all([fetchEquipment(), fetchCraftingData()])
  }

  const equipItem = async (itemId: string) => {
    setActionLoading(true)
    try {
      const response = await fetch("/api/hero/equipment/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId })
      })

      if (response.ok) {
        await fetchEquipment() // Refresh data
        setSelectedItem(null)
      } else {
        const error = await response.json()
        alert(error.error || "Failed to equip item")
      }
    } catch (error) {
      console.error("Failed to equip item:", error)
      alert("Failed to equip item")
    } finally {
      setActionLoading(false)
    }
  }

  const unequipItem = async (slot: EquipmentSlot) => {
    setActionLoading(true)
    try {
      const response = await fetch("/api/hero/equipment/unequip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot })
      })

      if (response.ok) {
        await fetchEquipment() // Refresh data
      } else {
        const error = await response.json()
        alert(error.error || "Failed to unequip item")
      }
    } catch (error) {
      console.error("Failed to unequip item:", error)
      alert("Failed to unequip item")
    } finally {
      setActionLoading(false)
    }
  }

  const formatEffects = (effects: Record<string, number>) => {
    const effectNames: Record<string, string> = {
      hpRegeneration: "HP Regeneration",
      damageReduction: "Damage Reduction",
      fightingStrength: "Fighting Strength",
      bonusXP: "Bonus XP",
      healthRegenerationPercent: "Health Regen %",
      speedBonusAfter20Tiles: "Speed Bonus (20+ tiles)",
      heroSpeedWithHorse: "Speed with Horse",
      tribeRestriction: "Tribe Restricted"
    }

    return Object.entries(effects).map(([key, value]) => ({
      name: effectNames[key] || key,
      value: typeof value === 'string' ? value : `+${value}${key.includes('Percent') ? '%' : key.includes('Speed') ? '' : ''}`
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-lg">Loading equipment...</div>
      </div>
    )
  }

  if (!equipmentData) {
    return (
      <div className="p-4 text-red-600">
        Failed to load equipment data
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Hero Equipment</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Equipment Slots */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Equipped Items</h2>
          <div className="grid grid-cols-2 gap-4">
            {SLOT_ORDER.map((slot) => {
              const item = equipmentData.equipment[slot]
              return (
                <div
                  key={slot}
                  className={`p-4 border-2 rounded-lg min-h-[120px] ${
                    item ? RARITY_COLORS[item.rarity] : "border-gray-300 bg-gray-50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium capitalize">{slot.toLowerCase()}</h3>
                    {item && (
                      <button
                        onClick={() => unequipItem(slot)}
                        disabled={actionLoading}
                        className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
                      >
                        Unequip
                      </button>
                    )}
                  </div>

                  {item ? (
                    <div className="text-sm">
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-gray-600">
                        {item.rarity} (Tier {item.qualityTier})
                      </div>
                      <div className="mt-2 space-y-1">
                        {formatEffects(item.effects).slice(0, 2).map((effect, idx) => (
                          <div key={idx} className="text-xs">
                            {effect.name}: {effect.value}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-sm">Empty</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Inventory */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Inventory</h2>
          <div className="grid grid-cols-3 gap-3 max-h-96 overflow-y-auto">
            {equipmentData.inventory.map((item) => (
              <div
                key={item.id}
                className={`p-3 border-2 rounded cursor-pointer hover:shadow-md transition-shadow ${
                  RARITY_COLORS[item.rarity]
                }`}
                onClick={() => setSelectedItem(item)}
              >
                <div className="text-xs font-medium mb-1">{item.name}</div>
                <div className="text-xs text-gray-600">
                  {item.rarity} (T{item.qualityTier})
                </div>
              </div>
            ))}
          </div>

          {equipmentData.inventory.length === 0 && (
            <div className="text-gray-500 text-center py-8">
              No items in inventory
            </div>
          )}
        </div>
      </div>

      {/* Item Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-2">{selectedItem.name}</h3>
            <div className="text-sm text-gray-600 mb-4">
              {selectedItem.rarity} Quality Tier {selectedItem.qualityTier}
            </div>

            <div className="mb-4">
              <h4 className="font-medium mb-2">Effects:</h4>
              <div className="space-y-1">
                {formatEffects(selectedItem.effects).map((effect, idx) => (
                  <div key={idx} className="text-sm">
                    <span className="font-medium">{effect.name}:</span> {effect.value}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => equipItem(selectedItem.id)}
                disabled={actionLoading}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {actionLoading ? "Equipping..." : "Equip"}
              </button>
              <button
                onClick={() => setSelectedItem(null)}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

interface ResourceDisplayProps {
  wood: number
  stone: number
  iron: number
  gold: number
  food: number
  woodProduction?: number
  stoneProduction?: number
  ironProduction?: number
  goldProduction?: number
  foodProduction?: number
  capacities?: {
    wood: number
    stone: number
    iron: number
    gold: number
    food: number
  }
  showProduction?: boolean
  showCapacity?: boolean
  className?: string
}

export function ResourceDisplay({
  wood,
  stone,
  iron,
  gold,
  food,
  woodProduction,
  stoneProduction,
  ironProduction,
  goldProduction,
  foodProduction,
  capacities,
  showProduction = false,
  showCapacity = false,
  className = "",
}: ResourceDisplayProps) {
  const formatNumber = (num: number) => num.toLocaleString()
  const getCapacityPercent = (current: number, capacity: number) => {
    if (!capacity) return 0
    return Math.min(100, Math.round((current / capacity) * 100))
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="grid grid-cols-1 gap-1 text-sm">
        <div className="flex items-center justify-between border-b border-border pb-1">
          <span>🪵 Wood</span>
          <div className="flex items-center gap-2">
            <span className="font-mono">{formatNumber(wood)}</span>
            {showCapacity && capacities && (
              <span className="text-xs text-muted-foreground">
                ({getCapacityPercent(wood, capacities.wood)}%)
              </span>
            )}
            {showProduction && woodProduction !== undefined && (
              <span className="text-xs text-green-600">+{woodProduction}/tick</span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between border-b border-border pb-1">
          <span>🧱 Stone</span>
          <div className="flex items-center gap-2">
            <span className="font-mono">{formatNumber(stone)}</span>
            {showCapacity && capacities && (
              <span className="text-xs text-muted-foreground">
                ({getCapacityPercent(stone, capacities.stone)}%)
              </span>
            )}
            {showProduction && stoneProduction !== undefined && (
              <span className="text-xs text-green-600">+{stoneProduction}/tick</span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between border-b border-border pb-1">
          <span>⛓ Iron</span>
          <div className="flex items-center gap-2">
            <span className="font-mono">{formatNumber(iron)}</span>
            {showCapacity && capacities && (
              <span className="text-xs text-muted-foreground">
                ({getCapacityPercent(iron, capacities.iron)}%)
              </span>
            )}
            {showProduction && ironProduction !== undefined && (
              <span className="text-xs text-green-600">+{ironProduction}/tick</span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between border-b border-border pb-1">
          <span>🪙 Gold</span>
          <div className="flex items-center gap-2">
            <span className="font-mono">{formatNumber(gold)}</span>
            {showCapacity && capacities && (
              <span className="text-xs text-muted-foreground">
                ({getCapacityPercent(gold, capacities.gold)}%)
              </span>
            )}
            {showProduction && goldProduction !== undefined && (
              <span className="text-xs text-green-600">+{goldProduction}/tick</span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span>🌾 Food</span>
          <div className="flex items-center gap-2">
            <span className="font-mono">{formatNumber(food)}</span>
            {showCapacity && capacities && (
              <span className="text-xs text-muted-foreground">
                ({getCapacityPercent(food, capacities.food)}%)
              </span>
            )}
            {showProduction && foodProduction !== undefined && (
              <span className="text-xs text-green-600">+{foodProduction}/tick</span>
            )}
          </div>
        </div>
      </div>
      {showCapacity && capacities && (
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          {getCapacityPercent(wood, capacities.wood) > 95 && (
            <div className="text-yellow-600">⚠️ Wood storage nearly full</div>
          )}
          {getCapacityPercent(stone, capacities.stone) > 95 && (
            <div className="text-yellow-600">⚠️ Stone storage nearly full</div>
          )}
          {getCapacityPercent(iron, capacities.iron) > 95 && (
            <div className="text-yellow-600">⚠️ Iron storage nearly full</div>
          )}
          {getCapacityPercent(gold, capacities.gold) > 95 && (
            <div className="text-yellow-600">⚠️ Gold storage nearly full</div>
          )}
          {getCapacityPercent(food, capacities.food) > 95 && (
            <div className="text-yellow-600">⚠️ Food storage nearly full</div>
          )}
        </div>
      )}
    </div>
  )
}


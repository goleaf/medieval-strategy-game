"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Sword, Shield, Zap, Star, Plus, MapPin } from "lucide-react";

interface Hero {
  id: string;
  name: string;
  level: number;
  experience: number;
  health: number;
  attack: number;
  defense: number;
  speed: number;
  adventuresCompleted: number;
  lastAdventureAt?: string;
}

interface HeroItem {
  id: string;
  name: string;
  slot: string;
  rarity: "COMMON" | "UNCOMMON" | "RARE" | "EPIC";
  quality: number;
  attackBonus: number;
  defenseBonus: number;
}

export function HeroManagement() {
  const [hero, setHero] = useState<Hero | null>(null);
  const [equipment, setEquipment] = useState<HeroItem[]>([]);
  const [inventory, setInventory] = useState<HeroItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHeroData();
  }, []);

  const loadHeroData = async () => {
    try {
      const [heroResponse, equipmentResponse, inventoryResponse] = await Promise.all([
        fetch("/api/game/hero"),
        fetch("/api/game/hero/equipment"),
        fetch("/api/game/hero/inventory")
      ]);

      if (heroResponse.ok) {
        const heroData = await heroResponse.json();
        setHero(heroData.hero);
      }

      if (equipmentResponse.ok) {
        const equipmentData = await equipmentResponse.json();
        setEquipment(equipmentData.equipment);
      }

      if (inventoryResponse.ok) {
        const inventoryData = await inventoryResponse.json();
        setInventory(inventoryData.inventory);
      }
    } catch (error) {
      console.error("Failed to load hero data:", error);
    } finally {
      setLoading(false);
    }
  };

  const startAdventure = async () => {
    try {
      const response = await fetch("/api/game/hero/adventure", {
        method: "POST"
      });

      if (response.ok) {
        loadHeroData(); // Refresh data
      }
    } catch (error) {
      console.error("Failed to start adventure:", error);
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "COMMON": return "bg-gray-500";
      case "UNCOMMON": return "bg-green-500";
      case "RARE": return "bg-blue-500";
      case "EPIC": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  const getExperienceProgress = () => {
    if (!hero) return 0;
    // Simple leveling: each level requires level * 100 XP
    const xpForCurrentLevel = hero.level * 100;
    const xpForNextLevel = (hero.level + 1) * 100;
    const currentLevelXP = hero.experience - xpForCurrentLevel;
    const xpNeeded = xpForNextLevel - xpForCurrentLevel;
    return Math.min((currentLevelXP / xpNeeded) * 100, 100);
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Card>
    );
  }

  if (!hero) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Sword className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Hero Yet</h3>
          <p className="text-gray-500 mb-4">Create your first hero to begin your Reign of Fire journey!</p>
          <Button onClick={() => {/* TODO: Implement hero creation */}}>
            Create Hero
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Stats */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold">{hero.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">Level {hero.level}</Badge>
              <Badge variant="outline">Adventures: {hero.adventuresCompleted}</Badge>
            </div>
          </div>
          <Button onClick={startAdventure} className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Start Adventure
          </Button>
        </div>

        {/* Experience Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Experience</span>
            <span>{hero.experience} XP</span>
          </div>
          <Progress value={getExperienceProgress()} className="h-2" />
        </div>

        {/* Hero Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-100 rounded">
              <Shield className="h-4 w-4 text-red-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Health</div>
              <div className="font-semibold">{hero.health}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-2 bg-orange-100 rounded">
              <Sword className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Attack</div>
              <div className="font-semibold">{hero.attack}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded">
              <Shield className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Defense</div>
              <div className="font-semibold">{hero.defense}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-100 rounded">
              <Zap className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Speed</div>
              <div className="font-semibold">{hero.speed}</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Equipment */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Equipment</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.map((item) => (
            <div key={item.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{item.name}</h4>
                <Badge className={getRarityColor(item.rarity)}>
                  {item.rarity}
                </Badge>
              </div>
              <div className="text-sm text-gray-600 mb-2">{item.slot}</div>
              <div className="flex gap-2 text-xs">
                {item.attackBonus > 0 && (
                  <span className="text-orange-600">+{item.attackBonus} ATK</span>
                )}
                {item.defenseBonus > 0 && (
                  <span className="text-blue-600">+{item.defenseBonus} DEF</span>
                )}
              </div>
            </div>
          ))}
          {equipment.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              No equipment equipped
            </div>
          )}
        </div>
      </Card>

      {/* Inventory */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Inventory</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {inventory.map((item) => (
            <div key={item.id} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">{item.name}</h4>
                <Badge className={getRarityColor(item.rarity)}>
                  {item.rarity}
                </Badge>
              </div>
              <div className="text-sm text-gray-600 mb-2">{item.slot}</div>
              <div className="flex gap-2 text-xs">
                {item.attackBonus > 0 && (
                  <span className="text-orange-600">+{item.attackBonus} ATK</span>
                )}
                {item.defenseBonus > 0 && (
                  <span className="text-blue-600">+{item.defenseBonus} DEF</span>
                )}
              </div>
              <Button size="sm" className="mt-2 w-full">
                Equip
              </Button>
            </div>
          ))}
          {inventory.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              No items in inventory
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}


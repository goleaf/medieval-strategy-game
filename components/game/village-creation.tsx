"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MapPin, Plus, Users, Crown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VillageCreationProps {
  playerId: string;
  onVillageCreated: () => void;
  existingVillagesCount: number;
}

interface Continent {
  id: string;
  name: string;
}

interface Tribe {
  id: string;
  name: string;
  description: string;
}

export function VillageCreation({ playerId, onVillageCreated, existingVillagesCount }: VillageCreationProps) {
  const [continents, setContinents] = useState<Continent[]>([]);
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [selectedContinent, setSelectedContinent] = useState<string>("");
  const [selectedTribe, setSelectedTribe] = useState<string>("");
  const [villageName, setVillageName] = useState("");
  const [x, setX] = useState<number>(0);
  const [y, setY] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Allow tribe selection for first 3 villages (Reign of Fire feature)
  const canSelectTribe = existingVillagesCount < 3;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [continentsResponse, tribesResponse] = await Promise.all([
        fetch("/api/continents"),
        fetch("/api/tribes")
      ]);

      if (continentsResponse.ok) {
        const continentsData = await continentsResponse.json();
        setContinents(continentsData.continents || []);
      }

      if (tribesResponse.ok) {
        const tribesData = await tribesResponse.json();
        if (tribesData.success && tribesData.data) {
          setTribes(tribesData.data.tribes || []);
        } else {
          setTribes([]);
        }
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    }
  };

  const handleCreateVillage = async () => {
    if (!selectedContinent || !villageName.trim() || x < 0 || y < 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields with valid values.",
        variant: "destructive",
      });
      return;
    }

    // Reign of Fire: Tribe selection required for first 3 villages
    if (canSelectTribe && !selectedTribe) {
      toast({
        title: "Error",
        description: "Please select a tribe for your new village.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/villages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerId,
          continentId: selectedContinent,
          name: villageName.trim(),
          x,
          y,
          selectedTribe: canSelectTribe ? selectedTribe : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: `Village "${villageName}" created successfully!`,
        });

        // Reset form
        setVillageName("");
        setX(0);
        setY(0);
        setSelectedTribe("");

        onVillageCreated();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create village.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Network error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRandomPosition = () => {
    if (!selectedContinent) return;

    // Generate random position within continent bounds
    // This is a simple implementation - in a real game you'd check for available spots
    const baseX = Math.floor(Math.random() * 50) + 10;
    const baseY = Math.floor(Math.random() * 50) + 10;

    setX(baseX);
    setY(baseY);
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Create New Village
        </CardTitle>
        <p className="text-sm text-gray-600">
          Expand your kingdom by founding new villages
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Village Name */}
        <div className="space-y-2">
          <Label htmlFor="villageName">Village Name</Label>
          <Input
            id="villageName"
            value={villageName}
            onChange={(e) => setVillageName(e.target.value)}
            placeholder="Enter village name"
            maxLength={50}
          />
        </div>

        {/* Continent Selection */}
        <div className="space-y-2">
          <Label htmlFor="continent">Continent</Label>
          <Select value={selectedContinent} onValueChange={setSelectedContinent}>
            <SelectTrigger>
              <SelectValue placeholder="Select continent" />
            </SelectTrigger>
            <SelectContent>
              {continents.map((continent) => (
                <SelectItem key={continent.id} value={continent.id}>
                  {continent.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tribe Selection (Reign of Fire - first 3 villages) */}
        {canSelectTribe && (
          <div className="space-y-2">
            <Label htmlFor="tribe" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Tribe Selection
              <Badge variant="secondary" className="text-xs">
                Reign of Fire
              </Badge>
            </Label>
            <Select value={selectedTribe} onValueChange={setSelectedTribe}>
              <SelectTrigger>
                <SelectValue placeholder="Choose your tribe" />
              </SelectTrigger>
              <SelectContent>
                {tribes.map((tribe) => (
                  <SelectItem key={tribe.id} value={tribe.name}>
                    <div className="flex flex-col">
                      <span className="font-medium">{tribe.name}</span>
                      <span className="text-xs text-gray-500">{tribe.description.substring(0, 60)}...</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-600">
              You can change your tribe when creating your first 3 villages.
            </p>
          </div>
        )}

        {/* Position */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Position
          </Label>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="number"
                value={x}
                onChange={(e) => setX(parseInt(e.target.value) || 0)}
                placeholder="X"
                min={0}
                max={1000}
              />
            </div>
            <div className="flex-1">
              <Input
                type="number"
                value={y}
                onChange={(e) => setY(parseInt(e.target.value) || 0)}
                placeholder="Y"
                min={0}
                max={1000}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={getRandomPosition}
              disabled={!selectedContinent}
            >
              Random
            </Button>
          </div>
        </div>

        {/* Village Info */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <div className="text-sm text-blue-800 space-y-1">
            <div className="flex items-center gap-2">
              <Crown className="h-4 w-4" />
              <span>This will be a secondary village</span>
            </div>
            <div className="text-xs">
              Requires culture points to create (checked server-side)
            </div>
            {canSelectTribe && selectedTribe && (
              <div className="text-xs font-medium">
                Tribe will be set to: {selectedTribe}
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <Button
          onClick={handleCreateVillage}
          disabled={loading || !selectedContinent || !villageName.trim()}
          className="w-full"
        >
          {loading ? "Creating..." : "Create Village"}
        </Button>
      </CardContent>
    </Card>
  );
}

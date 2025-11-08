"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MapPin, Send, Users, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Village {
  id: string;
  name: string;
  x: number;
  y: number;
  playerId: string;
  player: {
    playerName: string;
  };
}

interface Troop {
  id: string;
  type: string;
  quantity: number;
  speed: number;
}

interface ForwardTroopsProps {
  villages: Village[];
  currentVillageId: string;
  playerId: string;
}

export function TroopForwarding({ villages, currentVillageId, playerId }: ForwardTroopsProps) {
  const [selectedDestination, setSelectedDestination] = useState<string>("");
  const [troopAmounts, setTroopAmounts] = useState<Record<string, number>>({});
  const [availableTroops, setAvailableTroops] = useState<Troop[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAvailableTroops = useCallback(async () => {
    try {
      const response = await fetch(`/api/game/villages/${currentVillageId}/troops`);
      if (response.ok) {
        const data = await response.json();
        setAvailableTroops(data.troops || []);
      }
    } catch (error) {
      console.error("Failed to fetch troops:", error);
    }
  }, [currentVillageId]);

  // Get available troops for current village
  useEffect(() => {
    if (currentVillageId) {
      fetchAvailableTroops();
    }
  }, [currentVillageId, fetchAvailableTroops]);

  // Filter available destination villages (own villages + allies)
  const availableDestinations = villages.filter(village =>
    village.id !== currentVillageId // Exclude current village
  );

  const handleTroopAmountChange = (troopType: string, amount: number) => {
    setTroopAmounts(prev => ({
      ...prev,
      [troopType]: Math.max(0, Math.min(amount, getMaxTroops(troopType)))
    }));
  };

  const getMaxTroops = (troopType: string) => {
    const troop = availableTroops.find(t => t.type === troopType);
    return troop?.quantity || 0;
  };

  const getTotalTroops = () => {
    return Object.values(troopAmounts).reduce((sum, amount) => sum + amount, 0);
  };

  const calculateTravelTime = () => {
    if (!selectedDestination) return "Select destination";

    const destination = villages.find(v => v.id === selectedDestination);
    const current = villages.find(v => v.id === currentVillageId);

    if (!destination || !current) return "Unknown";

    const distance = Math.sqrt(
      Math.pow(destination.x - current.x, 2) +
      Math.pow(destination.y - current.y, 2)
    );

    // Simple calculation: distance / average speed (assuming speed 5)
    const travelTime = Math.ceil(distance / 5);
    return `${travelTime} minutes`;
  };

  const handleForwardTroops = async () => {
    if (!selectedDestination || getTotalTroops() === 0) {
      toast({
        title: "Error",
        description: "Please select a destination and troops to forward.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/game/troops/forward", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromVillageId: currentVillageId,
          toVillageId: selectedDestination,
          troops: troopAmounts,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Success",
          description: "Troops have been forwarded successfully!",
        });

        // Reset form
        setSelectedDestination("");
        setTroopAmounts({});
        fetchAvailableTroops(); // Refresh available troops
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to forward troops.",
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

  const getOwnershipIcon = (village: Village) => {
    if (village.playerId === playerId) {
      return <MapPin className="h-4 w-4 text-green-600" />;
    } else {
      return <Users className="h-4 w-4 text-blue-600" />;
    }
  };

  const getOwnershipLabel = (village: Village) => {
    if (village.playerId === playerId) {
      return "Your Village";
    } else {
      return `Ally: ${village.player.playerName}`;
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Troop Forwarding (Reign of Fire)
        </CardTitle>
        <p className="text-sm text-gray-600">
          Send troops between your villages or allied villages. Troops will merge automatically upon arrival.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Destination Selection */}
        <div className="space-y-2">
          <Label htmlFor="destination">Destination Village</Label>
          <Select value={selectedDestination} onValueChange={setSelectedDestination}>
            <SelectTrigger>
              <SelectValue placeholder="Select destination village" />
            </SelectTrigger>
            <SelectContent>
              {availableDestinations.map((village) => (
                <SelectItem key={village.id} value={village.id}>
                  <div className="flex items-center gap-2">
                    {getOwnershipIcon(village)}
                    <span>{village.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {getOwnershipLabel(village)}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Troop Selection */}
        <div className="space-y-4">
          <Label>Troops to Forward</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableTroops.map((troop) => (
              <div key={troop.type} className="flex items-center gap-3 p-3 border rounded">
                <div className="flex-1">
                  <div className="font-medium">{troop.type}</div>
                  <div className="text-sm text-gray-600">
                    Available: {troop.quantity}
                  </div>
                </div>
                <div className="w-20">
                  <Input
                    type="number"
                    min="0"
                    max={troop.quantity}
                    value={troopAmounts[troop.type] || 0}
                    onChange={(e) => handleTroopAmountChange(troop.type, parseInt(e.target.value) || 0)}
                    placeholder="0"
                  />
                </div>
              </div>
            ))}
          </div>

          {availableTroops.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              No troops available in this village
            </div>
          )}
        </div>

        {/* Summary */}
        {getTotalTroops() > 0 && selectedDestination && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800 font-medium mb-2">
              <Clock className="h-4 w-4" />
              Forwarding Summary
            </div>
            <div className="text-sm text-blue-700 space-y-1">
              <div>Total troops: {getTotalTroops()}</div>
              <div>Estimated travel time: {calculateTravelTime()}</div>
              <div className="text-xs mt-2">
                Troops will automatically merge into the destination village upon arrival.
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={handleForwardTroops}
          disabled={loading || !selectedDestination || getTotalTroops() === 0}
          className="w-full"
        >
          {loading ? "Forwarding..." : "Forward Troops"}
        </Button>
      </CardContent>
    </Card>
  );
}

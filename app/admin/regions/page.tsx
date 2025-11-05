"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MapPin, Crown, Shield, Target, RefreshCw } from "lucide-react";

interface Region {
  id: string;
  name: string;
  regionCode: string;
  centerX: number;
  centerY: number;
  radius: number;
  victoryPoints: number;
  controllingPlayerId?: string;
  controllingPlayer?: {
    playerName: string;
  };
  regionType: "NORMAL" | "CAPITAL" | "BORDER" | "STRATEGIC";
  population: number;
}

export default function RegionsAdmin() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRegions();
  }, []);

  const loadRegions = async () => {
    try {
      const response = await fetch("/api/admin/regions");
      if (response.ok) {
        const data = await response.json();
        setRegions(data.regions);
      }
    } catch (error) {
      console.error("Failed to load regions:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateRegions = async () => {
    try {
      const response = await fetch("/api/admin/regions/generate", {
        method: "POST"
      });

      if (response.ok) {
        loadRegions();
      }
    } catch (error) {
      console.error("Failed to generate regions:", error);
    }
  };

  const getRegionTypeIcon = (type: string) => {
    switch (type) {
      case "CAPITAL": return <Crown className="h-4 w-4" />;
      case "STRATEGIC": return <Target className="h-4 w-4" />;
      case "BORDER": return <Shield className="h-4 w-4" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  const getRegionTypeColor = (type: string) => {
    switch (type) {
      case "CAPITAL": return "bg-purple-100 text-purple-800";
      case "STRATEGIC": return "bg-red-100 text-red-800";
      case "BORDER": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reign of Fire - Regions Management</h1>
          <p className="text-gray-600">Manage the 87 conquerable regions that produce Victory Points</p>
        </div>
        <Button onClick={generateRegions} className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Generate Regions
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Regions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{regions.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Controlled Regions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {regions.filter(r => r.controllingPlayerId).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total VP Production</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {regions.reduce((sum, r) => sum + r.victoryPoints, 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Capital Regions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {regions.filter(r => r.regionType === "CAPITAL").length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Regions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>VP Production</TableHead>
                <TableHead>Population</TableHead>
                <TableHead>Controller</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regions.map((region) => (
                <TableRow key={region.id}>
                  <TableCell className="font-mono">{region.regionCode}</TableCell>
                  <TableCell className="font-medium">{region.name}</TableCell>
                  <TableCell>
                    <Badge className={`${getRegionTypeColor(region.regionType)} flex items-center gap-1`}>
                      {getRegionTypeIcon(region.regionType)}
                      {region.regionType}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono">
                    ({region.centerX}, {region.centerY})
                  </TableCell>
                  <TableCell className="font-bold text-blue-600">
                    {region.victoryPoints}
                  </TableCell>
                  <TableCell>{region.population.toLocaleString()}</TableCell>
                  <TableCell>
                    {region.controllingPlayer ? (
                      <Badge variant="secondary">
                        {region.controllingPlayer.playerName}
                      </Badge>
                    ) : (
                      <span className="text-gray-500">Uncontrolled</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {regions.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No regions found. Click "Generate Regions" to create the 87 Ancient Europe regions.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


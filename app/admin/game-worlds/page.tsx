"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { GameWorldManager } from "@/components/admin/game-world-manager"
import { SpeedConfiguration } from "@/components/admin/speed-configuration"
import { TribalWarsWorldPresets } from "@/components/admin/tribal-wars-world-presets"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Globe, Zap, Settings, Users, BarChart3 } from "lucide-react"

export default function GameWorldsAdminPage() {
  const [activeTab, setActiveTab] = useState("worlds")

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Game World Administration
          </h1>
          <p className="text-gray-600">
            Manage Travian: Legends game worlds, speed configurations, and server mechanics
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Add a dedicated tab for Tribal Wars presets so ops can reach the new switchboard quickly. */}
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="worlds" className="flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Game Worlds
            </TabsTrigger>
            <TabsTrigger value="speed" className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Speed Config
            </TabsTrigger>
            <TabsTrigger value="presets" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Tribal Wars Presets
            </TabsTrigger>
            <TabsTrigger value="players" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Player Management
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="worlds" className="space-y-6">
            <GameWorldManager />
          </TabsContent>

          <TabsContent value="speed" className="space-y-6">
            <SpeedConfiguration />
          </TabsContent>

          <TabsContent value="presets" className="space-y-6">
            <TribalWarsWorldPresets />
          </TabsContent>

          <TabsContent value="players" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Player Management
                </CardTitle>
                <CardDescription>
                  Manage players across all game worlds
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Player Management</h3>
                  <p className="text-muted-foreground">
                    Player management features will be available here
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Game Analytics
                </CardTitle>
                <CardDescription>
                  Analytics and insights for game worlds and player behavior
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Game Analytics</h3>
                  <p className="text-muted-foreground">
                    Analytics dashboard will be available here
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}


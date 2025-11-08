"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Settings, User, RotateCcw, AlertTriangle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"

type PlayerData = {
  id: string
  playerName: string
  gameWorldId: string | null
  isDeleted: boolean
  banReason: string | null
  beginnerProtectionUntil: string | null
  tribeId: string | null
  hero: { adventuresCompleted: number } | null
  Village: Array<{ id: string }>
}

type GameWorldData = {
  isRegistrationOpen: boolean
  isActive: boolean
}

type RespawnConditions = {
  canRespawn: boolean
  reasons: string[]
}

export default function SettingsPage() {
  const router = useRouter()
  const [player, setPlayer] = useState<PlayerData | null>(null)
  const [gameWorld, setGameWorld] = useState<GameWorldData | null>(null)
  const [loading, setLoading] = useState(true)
  const [respawnConditions, setRespawnConditions] = useState<RespawnConditions>({ canRespawn: false, reasons: [] })

  // Respawn dialog state
  const [showRespawnDialog, setShowRespawnDialog] = useState(false)
  const [respawnConfirmText, setRespawnConfirmText] = useState("")
  const [selectedMapQuarter, setSelectedMapQuarter] = useState("")
  const [selectedTribe, setSelectedTribe] = useState("")
  const [newPlayerName, setNewPlayerName] = useState("")
  const [respawning, setRespawning] = useState(false)

  const fetchPlayerData = useCallback(async () => {
    try {
      const authToken = localStorage.getItem("authToken")
      const playerId = localStorage.getItem("playerId")

      if (!authToken || !playerId) {
        router.push("/login")
        return
      }

      const res = await fetch(`/api/auth/player-data`, {
        headers: {
          "Authorization": `Bearer ${authToken}`,
        },
      })

      const data = await res.json()
      if (data.success) {
        setPlayer(data.data.player)
        setGameWorld(data.data.gameWorld)
        checkRespawnConditions(data.data.player, data.data.gameWorld)
      }
    } catch (error) {
      console.error("Failed to fetch player data:", error)
    } finally {
      setLoading(false)
    }
  }, [router])

  const checkRespawnConditions = (player: PlayerData, gameWorld: GameWorldData) => {
    const reasons: string[] = []

    // Check all conditions from Travian documentation
    if (!gameWorld.isRegistrationOpen) {
      reasons.push("Game world registration is closed")
    }

    if (player.isDeleted) {
      reasons.push("Avatar is scheduled for deletion")
    }

    if (player.banReason) {
      reasons.push("Avatar is banned")
    }

    if (!player.beginnerProtectionUntil || new Date(player.beginnerProtectionUntil) < new Date()) {
      reasons.push("Beginner protection has expired")
    }

    // Check if auction house is unlocked (hero completed enough adventures)
    // Travian has 20 adventures to unlock auction house
    if (player.hero && player.hero.adventuresCompleted >= 20) {
      reasons.push("Auction house is fully unlocked")
    }

    if (player.Village.length !== 1) {
      reasons.push("Must have exactly one village")
    }

    setRespawnConditions({
      canRespawn: reasons.length === 0,
      reasons
    })
  }

  const handleRespawn = async () => {
    if (respawnConfirmText !== "respawn") {
      alert("Please type 'respawn' to confirm")
      return
    }

    if (!selectedMapQuarter || !selectedTribe || !newPlayerName.trim()) {
      alert("Please fill in all fields")
      return
    }

    setRespawning(true)
    try {
      const authToken = localStorage.getItem("authToken")

      const res = await fetch("/api/auth/respawn", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          mapQuarter: selectedMapQuarter,
          tribe: selectedTribe,
          playerName: newPlayerName.trim(),
        }),
      })

      const data = await res.json()

      if (data.success) {
        alert("Avatar respawned successfully! You will be redirected to login.")
        localStorage.removeItem("authToken")
        localStorage.removeItem("playerId")
        router.push("/login")
      } else {
        alert(data.error || "Failed to respawn avatar")
      }
    } catch (error) {
      console.error("Respawn failed:", error)
      alert("Failed to respawn avatar")
    } finally {
      setRespawning(false)
      setShowRespawnDialog(false)
      setRespawnConfirmText("")
    }
  }

  useEffect(() => {
    fetchPlayerData()
  }, [fetchPlayerData])

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">Loading settings...</div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">Unable to load player data</p>
          <Button onClick={() => router.push("/dashboard")}>Return to Dashboard</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <h1 className="text-xl font-bold">Settings</h1>
          </div>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4">
        <Tabs defaultValue="avatar" className="space-y-4">
          <TabsList>
            <TabsTrigger value="avatar" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Avatar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="avatar" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Avatar Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Player Name</Label>
                    <div className="text-sm text-muted-foreground mt-1">
                      {player.playerName}
                    </div>
                  </div>
                  <div>
                    <Label>Game World</Label>
                    <div className="text-sm text-muted-foreground mt-1">
                      {gameWorld?.isActive ? "Active" : "Inactive"}
                    </div>
                  </div>
                  <div>
                    <Label>Villages</Label>
                    <div className="text-sm text-muted-foreground mt-1">
                      {player.Village.length}
                    </div>
                  </div>
                  <div>
                    <Label>Beginner Protection</Label>
                    <div className="text-sm text-muted-foreground mt-1">
                      {player.beginnerProtectionUntil
                        ? new Date(player.beginnerProtectionUntil) > new Date()
                          ? "Active"
                          : "Expired"
                        : "Not set"
                      }
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        <RotateCcw className="w-4 h-4" />
                        Respawn Avatar
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Abandon your current avatar and start fresh with a new village
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => setShowRespawnDialog(true)}
                      disabled={!respawnConditions.canRespawn}
                    >
                      Respawn Avatar
                    </Button>
                  </div>

                  {!respawnConditions.canRespawn && respawnConditions.reasons.length > 0 && (
                    <Alert className="mt-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Cannot respawn because:</strong>
                        <ul className="list-disc list-inside mt-2 space-y-1">
                          {respawnConditions.reasons.map((reason, index) => (
                            <li key={index}>{reason}</li>
                          ))}
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Respawn Confirmation Dialog */}
      <Dialog open={showRespawnDialog} onOpenChange={setShowRespawnDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Confirm Avatar Respawn
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> This action cannot be undone. Your current avatar and village will be abandoned,
                and you will start fresh with a new village. Only purchased Gold will be transferred to your new avatar.
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div>
                <Label htmlFor="mapQuarter">Map Quarter</Label>
                <select
                  id="mapQuarter"
                  value={selectedMapQuarter}
                  onChange={(e) => setSelectedMapQuarter(e.target.value)}
                  className="w-full p-2 border border-border rounded bg-background mt-1"
                >
                  <option value="">Select map quarter...</option>
                  <option value="NW">North West</option>
                  <option value="NE">North East</option>
                  <option value="SW">South West</option>
                  <option value="SE">South East</option>
                </select>
              </div>

              <div>
                <Label htmlFor="tribe">Tribe</Label>
                <select
                  id="tribe"
                  value={selectedTribe}
                  onChange={(e) => setSelectedTribe(e.target.value)}
                  className="w-full p-2 border border-border rounded bg-background mt-1"
                >
                  <option value="">Select tribe...</option>
                  <option value="ROMANS">Romans</option>
                  <option value="TEUTONS">Teutons</option>
                  <option value="GAULS">Gauls</option>
                  <option value="HUNS">Huns</option>
                  <option value="EGYPTIANS">Egyptians</option>
                  <option value="SPARTANS">Spartans</option>
                  <option value="VIKINGS">Vikings</option>
                </select>
              </div>

              <div>
                <Label htmlFor="playerName">New Player Name</Label>
                <Input
                  id="playerName"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Enter new player name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="confirmText">
                  Type "respawn" to confirm
                </Label>
                <Input
                  id="confirmText"
                  value={respawnConfirmText}
                  onChange={(e) => setRespawnConfirmText(e.target.value)}
                  placeholder="respawn"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRespawnDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRespawn}
              disabled={respawning || respawnConfirmText !== "respawn" || !selectedMapQuarter || !selectedTribe || !newPlayerName.trim()}
            >
              {respawning ? "Respawning..." : "Confirm Respawn"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

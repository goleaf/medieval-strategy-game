"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Shield, Settings, Info } from "lucide-react"

interface RallyPointProps {
  villageId: string
  isCapital: boolean
  troopEvasionEnabled: boolean
  onEvasionToggle: (enabled: boolean) => Promise<void>
}

interface IncomingAttack {
  id: string
  fromVillageName: string
  arrivalAt: string
  type: string
}

export function RallyPoint({ villageId, isCapital, troopEvasionEnabled, onEvasionToggle }: RallyPointProps) {
  const [incomingAttacks, setIncomingAttacks] = useState<IncomingAttack[]>([])
  const [loading, setLoading] = useState(false)
  const [hasGoldClub, setHasGoldClub] = useState(false) // TODO: Check from player data

  useEffect(() => {
    fetchIncomingAttacks()
    checkGoldClubStatus()
  }, [villageId])

  const fetchIncomingAttacks = async () => {
    try {
      const res = await fetch(`/api/villages/${villageId}/attacks?type=incoming`)
      if (res.ok) {
        const data = await res.json()
        setIncomingAttacks(data.data || [])
      }
    } catch (error) {
      console.error("Failed to fetch incoming attacks:", error)
    }
  }

  const checkGoldClubStatus = async () => {
    // TODO: Implement gold club check
    setHasGoldClub(true) // For now, assume all players have gold club
  }

  const handleEvasionToggle = async (checked: boolean) => {
    setLoading(true)
    try {
      await onEvasionToggle(checked)
    } catch (error) {
      console.error("Failed to update evasion settings:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Rally Point - {isCapital ? "Capital" : "Village"} Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Management</h3>
                <p className="text-sm text-muted-foreground">
                  Configure your rally point settings and troop management options.
                </p>
              </div>
              <Settings className="w-5 h-5 text-muted-foreground" />
            </div>

            {/* Troop Evasion Settings - Gold Club Feature */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Troop Evasion (Gold Club Feature)
              </h4>

              {!hasGoldClub ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Troop Evasion is a Gold Club premium feature. Upgrade to Gold Club to access this feature.
                  </AlertDescription>
                </Alert>
              ) : !isCapital ? (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Troop Evasion is only available for capital villages.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="troop-evasion"
                      checked={troopEvasionEnabled}
                      onCheckedChange={handleEvasionToggle}
                      disabled={loading}
                    />
                    <label
                      htmlFor="troop-evasion"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Activate troop evasion for your capital
                    </label>
                  </div>

                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      <strong>How it works:</strong> When an attack is incoming, your troops automatically leave the capital to avoid being destroyed.
                    </p>
                    <p>
                      <strong>Return time:</strong> Troops return 180 seconds (3 minutes) after evasion.
                    </p>
                    <p>
                      <strong>Requirements:</strong> Only works if no other troops are returning within 10 seconds before the attack.
                    </p>
                    <p>
                      <strong>Important:</strong> Only troops trained in the capital will evade. Reinforcements from other players will NOT evade.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incoming Attacks */}
      <Card>
        <CardHeader>
          <CardTitle>Incoming Attacks</CardTitle>
        </CardHeader>
        <CardContent>
          {incomingAttacks.length === 0 ? (
            <p className="text-muted-foreground">No incoming attacks detected.</p>
          ) : (
            <div className="space-y-2">
              {incomingAttacks.map((attack) => (
                <div key={attack.id} className="flex items-center justify-between p-3 border rounded">
                  <div>
                    <p className="font-medium">Attack from {attack.fromVillageName}</p>
                    <p className="text-sm text-muted-foreground">
                      Type: {attack.type} | Arrives: {new Date(attack.arrivalAt).toLocaleString()}
                    </p>
                  </div>
                  {troopEvasionEnabled && isCapital && hasGoldClub && (
                    <div className="text-sm text-green-600 font-medium">
                      Evasion Active
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
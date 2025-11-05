'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Trash2, UserPlus, Clock, AlertTriangle } from 'lucide-react'

interface Sitter {
  id: string
  sitterId: string
  sitterName: string
  lastActiveAt: string
  permissions: {
    canSendRaids: boolean
    canUseResources: boolean
    canBuyAndSpendGold: boolean
  }
  addedAt: string
}

interface SitterManagerProps {
  className?: string
}

export function SitterManager({ className }: SitterManagerProps) {
  const [sitters, setSitters] = useState<Sitter[]>([])
  const [inactivityAllowance, setInactivityAllowance] = useState(14)
  const [lastOwnerActivity, setLastOwnerActivity] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [addingSitter, setAddingSitter] = useState(false)
  const [newSitterName, setNewSitterName] = useState('')
  const [permissions, setPermissions] = useState({
    canSendRaids: false,
    canUseResources: false,
    canBuyAndSpendGold: false
  })

  useEffect(() => {
    fetchSitters()
  }, [])

  const fetchSitters = async () => {
    try {
      const response = await fetch('/api/sitters')
      const data = await response.json()

      if (data.success) {
        setSitters(data.data.sitters)
        setInactivityAllowance(data.data.inactivityAllowance)
        setLastOwnerActivity(data.data.lastOwnerActivity)
      }
    } catch (error) {
      console.error('Error fetching sitters:', error)
    } finally {
      setLoading(false)
    }
  }

  const addSitter = async () => {
    if (!newSitterName.trim()) return

    setAddingSitter(true)
    try {
      // First, find the player by name
      const searchResponse = await fetch(`/api/admin/search?q=${encodeURIComponent(newSitterName)}&type=players&limit=1`)
      const searchData = await searchResponse.json()

      if (!searchData.success || searchData.data.players.length === 0) {
        alert('Player not found')
        return
      }

      const player = searchData.data.players[0]

      const response = await fetch('/api/sitters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sitterId: player.id,
          permissions
        })
      })

      const data = await response.json()

      if (data.success) {
        setNewSitterName('')
        setPermissions({ canSendRaids: false, canUseResources: false, canBuyAndSpendGold: false })
        fetchSitters()
      } else {
        alert(data.error || 'Failed to add sitter')
      }
    } catch (error) {
      console.error('Error adding sitter:', error)
      alert('Failed to add sitter')
    } finally {
      setAddingSitter(false)
    }
  }

  const removeSitter = async (sitterId: string) => {
    if (!confirm('Are you sure you want to remove this sitter?')) return

    try {
      const response = await fetch('/api/sitters/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sitterId })
      })

      const data = await response.json()

      if (data.success) {
        fetchSitters()
      } else {
        alert(data.error || 'Failed to remove sitter')
      }
    } catch (error) {
      console.error('Error removing sitter:', error)
      alert('Failed to remove sitter')
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Sitter Management</h2>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="text-sm">
              Inactivity Allowance: {inactivityAllowance} days
            </span>
          </div>
        </div>

        {inactivityAllowance <= 3 && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Your inactivity allowance is low. At 0 days, all sitters will be deactivated.
            </AlertDescription>
          </Alert>
        )}

        {/* Current Sitters */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3">Current Sitters ({sitters.length}/2)</h3>

          {sitters.length === 0 ? (
            <p className="text-gray-500 text-sm">No active sitters</p>
          ) : (
            <div className="space-y-3">
              {sitters.map((sitter) => (
                <div key={sitter.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{sitter.sitterName}</span>
                      <Badge variant="secondary" className="text-xs">
                        Active
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Last active: {new Date(sitter.lastActiveAt).toLocaleDateString()}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {sitter.permissions.canSendRaids && (
                        <Badge variant="outline" className="text-xs">Send Raids</Badge>
                      )}
                      {sitter.permissions.canUseResources && (
                        <Badge variant="outline" className="text-xs">Use Resources</Badge>
                      )}
                      {sitter.permissions.canBuyAndSpendGold && (
                        <Badge variant="outline" className="text-xs">Spend Gold</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeSitter(sitter.sitterId)}
                    className="ml-4"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Sitter */}
        {sitters.length < 2 && (
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium mb-3">Add New Sitter</h3>

            <div className="space-y-4">
              <div>
                <Label htmlFor="sitterName">Player Name</Label>
                <Input
                  id="sitterName"
                  value={newSitterName}
                  onChange={(e) => setNewSitterName(e.target.value)}
                  placeholder="Enter player name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium">Permissions</Label>
                <div className="space-y-2 mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="canSendRaids"
                      checked={permissions.canSendRaids}
                      onCheckedChange={(checked) =>
                        setPermissions(prev => ({ ...prev, canSendRaids: checked as boolean }))
                      }
                    />
                    <Label htmlFor="canSendRaids" className="text-sm">
                      Can send raids and attacks
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="canUseResources"
                      checked={permissions.canUseResources}
                      onCheckedChange={(checked) =>
                        setPermissions(prev => ({ ...prev, canUseResources: checked as boolean }))
                      }
                    />
                    <Label htmlFor="canUseResources" className="text-sm">
                      Can use village resources
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="canBuyAndSpendGold"
                      checked={permissions.canBuyAndSpendGold}
                      onCheckedChange={(checked) =>
                        setPermissions(prev => ({ ...prev, canBuyAndSpendGold: checked as boolean }))
                      }
                    />
                    <Label htmlFor="canBuyAndSpendGold" className="text-sm">
                      Can buy and spend gold (unlimited)
                    </Label>
                  </div>
                </div>
              </div>

              <Button
                onClick={addSitter}
                disabled={addingSitter || !newSitterName.trim()}
                className="w-full"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {addingSitter ? 'Adding...' : 'Add Sitter'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

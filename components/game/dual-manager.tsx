'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { UserPlus, Trash2, CheckCircle, Clock } from 'lucide-react'

interface Dual {
  id: string
  lobbyUserId: string
  lobbyUsername: string
  invitedAt: string
  acceptedAt: string | null
  isAccepted: boolean
}

interface DualManagerProps {
  className?: string
}

export function DualManager({ className }: DualManagerProps) {
  const [duals, setDuals] = useState<Dual[]>([])
  const [loading, setLoading] = useState(true)
  const [invitingDual, setInvitingDual] = useState(false)
  const [newLobbyUserId, setNewLobbyUserId] = useState('')
  const [newLobbyUsername, setNewLobbyUsername] = useState('')

  useEffect(() => {
    fetchDuals()
  }, [])

  const fetchDuals = async () => {
    try {
      const response = await fetch('/api/duals')
      const data = await response.json()

      if (data.success) {
        setDuals(data.data.duals)
      }
    } catch (error) {
      console.error('Error fetching duals:', error)
    } finally {
      setLoading(false)
    }
  }

  const inviteDual = async () => {
    if (!newLobbyUserId.trim() || !newLobbyUsername.trim()) return

    setInvitingDual(true)
    try {
      const response = await fetch('/api/duals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lobbyUserId: newLobbyUserId,
          lobbyUsername: newLobbyUsername
        })
      })

      const data = await response.json()

      if (data.success) {
        setNewLobbyUserId('')
        setNewLobbyUsername('')
        fetchDuals()
      } else {
        alert(data.error || 'Failed to invite dual')
      }
    } catch (error) {
      console.error('Error inviting dual:', error)
      alert('Failed to invite dual')
    } finally {
      setInvitingDual(false)
    }
  }

  const acceptDual = async (lobbyUserId: string) => {
    try {
      const response = await fetch('/api/duals/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobbyUserId })
      })

      const data = await response.json()

      if (data.success) {
        fetchDuals()
      } else {
        alert(data.error || 'Failed to accept dual invitation')
      }
    } catch (error) {
      console.error('Error accepting dual:', error)
      alert('Failed to accept dual invitation')
    }
  }

  const removeDual = async (lobbyUserId: string) => {
    if (!confirm('Are you sure you want to remove this dual?')) return

    try {
      const response = await fetch('/api/duals/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobbyUserId })
      })

      const data = await response.json()

      if (data.success) {
        fetchDuals()
      } else {
        alert(data.error || 'Failed to remove dual')
      }
    } catch (error) {
      console.error('Error removing dual:', error)
      alert('Failed to remove dual')
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

  const pendingDuals = duals.filter(d => !d.isAccepted)
  const acceptedDuals = duals.filter(d => d.isAccepted)

  return (
    <Card className={className}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Dual Management</h2>
          <div className="text-sm text-gray-600">
            Full account access for trusted players
          </div>
        </div>

        {/* Accepted Duals */}
        <div className="mb-6">
          <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Active Duals ({acceptedDuals.length})
          </h3>

          {acceptedDuals.length === 0 ? (
            <p className="text-gray-500 text-sm">No active duals</p>
          ) : (
            <div className="space-y-3">
              {acceptedDuals.map((dual) => (
                <div key={dual.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{dual.lobbyUsername}</span>
                      <Badge className="text-xs bg-green-100 text-green-800">Active</Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      Accepted: {new Date(dual.acceptedAt!).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeDual(dual.lobbyUserId)}
                    className="ml-4"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Duals */}
        {pendingDuals.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-600" />
              Pending Invitations ({pendingDuals.length})
            </h3>

            <div className="space-y-3">
              {pendingDuals.map((dual) => (
                <div key={dual.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{dual.lobbyUsername}</span>
                      <Badge variant="secondary" className="text-xs">Pending</Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      Invited: {new Date(dual.invitedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => acceptDual(dual.lobbyUserId)}
                    >
                      Accept
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeDual(dual.lobbyUserId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invite New Dual */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-medium mb-3">Invite New Dual</h3>

          <div className="space-y-4">
            <div>
              <Label htmlFor="lobbyUserId">Lobby User ID</Label>
              <Input
                id="lobbyUserId"
                value={newLobbyUserId}
                onChange={(e) => setNewLobbyUserId(e.target.value)}
                placeholder="Enter lobby user ID"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="lobbyUsername">Lobby Username</Label>
              <Input
                id="lobbyUsername"
                value={newLobbyUsername}
                onChange={(e) => setNewLobbyUsername(e.target.value)}
                placeholder="Enter lobby username"
                className="mt-1"
              />
            </div>

            <Button
              onClick={inviteDual}
              disabled={invitingDual || !newLobbyUserId.trim() || !newLobbyUsername.trim()}
              className="w-full"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              {invitingDual ? 'Inviting...' : 'Invite Dual'}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}

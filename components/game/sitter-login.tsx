'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { UserCheck, LogIn, LogOut, AlertTriangle } from 'lucide-react'

interface SitterAccount {
  id: string
  playerName: string
  inactivityAllowance: number
  lastActiveAt: string
}

interface SitterLoginProps {
  className?: string
  onLoginSuccess?: () => void
}

export function SitterLogin({ className, onLoginSuccess }: SitterLoginProps) {
  const [sitterAccounts, setSitterAccounts] = useState<SitterAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [loggingIn, setLoggingIn] = useState(false)
  const [targetPlayerId, setTargetPlayerId] = useState('')
  const [isSitterMode, setIsSitterMode] = useState(false)
  const [currentSitterInfo, setCurrentSitterInfo] = useState<{
    targetPlayerName: string
    permissions: string[]
  } | null>(null)
  const [durationHours, setDurationHours] = useState<number>(24)

  useEffect(() => {
    fetchSitterAccounts()
    checkSitterMode()
  }, [])

  const fetchSitterAccounts = async () => {
    try {
      const response = await fetch('/api/sitters/accounts')
      const data = await response.json()

      if (data.success) {
        setSitterAccounts(data.data.accounts)
      }
    } catch (error) {
      console.error('Error fetching sitter accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkSitterMode = () => {
    // Check if we're currently in sitter mode
    const token = localStorage.getItem('sitter_token')
    const sitterInfo = localStorage.getItem('sitter_info')

    if (token && sitterInfo) {
      try {
        const info = JSON.parse(sitterInfo)
        setIsSitterMode(true)
        setCurrentSitterInfo(info)
      } catch (error) {
        // Invalid sitter info, clear it
        localStorage.removeItem('sitter_token')
        localStorage.removeItem('sitter_info')
      }
    }
  }

  const loginAsSitter = async (playerId: string) => {
    setLoggingIn(true)
    try {
      const response = await fetch('/api/auth/sitter-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetPlayerId: playerId, durationHours })
      })

      const data = await response.json()

      if (data.success) {
        // Store sitter token and info
        localStorage.setItem('sitter_token', data.data.token)
        localStorage.setItem('sitter_info', JSON.stringify({
          targetPlayerName: data.data.targetPlayer.playerName,
          permissions: [] // We'll fetch permissions separately
        }))

        setIsSitterMode(true)
        setCurrentSitterInfo({
          targetPlayerName: data.data.targetPlayer.playerName,
          permissions: []
        })

        onLoginSuccess?.()
        window.location.reload() // Reload to apply sitter session
      } else {
        alert(data.error || 'Failed to login as sitter')
      }
    } catch (error) {
      console.error('Error logging in as sitter:', error)
      alert('Failed to login as sitter')
    } finally {
      setLoggingIn(false)
    }
  }

  const logoutFromSitter = () => {
    localStorage.removeItem('sitter_token')
    localStorage.removeItem('sitter_info')
    setIsSitterMode(false)
    setCurrentSitterInfo(null)
    window.location.reload() // Reload to return to normal session
  }

  if (loading) {
    return (
      <Card className={className}>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </Card>
    )
  }

  if (isSitterMode && currentSitterInfo) {
    return (
      <Card className={className}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Sitter Mode Active</span>
            </div>
            <Button variant="outline" size="sm" onClick={logoutFromSitter}>
              <LogOut className="h-4 w-4 mr-2" />
              Exit Sitter Mode
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm">
              <strong>You are sitting for:</strong> {currentSitterInfo.targetPlayerName}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Some actions may be restricted based on your permissions.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <div className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <UserCheck className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Sitter Login</h2>
        </div>

        {sitterAccounts.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No sitter accounts available. Ask account owners to add you as a sitter.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Select an account to sit for:
            </p>

            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-gray-700">Duration:</span>
              <button className={`px-2 py-1 border rounded ${durationHours===8?'bg-blue-50':''}`} onClick={() => setDurationHours(8)}>8h</button>
              <button className={`px-2 py-1 border rounded ${durationHours===24?'bg-blue-50':''}`} onClick={() => setDurationHours(24)}>24h</button>
              <button className={`px-2 py-1 border rounded ${durationHours===72?'bg-blue-50':''}`} onClick={() => setDurationHours(72)}>3d</button>
            </div>

            {sitterAccounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{account.playerName}</span>
                    <Badge variant="outline" className="text-xs">
                      {account.inactivityAllowance} days left
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    Last active: {new Date(account.lastActiveAt).toLocaleDateString()}
                  </div>
                  {account.inactivityAllowance <= 3 && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-3 w-3" />
                      <AlertDescription className="text-xs">
                        Inactivity allowance running low
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => loginAsSitter(account.id)}
                  disabled={loggingIn || account.inactivityAllowance === 0}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  {loggingIn ? 'Logging in...' : 'Sit'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}

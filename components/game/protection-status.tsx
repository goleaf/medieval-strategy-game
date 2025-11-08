import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Shield, Clock, AlertTriangle } from 'lucide-react'

interface ProtectionStatusData {
  isProtected: boolean
  protectionTimeRemaining: number | null
  hasExtendedProtection: boolean
  canExtend: boolean
}

interface ProtectionStatusProps {
  playerId: string
}

export function ProtectionStatus({ playerId }: ProtectionStatusProps) {
  const [status, setStatus] = useState<ProtectionStatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [extending, setExtending] = useState(false)

  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/protection?playerId=${playerId}`)
      if (response.ok) {
        const data = await response.json()
        setStatus(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch protection status:', error)
    } finally {
      setLoading(false)
    }
  }, [playerId])

  const extendProtection = useCallback(async () => {
    setExtending(true)
    try {
      const response = await fetch('/api/protection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'EXTEND', playerId }),
      })

      if (response.ok) {
        await fetchStatus() // Refresh status
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to extend protection')
      }
    } catch (error) {
      console.error('Failed to extend protection:', error)
      alert('Failed to extend protection')
    } finally {
      setExtending(false)
    }
  }, [playerId, fetchStatus])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <div className="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!status) {
    return null
  }

  const formatTime = (hours: number) => {
    if (hours < 24) {
      return `${Math.ceil(hours)} hours`
    }
    const days = Math.floor(hours / 24)
    const remainingHours = Math.ceil(hours % 24)
    return `${days} days${remainingHours > 0 ? ` ${remainingHours} hours` : ''}`
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>Beginner Protection</span>
          {status.isProtected && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.isProtected ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>
                Protection ends in: <strong>{formatTime(status.protectionTimeRemaining!)}</strong>
              </span>
            </div>

            {status.hasExtendedProtection && (
              <div className="flex items-center space-x-2 text-sm text-blue-600">
                <AlertTriangle className="h-4 w-4" />
                <span>Protection has been extended</span>
              </div>
            )}

            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Protection Benefits:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Cannot be attacked by other players</li>
                <li>• Cannot attack other players (except Natars)</li>
                <li>• Cannot send resources in trades</li>
                <li>• Limited trade acceptance (1:1 or better)</li>
              </ul>
            </div>

            {status.canExtend && (
              <Button
                onClick={extendProtection}
                disabled={extending}
                className="w-full"
              >
                {extending ? 'Extending...' : 'Extend Protection'}
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <Shield className="h-12 w-12 mx-auto text-gray-400 mb-2" />
            <p className="text-gray-600">No beginner protection active</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

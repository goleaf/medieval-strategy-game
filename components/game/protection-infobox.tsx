import { useState, useEffect } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { X, Shield, AlertTriangle } from 'lucide-react'

interface ProtectionInfoboxProps {
  playerId: string
  onClose?: () => void
}

export function ProtectionInfobox({ playerId, onClose }: ProtectionInfoboxProps) {
  const [showExtensionOffer, setShowExtensionOffer] = useState(false)
  const [showExpirationWarning, setShowExpirationWarning] = useState(false)
  const [extending, setExtending] = useState(false)

  const checkProtectionStatus = async () => {
    try {
      const response = await fetch(`/api/protection?playerId=${playerId}`)
      if (response.ok) {
        const data = await response.json()
        const status = data.data

        // Show extension offer when protection is about to expire (within 24 hours)
        if (status.isProtected && status.protectionTimeRemaining !== null) {
          const hoursLeft = status.protectionTimeRemaining
          setShowExtensionOffer(hoursLeft <= 24 && !status.hasExtendedProtection && status.canExtend)
          setShowExpirationWarning(hoursLeft <= 6) // Show warning in last 6 hours
        } else {
          setShowExtensionOffer(false)
          setShowExpirationWarning(false)
        }
      }
    } catch (error) {
      console.error('Failed to check protection status:', error)
    }
  }

  const extendProtection = async () => {
    setExtending(true)
    try {
      const response = await fetch('/api/protection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'EXTEND', playerId }),
      })

      if (response.ok) {
        setShowExtensionOffer(false)
        checkProtectionStatus() // Refresh status
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
  }

  useEffect(() => {
    checkProtectionStatus()

    // Check every 5 minutes
    const interval = setInterval(checkProtectionStatus, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [playerId])

  if (!showExtensionOffer && !showExpirationWarning) {
    return null
  }

  return (
    <div className="space-y-4">
      {showExpirationWarning && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800">Protection Expiring Soon!</AlertTitle>
          <AlertDescription className="text-red-700">
            Your beginner protection will expire in less than 6 hours. You will then be vulnerable to attacks from other players.
            {showExtensionOffer && " Consider extending your protection."}
          </AlertDescription>
        </Alert>
      )}

      {showExtensionOffer && (
        <Alert className="border-blue-200 bg-blue-50">
          <Shield className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-800">Extend Beginner Protection</AlertTitle>
          <AlertDescription className="text-blue-700">
            <div className="space-y-3">
              <p>
                Your beginner protection will expire soon. You can extend it once to get additional time to prepare your defenses.
              </p>
              <div className="flex space-x-2">
                <Button
                  onClick={extendProtection}
                  disabled={extending}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {extending ? 'Extending...' : 'Extend Protection'}
                </Button>
                <Button
                  onClick={() => setShowExtensionOffer(false)}
                  variant="outline"
                  size="sm"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}


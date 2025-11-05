"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { UserPlus, Globe, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

interface GameWorld {
  id: string
  worldName: string
  worldCode: string
  description?: string
  version: string
  region: string
  speed: number
  isRegistrationOpen: boolean
  availableTribes: Array<{ tribe: string }>
}

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [gameWorlds, setGameWorlds] = useState<GameWorld[]>([])
  const [selectedGameWorldId, setSelectedGameWorldId] = useState('')
  const [selectedTribe, setSelectedTribe] = useState('')
  const [loadingWorlds, setLoadingWorlds] = useState(true)

  useEffect(() => {
    loadGameWorlds()
  }, [])

  const loadGameWorlds = async () => {
    try {
      const response = await fetch('/api/admin/game-worlds')
      const data = await response.json()
      if (data.success) {
        // Filter to only active worlds with open registration
        const activeWorlds = data.data.filter((world: GameWorld) =>
          world.isActive && world.isRegistrationOpen
        )
        setGameWorlds(activeWorlds)
      }
    } catch (error) {
      console.error('Failed to load game worlds:', error)
    } finally {
      setLoadingWorlds(false)
    }
  }

  const selectedGameWorld = gameWorlds.find(world => world.id === selectedGameWorldId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          username,
          password,
          gameWorldId: selectedGameWorldId,
          tribe: selectedTribe
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Registration failed")
      }

      router.push("/login")
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }


  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Medieval Strategy</h1>
          <p className="text-muted-foreground mt-2">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 border border-border rounded p-4 bg-card">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive rounded text-sm text-destructive">
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
            />
          </div>

          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Your in-game name"
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
          </div>

          {/* Game World Selection */}
          <div>
            <Label htmlFor="gameWorld">Game World</Label>
            {loadingWorlds ? (
              <div className="p-3 border border-border rounded bg-muted text-sm">Loading worlds...</div>
            ) : (
              <Select value={selectedGameWorldId} onValueChange={setSelectedGameWorldId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a game world" />
                </SelectTrigger>
                <SelectContent>
                  {gameWorlds.map(world => (
                    <SelectItem key={world.id} value={world.id}>
                      <div className="flex items-center gap-2">
                        <span>{world.worldName} ({world.worldCode})</span>
                        <Badge variant="outline" className="text-xs">{world.speed}x</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Tribe Selection */}
          {selectedGameWorld && (
            <div>
              <Label htmlFor="tribe">Tribe</Label>
              <Select value={selectedTribe} onValueChange={setSelectedTribe}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your tribe" />
                </SelectTrigger>
                <SelectContent>
                  {selectedGameWorld.availableTribes.map(({ tribe }) => (
                    <SelectItem key={tribe} value={tribe}>
                      {tribe.charAt(0).toUpperCase() + tribe.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Selected World Info */}
          {selectedGameWorld && (
            <Card className="border-muted">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="w-4 h-4" />
                  {selectedGameWorld.worldName}
                </CardTitle>
                <CardDescription className="text-xs">
                  {selectedGameWorld.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex gap-2 text-xs">
                  <Badge variant="secondary">{selectedGameWorld.version.replace('_', ' ')}</Badge>
                  <Badge variant="secondary">{selectedGameWorld.region}</Badge>
                  <Badge variant="secondary">{selectedGameWorld.speed}x Speed</Badge>
                </div>
              </CardContent>
            </Card>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            <UserPlus className="w-4 h-4" />
            {loading ? 'Creating account...' : 'Register'}
          </Button>
        </form>

        <div className="text-center text-sm">
          <p className="text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline font-bold">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}

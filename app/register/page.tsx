"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useRouter } from "next/navigation"
import { UserPlus, Globe, Users, RefreshCcw, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
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

type SecurityQuestionOption = {
  id: string
  prompt: string
}

const PASSWORD_REQUIREMENTS = [
  { label: "At least 10 characters", test: (v: string) => v.length >= 10 },
  { label: "One uppercase letter", test: (v: string) => /[A-Z]/.test(v) },
  { label: "One lowercase letter", test: (v: string) => /[a-z]/.test(v) },
  { label: "One number", test: (v: string) => /\d/.test(v) },
  { label: "One symbol", test: (v: string) => /[!@#$%^&*(),.?\":{}|<>_\-\\[\]\\\/~`+=;']/.test(v) },
]

const emptySecurityQuestions = [
  { questionId: "", answer: "", enabled: false },
  { questionId: "", answer: "", enabled: false },
]

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [gameWorlds, setGameWorlds] = useState<GameWorld[]>([])
  const [selectedGameWorldId, setSelectedGameWorldId] = useState("")
  const [selectedTribe, setSelectedTribe] = useState("")
  const [loadingWorlds, setLoadingWorlds] = useState(true)
  const [availableQuestions, setAvailableQuestions] = useState<SecurityQuestionOption[]>([])
  const [securityQuestions, setSecurityQuestions] = useState(emptySecurityQuestions)
  const [captcha, setCaptcha] = useState<{ id: string; question: string } | null>(null)
  const [captchaAnswer, setCaptchaAnswer] = useState("")
  const [agreeSecurity, setAgreeSecurity] = useState(false)

  useEffect(() => {
    loadGameWorlds()
    loadSecurityQuestions()
    refreshCaptcha()
  }, [])

  const loadGameWorlds = async () => {
    try {
      const response = await fetch("/api/admin/game-worlds")
      const data = await response.json()
      if (data.success) {
        const activeWorlds = data.data.filter((world: GameWorld) => world.isActive && world.isRegistrationOpen)
        setGameWorlds(activeWorlds)
      }
    } catch (err) {
      console.error("Failed to load game worlds:", err)
    } finally {
      setLoadingWorlds(false)
    }
  }

  const loadSecurityQuestions = async () => {
    try {
      const response = await fetch("/api/auth/security-questions")
      const data = await response.json()
      if (data.success) {
        setAvailableQuestions(data.questions)
      }
    } catch (err) {
      console.error("Failed to load security questions:", err)
    }
  }

  const refreshCaptcha = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/captcha", { method: "POST" })
      const data = await res.json()
      if (data.success) {
        setCaptcha(data.challenge)
        setCaptchaAnswer("")
      }
    } catch (err) {
      console.error("Failed to load captcha:", err)
    }
  }, [])

  const selectedGameWorld = gameWorlds.find(world => world.id === selectedGameWorldId)

  const usernameError = useMemo(() => {
    if (!username) return ""
    if (username.length < 3 || username.length > 16) return "Username must be 3-16 characters."
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return "Only letters, numbers, and underscores are allowed."
    return ""
  }, [username])

  const passwordScore = useMemo(() => {
    return PASSWORD_REQUIREMENTS.reduce((score, rule) => (rule.test(password) ? score + 1 : score), 0)
  }, [password])

  const handleSecurityQuestionChange = (index: number, field: "questionId" | "answer" | "enabled", value: string | boolean) => {
    setSecurityQuestions(prev => {
      const next = [...prev]
      if (field === "enabled") {
        next[index].enabled = value as boolean
      } else {
        next[index][field] = value as string
      }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (usernameError) {
      setError(usernameError)
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (passwordScore < PASSWORD_REQUIREMENTS.length) {
      setError("Password does not meet the security requirements")
      return
    }

    if (!captcha?.id) {
      setError("Captcha not ready. Please refresh and try again.")
      return
    }

    setLoading(true)

    try {
      const filteredQuestions = securityQuestions
        .filter(question => question.enabled && question.questionId && question.answer.trim())
        .map(({ questionId, answer }) => ({ questionId, answer }))

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          username,
          password,
          gameWorldId: selectedGameWorldId,
          tribe: selectedTribe,
          securityQuestions: filteredQuestions,
          captchaId: captcha.id,
          captchaAnswer,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Registration failed")
      }

      router.push("/login?verify=1")
    } catch (err: any) {
      setError(err.message)
      refreshCaptcha()
    } finally {
      setLoading(false)
    }
  }

  const passwordRequirementStatus = useMemo(() => {
    return PASSWORD_REQUIREMENTS.map(requirement => ({
      label: requirement.label,
      met: requirement.test(password),
    }))
  }, [password])

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Forge Your Medieval Legacy</h1>
          <p className="text-muted-foreground">Create a secure account to command your villages</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive rounded text-sm text-destructive">
              {error}
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Account Details</CardTitle>
              <CardDescription>Choose unique credentials for your empire</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
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
                  onChange={e => setUsername(e.target.value)}
                  required
                  placeholder="Your in-game name"
                />
                {usernameError && <p className="text-sm text-destructive mt-1">{usernameError}</p>}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                  <div className="mt-2 space-y-1">
                    <Progress value={(passwordScore / PASSWORD_REQUIREMENTS.length) * 100} />
                    <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                      {passwordRequirementStatus.map(req => (
                        <div key={req.label} className={req.met ? "text-emerald-500" : ""}>
                          {req.met ? "•" : "○"} {req.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>World & Tribe</CardTitle>
              <CardDescription>Select your starting world and tribe</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="gameWorld">Game World</Label>
                {loadingWorlds ? (
                  <div className="p-3 border border-border rounded bg-muted text-sm">Loading worlds...</div>
                ) : (
                  <Select value={selectedGameWorldId} onValueChange={setSelectedGameWorldId} required>
                    <SelectTrigger id="gameWorld">
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

              {selectedGameWorld && (
                <>
                  <div>
                    <Label htmlFor="tribe">Tribe</Label>
                    <Select value={selectedTribe} onValueChange={setSelectedTribe} required>
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

                  <Card className="border-muted">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        {selectedGameWorld.worldName}
                      </CardTitle>
                      <CardDescription className="text-xs">{selectedGameWorld.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 flex gap-2 text-xs flex-wrap">
                      <Badge variant="secondary">{selectedGameWorld.version.replace("_", " ")}</Badge>
                      <Badge variant="secondary">{selectedGameWorld.region}</Badge>
                      <Badge variant="secondary">{selectedGameWorld.speed}x Speed</Badge>
                    </CardContent>
                  </Card>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Protection</CardTitle>
              <CardDescription>Optional questions used for recovery verification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {securityQuestions.map((question, index) => (
                <div key={index} className="space-y-2 border border-dashed border-border rounded p-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`security-${index}`}
                      checked={question.enabled}
                      onCheckedChange={checked => handleSecurityQuestionChange(index, "enabled", Boolean(checked))}
                    />
                    <Label htmlFor={`security-${index}`} className="text-sm">
                      Enable question {index + 1}
                    </Label>
                  </div>

                  {question.enabled && (
                    <>
                      <Select
                        value={question.questionId}
                        onValueChange={value => handleSecurityQuestionChange(index, "questionId", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a question" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableQuestions.map(option => (
                            <SelectItem key={option.id} value={option.id}>
                              {option.prompt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="text"
                        placeholder="Your answer (case insensitive)"
                        value={question.answer}
                        onChange={e => handleSecurityQuestionChange(index, "answer", e.target.value)}
                      />
                    </>
                  )}
                </div>
              ))}

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="w-4 h-4" />
                <span>Security answers are hashed and only used for account recovery verification.</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Captcha Verification</CardTitle>
              <CardDescription>Prove you are not an automated invader</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{captcha?.question || "Preparing challenge..."}</p>
                <Button type="button" variant="outline" size="icon" onClick={refreshCaptcha}>
                  <RefreshCcw className="w-4 h-4" />
                </Button>
              </div>
              <Input
                placeholder="Enter your answer"
                value={captchaAnswer}
                onChange={e => setCaptchaAnswer(e.target.value)}
                required
              />
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 text-sm">
            <Checkbox id="security-agreement" checked={agreeSecurity} onCheckedChange={checked => setAgreeSecurity(Boolean(checked))} />
            <Label htmlFor="security-agreement">
              I understand that I must verify my email before logging in.
            </Label>
          </div>

          <Button type="submit" disabled={loading || !agreeSecurity} className="w-full">
            <UserPlus className="w-4 h-4" />
            {loading ? "Creating account..." : "Create Account"}
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

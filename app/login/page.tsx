"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LogIn, Eye, EyeOff, Sword, HelpCircle, Shield, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import Link from "next/link"

type TwoFactorChallenge = {
  id: string
  methods: {
    totp: boolean
    sms: boolean
    backupCodes: number
  }
}

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<TwoFactorChallenge | null>(null)
  const [twoFactorMethod, setTwoFactorMethod] = useState<"totp" | "sms" | "backup">("totp")
  const [twoFactorCode, setTwoFactorCode] = useState("")
  const [rememberDevice, setRememberDevice] = useState(true)
  const [trustedDeviceLabel, setTrustedDeviceLabel] = useState("My device")
  const [smsLoading, setSmsLoading] = useState(false)

  useEffect(() => {
    const savedIdentifier = localStorage.getItem("rememberedIdentifier")
    const savedRememberMe = localStorage.getItem("rememberMe") === "true"

    if (savedIdentifier && savedRememberMe) {
      setFormData(prev => ({ ...prev, identifier: savedIdentifier }))
      setRememberMe(true)
    }
  }, [])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError("")
  }

  const startLogin = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, rememberMe }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.emailNotVerified) {
          setError("Please verify your email before logging in. Check your inbox for the confirmation link.")
          return
        }
        throw new Error(data.error || "Login failed")
      }

      if (data.twoFactorRequired) {
        const challenge: TwoFactorChallenge = { id: data.challengeId, methods: data.methods }
        setTwoFactorChallenge(challenge)
        setTwoFactorMethod(
          challenge.methods.totp ? "totp" : challenge.methods.sms ? "sms" : "backup",
        )
        setError("")
        return
      }

      finalizeLogin(data)
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  const finalizeLogin = (data: any) => {
    localStorage.setItem("authToken", data.token)
    if (data.player?.id) {
      localStorage.setItem("playerId", data.player.id)
    }

    if (rememberMe) {
      localStorage.setItem("rememberedIdentifier", formData.identifier)
      localStorage.setItem("rememberMe", "true")
    } else {
      localStorage.removeItem("rememberedIdentifier")
      localStorage.removeItem("rememberMe")
    }

    router.push("/dashboard")
  }

  const handleTwoFactorSubmit = async () => {
    if (!twoFactorChallenge) return
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login/verify-2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challengeId: twoFactorChallenge.id,
          method: twoFactorMethod,
          code: twoFactorCode,
          rememberDevice,
          trustedDeviceLabel,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Two-factor verification failed")
      }

      setTwoFactorChallenge(null)
      setTwoFactorCode("")
      finalizeLogin(data)
    } catch (err: any) {
      setError(err.message || "Unable to verify code")
    } finally {
      setLoading(false)
    }
  }

  const requestSmsCode = async () => {
    if (!twoFactorChallenge) return
    setSmsLoading(true)
    setError("")
    try {
      const res = await fetch("/api/auth/login/request-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: twoFactorChallenge.id }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Unable to send SMS code")
      }
    } catch (err: any) {
      setError(err.message || "Failed to send SMS code")
    } finally {
      setSmsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (twoFactorChallenge) {
      await handleTwoFactorSubmit()
    } else {
      await startLogin()
    }
  }

  const demoLogins = [
    { name: "Admin", identifier: "admin@game.local", password: "pass123", role: "Administrator" },
    { name: "Demo User", identifier: "demo@game.local", password: "pass123", role: "Player" },
  ]

  const fillDemoCredentials = (identifier: string, password: string) => {
    setFormData({ identifier, password })
    setError("")
  }

  return (
    <main className="flex-1 bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Sword className="w-6 h-6 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Medieval Strategy
          </h1>
          <p className="text-muted-foreground">
            {twoFactorChallenge ? "Verify your identity to continue" : "Enter your kingdom and claim victory"}
          </p>
        </div>

        <Card className="shadow-xl border-0 bg-card/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">
              {twoFactorChallenge ? "Two-Factor Authentication" : "Welcome Back"}
            </CardTitle>
            <CardDescription className="text-center">
              {twoFactorChallenge ? "Use your preferred verification method" : "Sign in to access your medieval empire"}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                  {error}
                </div>
              )}

              {!twoFactorChallenge && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="identifier" className="text-sm font-medium">
                      Email or Username
                    </Label>
                    <Input
                      id="identifier"
                      type="text"
                      value={formData.identifier}
                      onChange={e => handleInputChange("identifier", e.target.value)}
                      placeholder="your@email.com"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={e => handleInputChange("password", e.target.value)}
                        placeholder="••••••••"
                        required
                        disabled={loading}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={checked => setRememberMe(Boolean(checked))}
                      disabled={loading}
                    />
                    <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
                      Remember me
                    </Label>
                  </div>
                </>
              )}

              {twoFactorChallenge && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {twoFactorChallenge.methods.totp && (
                      <Button
                        type="button"
                        variant={twoFactorMethod === "totp" ? "default" : "outline"}
                        onClick={() => setTwoFactorMethod("totp")}
                        className="flex-1"
                      >
                        Authenticator
                      </Button>
                    )}
                    {twoFactorChallenge.methods.sms && (
                      <Button
                        type="button"
                        variant={twoFactorMethod === "sms" ? "default" : "outline"}
                        onClick={() => setTwoFactorMethod("sms")}
                        className="flex-1"
                      >
                        SMS
                      </Button>
                    )}
                    {twoFactorChallenge.methods.backupCodes > 0 && (
                      <Button
                        type="button"
                        variant={twoFactorMethod === "backup" ? "default" : "outline"}
                        onClick={() => setTwoFactorMethod("backup")}
                        className="flex-1"
                      >
                        Backup Code
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="twoFactorCode">
                      {twoFactorMethod === "sms" ? "SMS Code" : twoFactorMethod === "backup" ? "Backup Code" : "Authenticator Code"}
                    </Label>
                    <Input
                      id="twoFactorCode"
                      value={twoFactorCode}
                      onChange={e => setTwoFactorCode(e.target.value)}
                      placeholder={twoFactorMethod === "backup" ? "XXXX-XXXX" : "123456"}
                      required
                      disabled={loading}
                    />
                  </div>

                  {twoFactorMethod === "sms" && (
                    <Button type="button" variant="outline" onClick={requestSmsCode} disabled={smsLoading}>
                      {smsLoading ? (
                        <span className="flex items-center gap-2">
                          <LoadingSpinner size="sm" />
                          Sending...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <Smartphone className="w-4 h-4" />
                          Send me a code
                        </span>
                      )}
                    </Button>
                  )}

                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember-device"
                      checked={rememberDevice}
                      onCheckedChange={checked => setRememberDevice(Boolean(checked))}
                    />
                    <Label htmlFor="remember-device" className="text-sm text-muted-foreground">
                      Remember this device for 30 days
                    </Label>
                  </div>
                  {rememberDevice && (
                    <Input
                      value={trustedDeviceLabel}
                      onChange={e => setTrustedDeviceLabel(e.target.value)}
                      placeholder="Device label (optional)"
                    />
                  )}
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-4">
              <Button
                type="submit"
                disabled={
                  loading ||
                  (!twoFactorChallenge && (!formData.identifier || !formData.password)) ||
                  (twoFactorChallenge && !twoFactorCode)
                }
                className="w-full h-11 text-base font-medium"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span>{twoFactorChallenge ? "Verifying..." : "Authenticating..."}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <LogIn className="w-4 h-4" />
                    <span>{twoFactorChallenge ? "Verify & Enter" : "Enter Kingdom"}</span>
                  </div>
                )}
              </Button>

              {!twoFactorChallenge && (
                <div className="flex flex-col space-y-2 text-center">
                  <Link href="/reset-password" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 justify-center">
                    <HelpCircle className="w-3 h-3" />
                    Forgot your password?
                  </Link>
                  <Link href="/recovery" className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1 justify-center">
                    Need account recovery assistance?
                  </Link>
                </div>
              )}
            </CardFooter>
          </form>
        </Card>

        {!twoFactorChallenge && (
          <>
            <div className="text-center">
              <p className="text-muted-foreground text-sm">
                New to Medieval Strategy?{" "}
                <Link href="/register" className="text-primary hover:text-primary/80 font-medium transition-colors hover:underline">
                  Create your kingdom
                </Link>
              </p>
            </div>

            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-center">Demo Accounts</CardTitle>
                <CardDescription className="text-center text-xs">
                  Try the game with these test accounts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {demoLogins.map((demo, index) => (
                  <button
                    key={index}
                    onClick={() => fillDemoCredentials(demo.identifier, demo.password)}
                    disabled={loading}
                    className="w-full p-3 border border-border rounded-md hover:bg-muted/50 transition-colors text-left flex items-center space-x-3 group disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Shield className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{demo.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{demo.role}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">Click to fill</div>
                  </button>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  )
}

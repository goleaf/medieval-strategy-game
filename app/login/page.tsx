"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { LogIn, Eye, EyeOff, Crown, Shield, Sword, HelpCircle, UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isFormValid, setIsFormValid] = useState(false)

  // Load saved credentials if remember me was checked
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail')
    const savedRememberMe = localStorage.getItem('rememberMe') === 'true'

    if (savedEmail && savedRememberMe) {
      setFormData(prev => ({ ...prev, email: savedEmail }))
      setRememberMe(true)
    }
  }, [])

  // Form validation
  useEffect(() => {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    const passwordValid = formData.password.length >= 6
    setIsFormValid(emailValid && passwordValid)
  }, [formData])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) return

    setError('')
    setLoading(true)

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Login failed")
      }

      const data = await res.json()

      // Store auth data
      localStorage.setItem("authToken", data.token)
      if (data.player?.id) {
        localStorage.setItem("playerId", data.player.id)
      }

      // Handle remember me
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', formData.email)
        localStorage.setItem('rememberMe', 'true')
      } else {
        localStorage.removeItem('rememberedEmail')
        localStorage.removeItem('rememberMe')
      }

      // Success animation and redirect
      setTimeout(() => {
        router.push("/dashboard")
      }, 500)

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const demoLogins = [
    { name: 'Admin', email: 'admin@game.local', password: 'pass123', icon: Crown, role: 'Administrator' },
    { name: 'Demo User', email: 'demo@game.local', password: 'pass123', icon: Shield, role: 'Player' },
  ]

  const fillDemoCredentials = (email: string, password: string) => {
    setFormData({ email, password })
    setError('')
  }

  return (
    <main className="flex-1 bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-32 h-32 border border-primary/20 rounded-full"></div>
        <div className="absolute bottom-20 right-16 w-24 h-24 border border-primary/20 rounded-full"></div>
        <div className="absolute top-1/2 left-1/4 w-16 h-16 border border-primary/20 rounded-full"></div>
      </div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Header */}
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
            Enter your kingdom and claim victory
          </p>
        </div>

        {/* Login Form */}
        <Card className="shadow-xl border-0 bg-card/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">
              Sign in to access your medieval empire
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs">⚠️</span>
                    <span>{error}</span>
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="your@email.com"
                  required
                  disabled={loading}
                  className="transition-all duration-200 focus:scale-[1.02]"
                  aria-describedby={error ? "email-error" : undefined}
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    className="pr-10 transition-all duration-200 focus:scale-[1.02]"
                    minLength={6}
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

              {/* Remember Me */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                  disabled={loading}
                />
                <Label
                  htmlFor="remember"
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  Remember me
                </Label>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4 pt-4">
              <Button
                type="submit"
                disabled={loading || !isFormValid}
                className="w-full h-11 text-base font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading ? (
                  <div className="flex items-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span>Authenticating...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <LogIn className="w-4 h-4" />
                    <span>Enter Kingdom</span>
                  </div>
                )}
              </Button>

              {/* Forgot Password */}
              <div className="text-center">
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center space-x-1 mx-auto"
                  onClick={() => setError('Password recovery not implemented yet')}
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>Forgot your password?</span>
                </button>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Register Link */}
        <div className="text-center">
          <p className="text-muted-foreground text-sm">
            New to Medieval Strategy?{" "}
            <Link
              href="/register"
              className="text-primary hover:text-primary/80 font-medium transition-colors hover:underline inline-flex items-center space-x-1"
            >
              <UserPlus className="w-3 h-3" />
              <span>Create your kingdom</span>
            </Link>
          </p>
        </div>

        {/* Demo Accounts */}
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
                onClick={() => fillDemoCredentials(demo.email, demo.password)}
                disabled={loading}
                className="w-full p-3 border border-border rounded-md hover:bg-muted/50 transition-colors text-left flex items-center space-x-3 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <demo.icon className="w-4 h-4 text-primary" />
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
      </div>
    </main>
  )
}

"use client"

import { useState, useMemo } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import Link from "next/link"

const PASSWORD_RULES = [
  { label: "Minimum 10 characters", test: (value: string) => value.length >= 10 },
  { label: "Uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "Lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { label: "Number", test: (value: string) => /\d/.test(value) },
  { label: "Symbol", test: (value: string) => /[!@#$%^&*(),.?\":{}|<>_\-\\[\]\\\/~`+=;']/.test(value) },
]

export default function ResetPasswordPage() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get("token")

  const [email, setEmail] = useState("")
  const [requestState, setRequestState] = useState<{ loading: boolean; message: string }>({ loading: false, message: "" })
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [securityAnswer, setSecurityAnswer] = useState("")
  const [resetState, setResetState] = useState<{ loading: boolean; error: string; success: string }>({ loading: false, error: "", success: "" })

  const passwordStatus = useMemo(
    () =>
      PASSWORD_RULES.map(rule => ({
        label: rule.label,
        met: rule.test(newPassword),
      })),
    [newPassword],
  )

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setRequestState({ loading: true, message: "" })
    try {
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Unable to submit request")
      }
      setRequestState({ loading: false, message: "If the email exists, you'll receive reset instructions shortly." })
    } catch (error: any) {
      setRequestState({ loading: false, message: error.message })
    }
  }

  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    if (newPassword !== confirmPassword) {
      setResetState(prev => ({ ...prev, error: "Passwords do not match" }))
      return
    }

    const unmetRule = passwordStatus.find(rule => !rule.met)
    if (unmetRule) {
      setResetState(prev => ({ ...prev, error: "Password does not meet security requirements" }))
      return
    }

    setResetState({ loading: true, error: "", success: "" })
    try {
      const res = await fetch("/api/auth/password-reset/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: newPassword, securityAnswer }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Unable to reset password")
      }
      setResetState({ loading: false, error: "", success: "Password updated successfully. You can now log in." })
      setTimeout(() => router.push("/login"), 1500)
    } catch (error: any) {
      setResetState({ loading: false, error: error.message, success: "" })
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>{token ? "Set a New Password" : "Reset Your Password"}</CardTitle>
          <CardDescription>
            {token ? "Enter a new password to secure your account." : "Request a secure link to reset your password."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!token ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={requestState.loading}>
                {requestState.loading ? "Submitting..." : "Send Reset Link"}
              </Button>
              {requestState.message && <p className="text-sm text-muted-foreground text-center">{requestState.message}</p>}
            </form>
          ) : (
            <form onSubmit={handleCompleteReset} className="space-y-4">
              <div>
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                />
                <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground mt-2">
                  {passwordStatus.map(rule => (
                    <span key={rule.label} className={rule.met ? "text-emerald-500" : ""}>
                      {rule.met ? "•" : "○"} {rule.label}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="security-answer">Security Answer (if configured)</Label>
                <Input
                  id="security-answer"
                  type="text"
                  value={securityAnswer}
                  onChange={e => setSecurityAnswer(e.target.value)}
                  placeholder="Answer to your security question"
                />
              </div>
              {resetState.error && <p className="text-sm text-destructive">{resetState.error}</p>}
              {resetState.success && <p className="text-sm text-emerald-500">{resetState.success}</p>}
              <Button type="submit" className="w-full" disabled={resetState.loading}>
                {resetState.loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          )}
          <div className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline">
              Return to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}

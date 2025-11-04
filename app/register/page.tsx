"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function RegisterPage() {
  const router = useRouter()

  const handleSubmit = async (email: string, username: string, password: string, confirmPassword: string) => {
    if (password !== confirmPassword) {
      return { success: false, error: "Passwords do not match" }
    }

    if (password.length < 6) {
      return { success: false, error: "Password must be at least 6 characters" }
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Registration failed")
      }

      router.push("/login")
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__registerSubmitHandler = handleSubmit
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).__registerSubmitHandler
      }
    }
  }, [])

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Medieval Strategy</h1>
          <p className="text-muted-foreground mt-2">Create your account</p>
        </div>

        <form
          x-data={`{
            email: '',
            username: '',
            password: '',
            confirmPassword: '',
            error: '',
            loading: false,
            async handleSubmit(e) {
              e.preventDefault();
              this.error = '';
              this.loading = true;
              try {
                if (window.__registerSubmitHandler) {
                  const result = await window.__registerSubmitHandler(this.email, this.username, this.password, this.confirmPassword);
                  if (!result.success) {
                    this.error = result.error;
                  }
                }
              } finally {
                this.loading = false;
              }
            }
          }`}
          x-on:submit="handleSubmit($event)"
          className="space-y-4 border border-border rounded p-4 bg-card"
        >
          <div x-show="error" className="p-3 bg-destructive/10 border border-destructive rounded text-sm text-destructive" x-text="error" />

          <div>
            <label htmlFor="email" className="block text-sm font-bold mb-2">Email</label>
            <input
              id="email"
              type="email"
              x-model="email"
              required
              className="w-full p-3 border border-border rounded bg-background text-foreground"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-bold mb-2">Username</label>
            <input
              id="username"
              type="text"
              x-model="username"
              required
              className="w-full p-3 border border-border rounded bg-background text-foreground"
              placeholder="Your in-game name"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-bold mb-2">Password</label>
            <input
              id="password"
              type="password"
              x-model="password"
              required
              className="w-full p-3 border border-border rounded bg-background text-foreground"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-bold mb-2">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              x-model="confirmPassword"
              required
              className="w-full p-3 border border-border rounded bg-background text-foreground"
              placeholder="••••••••"
            />
          </div>

          <Button type="submit" x-bind:disabled="loading" className="w-full">
            <span x-show="loading">Creating account...</span>
            <span x-show="!loading">Register</span>
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

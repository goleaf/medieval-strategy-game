"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()

  const handleLogin = async (email: string, password: string) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Login failed")
      }

      const data = await res.json()
      localStorage.setItem("authToken", data.token)
      localStorage.setItem("playerId", data.player?.id)
      router.push("/dashboard")
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__loginHandler = handleLogin
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).__loginHandler
      }
    }
  }, [])

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Medieval Strategy</h1>
          <p className="text-muted-foreground mt-2">Login to your kingdom</p>
        </div>

        <form
          x-data={`{
            email: '',
            password: '',
            error: '',
            loading: false,
            async handleSubmit(e) {
              e.preventDefault();
              this.error = '';
              this.loading = true;
              try {
                if (window.__loginHandler) {
                  const result = await window.__loginHandler(this.email, this.password);
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

          <Button type="submit" x-bind:disabled="loading" className="w-full">
            <span x-text="loading ? 'Logging in...' : 'Login'" />
          </Button>
        </form>

        <div className="text-center text-sm">
          <p className="text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/register" className="text-primary hover:underline font-bold">
              Register here
            </Link>
          </p>
        </div>

        <div className="border border-border rounded p-4 bg-muted/50">
          <h3 className="text-sm font-bold mb-2">Demo Login</h3>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p><strong>Admin:</strong> admin@game.local / pass123</p>
            <p><strong>Demo User:</strong> demo@game.local / pass123</p>
          </div>
        </div>
      </div>
    </main>
  )
}

"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

type ReportType = "MULTI_ACCOUNT" | "BUG_ABUSE" | "HARASSMENT" | "INAPPROPRIATE_NAME" | "OTHER"

export default function SubmitReportPage() {
  const searchParams = useSearchParams()
  const [type, setType] = useState<ReportType>("HARASSMENT")
  const [targetPlayerId, setTargetPlayerId] = useState("")
  const [description, setDescription] = useState("")
  const [evidence, setEvidence] = useState("")
  const [anonymous, setAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = searchParams.get("type") as ReportType | null
    const pid = searchParams.get("playerId")
    if (t) setType(t)
    if (pid) setTargetPlayerId(pid)
  }, [searchParams])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/reports/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          targetPlayerId: targetPlayerId || null,
          description,
          evidence: evidence
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          isAnonymous: anonymous,
          occurredAt: new Date().toISOString(),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || "Failed to submit report")
      setResult(`Report submitted. Reference: ${json.data.reference}`)
    } catch (err: any) {
      setError(err.message || String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="bg-background text-foreground min-h-screen">
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
        <h1 className="text-2xl font-bold">Report a Violation</h1>
        <p className="text-sm text-muted-foreground">
          Use this form to report harassment, cheating, inappropriate names, or bug abuse. Include message links, timestamps, or
          screenshot URLs in the evidence field. Your identity can be hidden from other players if you choose anonymity.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ReportType)}
              className="w-full rounded-md border border-border bg-card/50 p-2"
            >
              <option value="HARASSMENT">Harassment</option>
              <option value="MULTI_ACCOUNT">Multi-accounting</option>
              <option value="BUG_ABUSE">Bug abuse</option>
              <option value="INAPPROPRIATE_NAME">Inappropriate name</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Target Player ID (optional)</label>
            <input
              value={targetPlayerId}
              onChange={(e) => setTargetPlayerId(e.target.value)}
              placeholder="player_cuid or leave blank if unknown"
              className="w-full rounded-md border border-border bg-card/50 p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what happened, when, and where. Include message links or coordinates if relevant."
              rows={5}
              className="w-full rounded-md border border-border bg-card/50 p-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Evidence (one URL or note per line)</label>
            <textarea
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="https://...\nhttps://...\nmessage:12345"
              rows={4}
              className="w-full rounded-md border border-border bg-card/50 p-2"
            />
          </div>
          <div className="flex items-center gap-2">
            <input id="anon" type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
            <label htmlFor="anon" className="text-sm">Report anonymously</label>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-primary text-primary-foreground px-4 py-2 disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit Report"}
            </button>
            {result && <span className="text-sm text-green-600">{result}</span>}
            {error && <span className="text-sm text-destructive">{error}</span>}
          </div>
        </form>
        <div className="border-t border-border pt-4">
          <a href="/support" className="text-sm text-primary underline">Back to Support</a>
        </div>
      </div>
    </main>
  )
}

"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"

export function FeedbackForm() {
  const { auth } = useAuth()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState("")
  const [severity, setSeverity] = useState<"low" | "medium" | "high">("low")
  const [summary, setSummary] = useState("")
  const [details, setDetails] = useState("")
  const [contact, setContact] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function submit() {
    if (!summary || summary.trim().length < 5) {
      toast({ title: "Summary too short", description: "Please provide at least 5 characters.", variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
        },
        body: JSON.stringify({ category: category || "general", severity, summary: summary.trim(), details, contact }),
      })
      const json = await res.json()
      if (!res.ok || !json.success) throw new Error(json.error || "Failed to submit feedback")
      toast({ title: "Thank you!", description: "Feedback submitted successfully." })
      setOpen(false)
      setCategory("")
      setSeverity("low")
      setSummary("")
      setDetails("")
      setContact("")
    } catch (err: any) {
      toast({ title: "Submission failed", description: String(err?.message || err), variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">💬 Feedback</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs block mb-1">Category</label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="bug, UI, balance…" />
            </div>
            <div>
              <label className="text-xs block mb-1">Severity</label>
              <Select value={severity} onValueChange={(v: any) => setSeverity(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs block mb-1">Summary</label>
            <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Brief summary" />
          </div>
          <div>
            <label className="text-xs block mb-1">Details (optional)</label>
            <Textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={4} placeholder="Steps to reproduce, expectations, screenshots (links)…" />
          </div>
          <div>
            <label className="text-xs block mb-1">Contact (optional)</label>
            <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Email or Discord" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={submitting}>{submitting ? "Submitting…" : "Submit"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}


"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"

type SecurityQuestionOption = {
  id: string
  prompt: string
}

export default function AccountRecoveryPage() {
  const [email, setEmail] = useState("")
  const [reason, setReason] = useState("")
  const [securityQuestionId, setSecurityQuestionId] = useState("")
  const [securityAnswer, setSecurityAnswer] = useState("")
  const [details, setDetails] = useState({
    recentTransactions: "",
    villageDetails: "",
    additionalNotes: "",
  })
  const [availableQuestions, setAvailableQuestions] = useState<SecurityQuestionOption[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [confirmation, setConfirmation] = useState(false)

  useEffect(() => {
    fetchQuestions()
  }, [])

  const fetchQuestions = async () => {
    try {
      const res = await fetch("/api/auth/security-questions")
      const data = await res.json()
      if (data.success) {
        setAvailableQuestions(data.questions)
      }
    } catch (error) {
      console.error("Failed to load security questions", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setErrorMessage("")
    setSuccessMessage("")

    try {
      const res = await fetch("/api/auth/recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          reason,
          securityQuestionId: securityQuestionId || undefined,
          securityAnswer: securityAnswer || undefined,
          details: {
            recentTransactions: details.recentTransactions,
            villageDetails: details.villageDetails,
            additionalNotes: details.additionalNotes,
          },
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || "Unable to submit recovery request")
      }

      setSuccessMessage(`Request submitted. Reference ID: ${data.ticketId}`)
      setEmail("")
      setReason("")
      setSecurityQuestionId("")
      setSecurityAnswer("")
      setDetails({ recentTransactions: "", villageDetails: "", additionalNotes: "" })
      setConfirmation(false)
    } catch (error: any) {
      setErrorMessage(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Account Recovery Support</CardTitle>
          <CardDescription>Provide ownership details and security answers so our team can restore access.</CardDescription>
        </CardHeader>
        <CardContent>
          {successMessage && <p className="text-sm text-emerald-600 mb-4">{successMessage}</p>}
          {errorMessage && <p className="text-sm text-destructive mb-4">{errorMessage}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Input
                  id="reason"
                  type="text"
                  placeholder="Compromised account, forgotten credentials..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Security Question (optional)</Label>
              <div className="grid md:grid-cols-2 gap-2">
                <Select value={securityQuestionId} onValueChange={setSecurityQuestionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a question" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableQuestions.map(question => (
                      <SelectItem key={question.id} value={question.id}>
                        {question.prompt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Answer"
                  value={securityAnswer}
                  onChange={e => setSecurityAnswer(e.target.value)}
                  disabled={!securityQuestionId}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="transactions">Recent Transactions or Purchases</Label>
                <Textarea
                  id="transactions"
                  placeholder="Gold purchases, premium activations, last known payments..."
                  value={details.recentTransactions}
                  onChange={e => setDetails(prev => ({ ...prev, recentTransactions: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="villages">Village or Tribe Details</Label>
                <Textarea
                  id="villages"
                  placeholder="Village coordinates, tribe name, sitter/dual info..."
                  value={details.villageDetails}
                  onChange={e => setDetails(prev => ({ ...prev, villageDetails: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any other proof of ownership or suspicious activity details"
                value={details.additionalNotes}
                onChange={e => setDetails(prev => ({ ...prev, additionalNotes: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox id="confirmation" checked={confirmation} onCheckedChange={checked => setConfirmation(Boolean(checked))} />
              <Label htmlFor="confirmation" className="text-sm text-muted-foreground">
                I confirm the information provided is accurate and understand staff may reach out via email.
              </Label>
            </div>

            <Button type="submit" className="w-full" disabled={submitting || !confirmation}>
              {submitting ? "Submitting..." : "Submit Recovery Request"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Need immediate assistance?{" "}
            <Link href="/support" className="text-primary hover:underline">
              Contact support
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  )
}

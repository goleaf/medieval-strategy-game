"use client"

import { useEffect, useState } from "react"

type Mentor = { id: string; playerName: string; totalPoints: number; activeMentees: number }
type Mentorship = { id: string; mentorId: string; menteeId: string; status: string }

export default function MentorPage() {
  const [playerId, setPlayerId] = useState("")
  const [mentors, setMentors] = useState<Mentor[]>([])
  const [loading, setLoading] = useState(true)
  const [allowMentorship, setAllowMentorship] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const pid = (typeof window !== 'undefined' && (localStorage.getItem('playerId') || localStorage.getItem('authPlayerId'))) || ''
    setPlayerId(pid)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/mentorship/mentors')
        const json = await res.json()
        setMentors(json.data || [])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function requestMentor(preferredMentorId?: string) {
    setMessage(null)
    try {
      const res = await fetch('/api/mentorship/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, preferredMentorId })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      setMessage('Mentor request sent! You will be notified on acceptance.')
    } catch (e: any) {
      setMessage(e.message || 'Failed to send request')
    }
  }

  async function toggleVolunteer(value: boolean) {
    setAllowMentorship(value)
    try {
      const res = await fetch('/api/mentorship/opt-in', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ playerId, allow: value })
      })
      if (!res.ok) throw new Error('Failed to update')
    } catch {
      setAllowMentorship(!value)
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Mentorship</h1>

      <section className="border border-border rounded p-4 bg-card/50 space-y-3">
        <h2 className="text-lg font-semibold">Find a mentor</h2>
        <p className="text-sm text-muted-foreground">Mentors are volunteer players who can advise you on builds, defense, and growth.</p>
        <button
          className="px-3 py-2 bg-primary text-primary-foreground rounded"
          onClick={() => requestMentor()}
          disabled={!playerId}
        >
          Request Mentor
        </button>
        {message && <div className="text-sm">{message}</div>}
      </section>

      <section className="border border-border rounded p-4 bg-card/50 space-y-3">
        <h2 className="text-lg font-semibold">Volunteer as a mentor</h2>
        <div className="flex items-center gap-2 text-sm">
          <input id="allow" type="checkbox" checked={allowMentorship} onChange={(e) => toggleVolunteer(e.target.checked)} />
          <label htmlFor="allow">Available to mentor new players</label>
        </div>
      </section>

      <section className="border border-border rounded p-4 bg-card/50 space-y-3">
        <h2 className="text-lg font-semibold">Available mentors</h2>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : mentors.length === 0 ? (
          <div className="text-sm text-muted-foreground">No mentors currently available.</div>
        ) : (
          <ul className="space-y-2">
            {mentors.map((m) => (
              <li key={m.id} className="flex items-center justify-between border border-border rounded px-3 py-2 bg-background/70">
                <div>
                  <div className="font-medium">{m.playerName}</div>
                  <div className="text-xs text-muted-foreground">Points: {m.totalPoints} • Active mentees: {m.activeMentees}</div>
                </div>
                <button className="px-3 py-1 text-sm border rounded" onClick={() => requestMentor(m.id)}>Request</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}


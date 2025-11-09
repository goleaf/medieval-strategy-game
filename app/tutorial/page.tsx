"use client"

import { useEffect, useState } from "react"

type Task = {
  id: string
  key: string
  title: string
  description?: string
  order: number
  reward?: Record<string, any>
  progress?: { status: "PENDING" | "COMPLETED" | "REWARDED" }
}

type Quest = {
  id: string
  key: string
  title: string
  description?: string
  order: number
  tasks: Task[]
}

export default function TutorialPage() {
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [playerId, setPlayerId] = useState<string>("")

  useEffect(() => {
    // In a real app, derive from auth context. For now, use stored value or prompt.
    const pid = (typeof window !== 'undefined' && localStorage.getItem('playerId')) || ''
    setPlayerId(pid)
  }, [])

  useEffect(() => {
    if (!playerId) return
    setLoading(true)
    fetch(`/api/tutorial/quests?playerId=${playerId}`)
      .then((r) => r.json())
      .then((j) => setQuests(j.data || []))
      .finally(() => setLoading(false))
  }, [playerId])

  const completeTask = async (taskId: string) => {
    if (!playerId) return alert("Missing player context")
    const res = await fetch(`/api/tutorial/tasks/${taskId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    })
    if (res.ok) {
      const refreshed = await fetch(`/api/tutorial/quests?playerId=${playerId}`).then((r) => r.json())
      setQuests(refreshed.data || [])
    } else {
      const j = await res.json()
      alert(j.error || 'Failed to complete task')
    }
  }

  if (loading) return <main className="p-6">Loading quests…</main>

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Beginner Quests</h1>
      {quests.map((q) => (
        <section key={q.id} className="border border-border rounded-lg p-4 bg-card/50 space-y-3">
          <div>
            <h2 className="text-lg font-semibold">{q.title}</h2>
            {q.description && <p className="text-sm text-muted-foreground">{q.description}</p>}
          </div>
          <ul className="space-y-2">
            {q.tasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between border border-border rounded-md p-3">
                <div>
                  <div className="font-medium">{t.title}</div>
                  {t.description && <div className="text-sm text-muted-foreground">{t.description}</div>}
                  {t.reward && (
                    <div className="text-xs text-muted-foreground mt-1">Reward: {Object.entries(t.reward).map(([k,v]) => `${k}+${v}`).join(', ')}</div>
                  )}
                </div>
                <div>
                  {t.progress?.status === 'COMPLETED' ? (
                    <span className="text-green-600 text-sm">Completed</span>
                  ) : (
                    <button
                      className="px-3 py-1 bg-primary text-primary-foreground rounded"
                      onClick={() => completeTask(t.id)}
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
    
        </section>
      ))}
    </main>
  )
}

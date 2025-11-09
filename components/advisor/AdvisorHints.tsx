"use client"

import { useEffect, useState } from "react"

type Hint = { id: string; title: string; body: string; actionHref?: string; actionLabel?: string }

const HINTS: Record<string, Hint[]> = {
  dashboard: [
    {
      id: "dash_intro",
      title: "Welcome to your village!",
      body: "Use the panels to manage buildings, train troops, and view reports. Check Beginner Quests for guided rewards.",
      actionHref: "/tutorial",
      actionLabel: "Open Beginner Quests",
    },
  ],
  market: [
    {
      id: "market_intro",
      title: "Trading basics",
      body: "Create sell orders to offer resources, or accept offers from others. Protected players can only accept 1:1 or better trades.",
    },
  ],
  rally: [
    {
      id: "rally_intro",
      title: "Rally point",
      body: "Send attacks or reinforcements. Attacking non‑protected players while under protection will end protection early.",
    },
  ],
}

export function AdvisorHints({ scope, enabled = true }: { scope: keyof typeof HINTS; enabled?: boolean }) {
  const [visible, setVisible] = useState(false)
  const [index, setIndex] = useState(0)
  const hints = HINTS[scope]

  useEffect(() => {
    if (!enabled) return
    const key = `advisor_seen_${scope}`
    const seen = localStorage.getItem(key)
    if (!seen) {
      setVisible(true)
    }
  }, [scope, enabled])

  if (!visible || !enabled) return null
  const hint = hints[index]

  const dismiss = () => {
    const key = `advisor_seen_${scope}`
    localStorage.setItem(key, "1")
    setVisible(false)
  }

  const next = () => {
    if (index < hints.length - 1) setIndex(index + 1)
    else dismiss()
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="max-w-md rounded-lg border border-border bg-background p-4 shadow-xl">
        <div className="text-base font-semibold mb-1">{hint.title}</div>
        <div className="text-sm text-muted-foreground mb-3">{hint.body}</div>
        <div className="flex items-center gap-2 justify-end">
          {hint.actionHref && (
            <a href={hint.actionHref} className="px-3 py-1 text-sm border rounded">{hint.actionLabel ?? 'Learn more'}</a>
          )}
          <button onClick={next} className="px-3 py-1 text-sm border rounded">{index < hints.length - 1 ? 'Next' : 'Close'}</button>
        </div>
      </div>
    </div>
  )
}


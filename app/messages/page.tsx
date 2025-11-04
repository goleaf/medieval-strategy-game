"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { TextTable } from "@/components/game/text-table"
import { Button } from "@/components/ui/button"

interface Message {
  id: string
  type: string
  subject: string
  content: string
  isRead: boolean
  createdAt: string
  sender: { playerName: string }
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [filter, setFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchMessages = async (messageFilter: string | null) => {
    try {
      setLoading(true)
      const url = messageFilter
        ? `/api/messages?playerId=temp-player-id&type=${messageFilter}`
        : `/api/messages?playerId=temp-player-id`
      const res = await fetch(url)
      const result = await res.json()
      if (result.success && result.data) {
        setMessages(result.data)
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error)
    } finally {
      setLoading(false)
    }
  }

  const switchFilter = async (newFilter: string | null) => {
    setFilter(newFilter)
    await fetchMessages(newFilter)
  }

  const markAsRead = async (messageId: string) => {
    try {
      await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, isRead: true }),
      })
      await fetchMessages(filter)
      return { success: true }
    } catch (error) {
      console.error("Failed to mark as read:", error)
      return { success: false }
    }
  }

  useEffect(() => {
    switchFilter(null)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="text-sm hover:underline">
            ← Back
          </Link>
          <h1 className="text-xl font-bold">💬 Messages</h1>
          <Button variant="outline" size="sm">
            Compose
          </Button>
        </div>
      </header>

      <main className="w-full p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={() => switchFilter(null)}
              variant={filter === null ? 'default' : 'outline'}
            >
              All
            </Button>
            <Button
              onClick={() => switchFilter('SYSTEM')}
              variant={filter === 'SYSTEM' ? 'default' : 'outline'}
            >
              System
            </Button>
            <Button
              onClick={() => switchFilter('ATTACK_RESULT')}
              variant={filter === 'ATTACK_RESULT' ? 'default' : 'outline'}
            >
              Battles
            </Button>
          </div>

          {loading && (
            <div className="text-center py-4">Loading...</div>
          )}
          {!loading && (
            <TextTable
              headers={["Type", "Subject", "From", "Date", "Status", "Actions"]}
              rows={messages.map((msg) => [
                msg.type,
                msg.subject,
                msg.sender?.playerName || "System",
                new Date(msg.createdAt).toLocaleDateString(),
                msg.isRead ? "Read" : "Unread",
                <Button
                  key={msg.id}
                  variant="outline"
                  size="sm"
                  onClick={() => markAsRead(msg.id)}
                  disabled={msg.isRead}
                >
                  {msg.isRead ? 'Read' : 'Mark Read'}
                </Button>,
              ])}
            />
          )}
        </div>
      </main>
    </div>
  )
}

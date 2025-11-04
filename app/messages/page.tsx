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
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | null>(null)

  useEffect(() => {
    fetchMessages()
  }, [filter])

  const fetchMessages = async () => {
    setLoading(true)
    try {
      const url = filter
        ? `/api/messages?playerId=temp-player-id&type=${filter}`
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

  const markAsRead = async (messageId: string) => {
    try {
      await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, isRead: true }),
      })
      fetchMessages()
    } catch (error) {
      console.error("Failed to mark as read:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

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
            <Button variant={filter === null ? "default" : "outline"} onClick={() => setFilter(null)}>
              All
            </Button>
            <Button
              variant={filter === "SYSTEM" ? "default" : "outline"}
              onClick={() => setFilter("SYSTEM")}
            >
              System
            </Button>
            <Button
              variant={filter === "ATTACK_RESULT" ? "default" : "outline"}
              onClick={() => setFilter("ATTACK_RESULT")}
            >
              Battles
            </Button>
          </div>

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
                {msg.isRead ? "Read" : "Mark Read"}
              </Button>,
            ])}
          />
        </div>
      </main>
    </div>
  )
}


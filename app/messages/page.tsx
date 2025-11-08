"use client"

import { useState, useEffect, useCallback } from "react"
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
  const [showComposeForm, setShowComposeForm] = useState(false)
  const [composeForm, setComposeForm] = useState({
    subject: "",
    content: "",
    type: "DIPLOMACY" as "DIPLOMACY" | "ALLY_REQUEST" | "TRADE_OFFER",
  })
  const [composing, setComposing] = useState(false)

  const fetchMessages = useCallback(async (messageFilter: string | null) => {
    try {
      setLoading(true)
      const authToken = localStorage.getItem("authToken")
      const playerId = localStorage.getItem("playerId")

      if (!authToken || !playerId) {
        console.error("No auth token or player ID found")
        setMessages([])
        setLoading(false)
        return
      }

      const url = messageFilter
        ? `/api/messages?playerId=${playerId}&type=${messageFilter}`
        : `/api/messages?playerId=${playerId}`

      const res = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${authToken}`,
        },
      })
      const result = await res.json()
      if (result.success && result.data) {
        setMessages(result.data)
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  const switchFilter = useCallback(async (newFilter: string | null) => {
    setFilter(newFilter)
    await fetchMessages(newFilter)
  }, [fetchMessages])

  const markAsRead = useCallback(async (messageId: string) => {
    try {
      const authToken = localStorage.getItem("authToken")
      if (!authToken) {
        console.error("No auth token found")
        return { success: false }
      }

      await fetch("/api/messages", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({ messageId, isRead: true }),
      })
      await fetchMessages(filter)
      return { success: true }
    } catch (error) {
      console.error("Failed to mark as read:", error)
      return { success: false }
    }
  }, [fetchMessages, filter])

  const sendMessage = async () => {
    if (!composeForm.subject.trim() || !composeForm.content.trim()) {
      alert("Subject and content are required")
      return
    }

    try {
      setComposing(true)
      const authToken = localStorage.getItem("authToken")
      const playerId = localStorage.getItem("playerId")

      if (!authToken || !playerId) {
        alert("Please log in to send messages")
        return
      }

      const res = await fetch("/api/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          senderId: playerId,
          type: composeForm.type,
          subject: composeForm.subject.trim(),
          content: composeForm.content.trim(),
        }),
      })

      const result = await res.json()

      if (result.success) {
        setShowComposeForm(false)
        setComposeForm({
          subject: "",
          content: "",
          type: "DIPLOMACY",
        })
        await fetchMessages(filter) // Refresh the messages list
        alert("Message sent successfully!")
      } else {
        alert(result.error || "Failed to send message")
      }
    } catch (error) {
      console.error("Failed to send message:", error)
      alert("Failed to send message")
    } finally {
      setComposing(false)
    }
  }

  useEffect(() => {
    switchFilter(null)
  }, [switchFilter])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="text-sm hover:underline">
            ← Back
          </Link>
          <h1 className="text-xl font-bold">💬 Messages</h1>
          <Button variant="outline" size="sm" onClick={() => setShowComposeForm(true)}>
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

      {/* Compose Message Modal */}
      {showComposeForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-lg font-bold mb-4">Compose Message</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={composeForm.type}
                  onChange={(e) => setComposeForm(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full p-2 border border-border rounded bg-background"
                >
                  <option value="DIPLOMACY">Diplomacy</option>
                  <option value="ALLY_REQUEST">Alliance Request</option>
                  <option value="TRADE_OFFER">Trade Offer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <input
                  type="text"
                  value={composeForm.subject}
                  onChange={(e) => setComposeForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="Message subject"
                  maxLength={200}
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Content</label>
                <textarea
                  value={composeForm.content}
                  onChange={(e) => setComposeForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Write your message..."
                  maxLength={5000}
                  rows={6}
                  className="w-full p-2 border border-border rounded bg-background"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowComposeForm(false)}
                  disabled={composing}
                >
                  Cancel
                </Button>
                <Button onClick={sendMessage} disabled={composing}>
                  {composing ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

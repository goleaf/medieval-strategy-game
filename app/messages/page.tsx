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

  const fetchMessages = async (messageFilter: string | null) => {
    try {
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
    }
  }

  const markAsRead = async (messageId: string) => {
    try {
      await fetch("/api/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, isRead: true }),
      })
      return { success: true }
    } catch (error) {
      console.error("Failed to mark as read:", error)
      return { success: false }
    }
  }

  useEffect(() => {
    fetchMessages(null)
    if (typeof window !== "undefined") {
      (window as any).__messagesFetchHandler = fetchMessages
      (window as any).__messagesMarkReadHandler = markAsRead
    }
    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).__messagesFetchHandler
        delete (window as any).__messagesMarkReadHandler
      }
    }
  }, [])

  return (
    <div
      x-data={`{
        filter: null,
        messages: ${JSON.stringify(messages)},
        loading: false,
        async switchFilter(newFilter) {
          this.filter = newFilter;
          this.loading = true;
          if (window.__messagesFetchHandler) {
            await window.__messagesFetchHandler(this.filter);
            this.messages = ${JSON.stringify(messages)};
          }
          this.loading = false;
        },
        async markAsRead(messageId) {
          if (window.__messagesMarkReadHandler) {
            const result = await window.__messagesMarkReadHandler(messageId);
            if (result.success && window.__messagesFetchHandler) {
              await window.__messagesFetchHandler(this.filter);
              this.messages = ${JSON.stringify(messages)};
            }
          }
        }
      }`}
      x-init="switchFilter(null)"
      className="min-h-screen bg-background text-foreground"
    >
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
              x-on:click="switchFilter(null)"
              x-bind:variant="filter === null ? 'default' : 'outline'"
            >
              All
            </Button>
            <Button
              x-on:click="switchFilter('SYSTEM')"
              x-bind:variant="filter === 'SYSTEM' ? 'default' : 'outline'"
            >
              System
            </Button>
            <Button
              x-on:click="switchFilter('ATTACK_RESULT')"
              x-bind:variant="filter === 'ATTACK_RESULT' ? 'default' : 'outline'"
            >
              Battles
            </Button>
          </div>

          <div x-show="loading" className="text-center py-4">Loading...</div>
          <div x-show="!loading">
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
                  x-on:click={`markAsRead('${msg.id}')`}
                  x-bind:disabled={`${msg.isRead}`}
                >
                  <span x-show={`${msg.isRead}`}>Read</span>
                  <span x-show={`${!msg.isRead}`}>Mark Read</span>
                </Button>,
              ])}
            />
          </div>
        </div>
      </main>
    </div>
  )
}

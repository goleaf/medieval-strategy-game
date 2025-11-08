"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { MessageSquare, Send, Users, User, X } from "lucide-react"

interface MessageComposerProps {
  currentPlayerId: string
  onSendMessage: (data: {
    recipientId?: string
    allianceRole?: "ally" | "def" | "off"
    subject: string
    content: string
  }) => Promise<void>
  onClose?: () => void
}

type Mode = "compose" | "alliance"

export function MessageComposer({ currentPlayerId, onSendMessage, onClose }: MessageComposerProps) {
  const [mode, setMode] = useState<Mode>("compose")
  const [recipientId, setRecipientId] = useState("")
  const [allianceRole, setAllianceRole] = useState<"ally" | "def" | "off">("ally")
  const [subject, setSubject] = useState("")
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSend = async () => {
    if (!subject.trim() || !content.trim()) return

    setLoading(true)
    try {
      if (mode === "alliance") {
        await onSendMessage({
          allianceRole,
          subject: subject.trim(),
          content: content.trim(),
        })
      } else {
        if (!recipientId.trim()) return
        await onSendMessage({
          recipientId: recipientId.trim(),
          subject: subject.trim(),
          content: content.trim(),
        })
      }

      // Reset form
      setRecipientId("")
      setSubject("")
      setContent("")
      onClose?.()
    } catch (error) {
      console.error("Failed to send message:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Compose Message
        </h3>
        {onClose && (
          <Button onClick={onClose} variant="ghost" size="sm">
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Mode Selector */}
      <div className="flex gap-2">
        <Button
          onClick={() => setMode("compose")}
          variant={mode === "compose" ? "default" : "outline"}
          size="sm"
          className="flex items-center gap-2"
        >
          <User className="w-4 h-4" />
          Player Message
        </Button>
        <Button
          onClick={() => setMode("alliance")}
          variant={mode === "alliance" ? "default" : "outline"}
          size="sm"
          className="flex items-center gap-2"
        >
          <Users className="w-4 h-4" />
          Alliance Message
        </Button>
      </div>

      {/* Recipient Selection */}
      {mode === "compose" && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Recipient Player ID</label>
          <Input
            placeholder="Enter player ID or name"
            value={recipientId}
            onChange={(e) => setRecipientId(e.target.value)}
          />
        </div>
      )}

      {mode === "alliance" && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Alliance Recipients</label>
          <div className="flex gap-2">
            <Button
              onClick={() => setAllianceRole("ally")}
              variant={allianceRole === "ally" ? "default" : "outline"}
              size="sm"
            >
              All Members [ally]
            </Button>
            <Button
              onClick={() => setAllianceRole("def")}
              variant={allianceRole === "def" ? "default" : "outline"}
              size="sm"
            >
              Defense [def]
            </Button>
            <Button
              onClick={() => setAllianceRole("off")}
              variant={allianceRole === "off" ? "default" : "outline"}
              size="sm"
            >
              Offense [off]
            </Button>
          </div>
        </div>
      )}

      {/* Subject */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Subject</label>
        <Input
          placeholder="Message subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={200}
        />
      </div>

      {/* Content */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Message</label>
        <Textarea
          placeholder="Type your message here..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          maxLength={5000}
        />
        <div className="text-xs text-muted-foreground text-right">
          {content.length}/5000
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {onClose && (
          <Button onClick={onClose} variant="outline" className="flex-1">
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSend}
          disabled={!subject.trim() || !content.trim() || (mode === "compose" && !recipientId.trim()) || loading}
          className="flex-1"
        >
          {loading ? "Sending..." : "Send Message"}
          <Send className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  )
}

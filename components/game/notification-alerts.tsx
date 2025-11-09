"use client"

import { useEffect, useRef } from "react"
import { useToast } from "@/components/ui/use-toast"
import { NOTIFICATION_TYPE_CONFIG } from "@/lib/config/notification-types"
import type { NotificationController } from "@/types/notifications"

function playTone(freq: number) {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.value = freq
    gain.gain.value = 0.15
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.5)
    osc.onended = () => ctx.close()
  } catch {}
}

function playPrioritySound(priority: string) {
  switch (priority) {
    case "CRITICAL":
      playTone(620)
      break
    case "HIGH":
      playTone(440)
      break
    case "MEDIUM":
      playTone(880)
      break
    case "LOW":
      playTone(540)
      break
    default:
      break
  }
}

export function NotificationAlerts({ controller }: { controller: NotificationController | null }) {
  const { toast } = useToast()
  const seen = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!controller) return
    const list = controller.notifications
    for (const n of list) {
      if (n.isRead) continue
      if (n.muted) continue
      if (seen.current.has(n.id)) continue
      const config = NOTIFICATION_TYPE_CONFIG[n.type]
      if (!config?.defaultChannels?.popup) continue

      // Mark as seen to avoid duplicate toasts
      seen.current.add(n.id)

      // Determine toast duration based on priority and channels
      const critical = n.priority === "CRITICAL"
      const high = n.priority === "HIGH"
      const duration = critical || high ? undefined : (config.defaultChannels.autoDismiss ?? 8000)

      toast({
        title: n.title,
        description: n.message,
        duration,
        action: {
          label: critical || high ? "Acknowledge" : "Open",
          onClick: () => {
            controller.markAsRead(n.id)
            if (n.actionUrl) {
              window.location.href = n.actionUrl
            }
          },
        },
      })

      // Play a simple tone according to priority
      if (config.defaultChannels.sound || critical || high) {
        playPrioritySound(n.priority)
      }
    }
  }, [controller, controller?.notifications, toast])

  return null
}


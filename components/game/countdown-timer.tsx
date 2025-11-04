"use client"

import { useEffect, useState } from "react"

interface CountdownTimerProps {
  targetDate: string | Date
  className?: string
}

export function CountdownTimer({ targetDate, className = "" }: CountdownTimerProps) {
  const target = typeof targetDate === "string" ? new Date(targetDate) : targetDate
  const [timeLeft, setTimeLeft] = useState("")

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const diff = Math.max(0, target.getTime() - now.getTime())
      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${minutes}m ${seconds}s`)
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)

    return () => clearInterval(interval)
  }, [target])

  return (
    <span data-countdown={target.toISOString()} className={className}>
      {timeLeft || "Calculating..."}
    </span>
  )
}


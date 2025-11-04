"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { TextTable } from "@/components/game/text-table"
import { Button } from "@/components/ui/button"

interface Report {
  id: string
  type: string
  subject: string
  createdAt: string
  isRead: boolean
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"attacks" | "scouts" | "trade">("attacks")

  useEffect(() => {
    fetchReports()
    const interval = setInterval(fetchReports, 15000)
    return () => clearInterval(interval)
  }, [])

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/messages")
      const result = await res.json()
      if (result.success && result.data) {
        setReports(result.data)
      } else {
        setReports(result || [])
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error)
    } finally {
      setLoading(false)
    }
  }

  const attackReports = reports.filter((r) => r.type.includes("ATTACK"))
  const scoutReports = reports.filter((r) => r.type === "SCOUT")
  const tradeReports = reports.filter((r) => r.type === "TRADE")

  const getDisplayReports = () => {
    if (activeTab === "attacks") return attackReports
    if (activeTab === "scouts") return scoutReports
    return tradeReports
  }

  const displayReports = getDisplayReports()
  const unreadCount = reports.filter((r) => !r.isRead).length

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
          <h1 className="text-xl font-bold">
            📬 Reports {unreadCount > 0 && `(${unreadCount})`}
          </h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="w-full p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex gap-2">
            <Button
              variant={activeTab === "attacks" ? "default" : "outline"}
              onClick={() => setActiveTab("attacks")}
            >
              Attacks ({attackReports.length})
            </Button>
            <Button
              variant={activeTab === "scouts" ? "default" : "outline"}
              onClick={() => setActiveTab("scouts")}
            >
              Scouts ({scoutReports.length})
            </Button>
            <Button
              variant={activeTab === "trade" ? "default" : "outline"}
              onClick={() => setActiveTab("trade")}
            >
              Trade ({tradeReports.length})
            </Button>
          </div>

          <TextTable
            headers={["Subject", "Date", "Status", "Action"]}
            rows={displayReports.map((report) => [
              <span key="subject" className={!report.isRead ? "font-bold" : ""}>
                {report.subject}
              </span>,
              <span key="date" className="text-sm">
                {new Date(report.createdAt).toLocaleString()}
              </span>,
              report.isRead ? "Read" : "Unread",
              <Link
                key="action"
                href={`/reports/${report.id}`}
                className="px-2 py-1 border border-border rounded hover:bg-secondary text-sm"
              >
                View
              </Link>,
            ])}
          />
        </div>
      </main>
    </div>
  )
}

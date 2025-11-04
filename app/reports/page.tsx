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

type TabType = "attacks" | "scouts" | "trade"

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [activeTab, setActiveTab] = useState<TabType>("attacks")

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
    }
  }

  const attackReports = reports.filter(r => r.type.includes('ATTACK'))
  const scoutReports = reports.filter(r => r.type === 'SCOUT')
  const tradeReports = reports.filter(r => r.type === 'TRADE')

  const getDisplayReports = () => {
    switch (activeTab) {
      case 'attacks': return attackReports
      case 'scouts': return scoutReports
      case 'trade': return tradeReports
      default: return attackReports
    }
  }

  useEffect(() => {
    fetchReports()
    const interval = setInterval(fetchReports, 15000)
    return () => {
      clearInterval(interval)
    }
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/dashboard" className="text-sm hover:underline">
            ← Back
          </Link>
          <h1 className="text-xl font-bold">
            📬 Reports {reports.filter(r => !r.isRead).length > 0 && `(${reports.filter(r => !r.isRead).length})`}
          </h1>
          <div className="w-16" />
        </div>
      </header>

      <main className="w-full p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={() => setActiveTab('attacks')}
              variant={activeTab === 'attacks' ? 'default' : 'outline'}
            >
              Attacks ({attackReports.length})
            </Button>
            <Button
              onClick={() => setActiveTab('scouts')}
              variant={activeTab === 'scouts' ? 'default' : 'outline'}
            >
              Scouts ({scoutReports.length})
            </Button>
            <Button
              onClick={() => setActiveTab('trade')}
              variant={activeTab === 'trade' ? 'default' : 'outline'}
            >
              Trade ({tradeReports.length})
            </Button>
          </div>

          {activeTab === 'attacks' && (
            <TextTable
              headers={["Subject", "Date", "Status", "Action"]}
              rows={attackReports.map((report) => [
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
          )}
          {activeTab === 'scouts' && (
            <TextTable
              headers={["Subject", "Date", "Status", "Action"]}
              rows={scoutReports.map((report) => [
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
          )}
          {activeTab === 'trade' && (
            <TextTable
              headers={["Subject", "Date", "Status", "Action"]}
              rows={tradeReports.map((report) => [
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
          )}
        </div>
      </main>
    </div>
  )
}

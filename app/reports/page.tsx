"use client"

import { useState, useEffect } from "react"
import { Navbar } from "@/components/game/navbar"
import Link from "next/link"

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
  const [villages] = useState<any[]>([])

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await fetch("/api/messages")
        const data = await res.json()
        setReports(data)
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
    const interval = setInterval(fetchReports, 15000)
    return () => clearInterval(interval)
  }, [])

  const attackReports = reports.filter((r) => r.type.includes("ATTACK"))
  const scoutReports = reports.filter((r) => r.type === "SCOUT")
  const tradeReports = reports.filter((r) => r.type === "TRADE")

  const getDisplayReports = () => {
    if (activeTab === "attacks") return attackReports
    if (activeTab === "scouts") return scoutReports
    return tradeReports
  }

  const displayReports = getDisplayReports()

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar
        villages={villages}
        currentVillageId={null}
        onVillageChange={() => {}}
        notificationCount={reports.filter((r) => !r.isRead).length}
      />
      
      <main className="flex-1 w-full p-4">
        <div className="w-full max-w-4xl mx-auto space-y-4">
          <h1 className="text-2xl font-bold">Reports & Messages</h1>

          {/* Tab Switcher */}
          <section>
            <div className="flex flex-wrap gap-2 border-b border-border">
              <button
                onClick={() => setActiveTab("attacks")}
                className={`px-4 py-2 border-b-2 transition ${
                  activeTab === "attacks"
                    ? "border-primary font-bold"
                    : "border-transparent hover:border-border"
                }`}
              >
                Attacks ({attackReports.length})
              </button>
              <button
                onClick={() => setActiveTab("scouts")}
                className={`px-4 py-2 border-b-2 transition ${
                  activeTab === "scouts"
                    ? "border-primary font-bold"
                    : "border-transparent hover:border-border"
                }`}
              >
                Scouts ({scoutReports.length})
              </button>
              <button
                onClick={() => setActiveTab("trade")}
                className={`px-4 py-2 border-b-2 transition ${
                  activeTab === "trade"
                    ? "border-primary font-bold"
                    : "border-transparent hover:border-border"
                }`}
              >
                Trade ({tradeReports.length})
              </button>
            </div>
          </section>

          {/* Reports Table */}
          {loading ? (
            <section>
              <p>Loading reports...</p>
            </section>
          ) : (
            <section>
              <h2 className="text-lg font-bold mb-2">
                {activeTab === "attacks"
                  ? "Attack Reports"
                  : activeTab === "scouts"
                    ? "Scout Reports"
                    : "Trade Reports"}
              </h2>
              <table className="w-full border-collapse border border-border">
                <thead>
                  <tr>
                    <th className="border border-border p-2 text-left bg-secondary">Subject</th>
                    <th className="border border-border p-2 text-left bg-secondary">Date</th>
                    <th className="border border-border p-2 text-left bg-secondary">Status</th>
                    <th className="border border-border p-2 text-left bg-secondary">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {displayReports.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="border border-border p-4 text-center text-muted-foreground">
                        No {activeTab} reports yet
                      </td>
                    </tr>
                  ) : (
                    displayReports.map((report) => (
                      <tr
                        key={report.id}
                        className={!report.isRead ? "bg-primary/10" : ""}
                      >
                        <td className="border border-border p-2 font-bold">{report.subject}</td>
                        <td className="border border-border p-2 text-sm">
                          {new Date(report.createdAt).toLocaleString()}
                        </td>
                        <td className="border border-border p-2">
                          {report.isRead ? "Read" : "Unread"}
                        </td>
                        <td className="border border-border p-2">
                          <Link
                            href={`/reports/${report.id}`}
                            className="px-2 py-1 border border-border rounded hover:bg-secondary"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}

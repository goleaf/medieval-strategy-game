"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

  return (
    <main className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Reports & Messages</h1>

        {loading ? (
          <Card className="p-6 text-center">Loading reports...</Card>
        ) : (
          <Tabs defaultValue="attacks" className="space-y-4">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="attacks">Attacks ({attackReports.length})</TabsTrigger>
              <TabsTrigger value="scouts">Scouts ({scoutReports.length})</TabsTrigger>
              <TabsTrigger value="trade">Trade ({tradeReports.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="attacks">
              <div className="space-y-3">
                {attackReports.length === 0 ? (
                  <Card className="p-6 text-center text-muted-foreground">No attack reports yet</Card>
                ) : (
                  attackReports.map((report) => (
                    <Card
                      key={report.id}
                      className={`p-4 cursor-pointer hover:bg-secondary/50 transition ${!report.isRead ? "bg-primary/5" : ""}`}
                    >
                      <Link href={`/reports/${report.id}`}>
                        <p className="font-bold">{report.subject}</p>
                        <p className="text-xs text-muted-foreground">{new Date(report.createdAt).toLocaleString()}</p>
                      </Link>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="scouts">
              <div className="space-y-3">
                {scoutReports.length === 0 ? (
                  <Card className="p-6 text-center text-muted-foreground">No scout reports yet</Card>
                ) : (
                  scoutReports.map((report) => (
                    <Card key={report.id} className="p-4">
                      <p className="font-bold">{report.subject}</p>
                      <p className="text-xs text-muted-foreground">{new Date(report.createdAt).toLocaleString()}</p>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="trade">
              <div className="space-y-3">
                {tradeReports.length === 0 ? (
                  <Card className="p-6 text-center text-muted-foreground">No trade reports yet</Card>
                ) : (
                  tradeReports.map((report) => (
                    <Card key={report.id} className="p-4">
                      <p className="font-bold">{report.subject}</p>
                      <p className="text-xs text-muted-foreground">{new Date(report.createdAt).toLocaleString()}</p>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </main>
  )
}

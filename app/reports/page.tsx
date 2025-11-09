"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Loader2, Shield, Target, Swords, Search, Bell, AlarmClock, ArrowRight, Download, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import type { CombatReportListItem, SupportStatusPayload } from "@/lib/reports/types"

type PlayerResponse = {
  success: boolean
  data?: { player?: { id: string } }
}

type ReportListResponse = {
  success: boolean
  data?: CombatReportListItem[]
  error?: string
}

type SupportResponse = {
  success: boolean
  data?: SupportStatusPayload
  error?: string
}

const directionFilters = [
  { label: "All", value: "all" },
  { label: "Attacks sent", value: "sent" },
  { label: "Attacks received", value: "received" },
]

const missionFilters = [
  { label: "Any", value: "all" },
  { label: "Attack", value: "attack" },
  { label: "Raid", value: "raid" },
  { label: "Siege", value: "siege" },
]

export default function ReportsPage() {
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [reports, setReports] = useState<CombatReportListItem[]>([])
  const [supportStatus, setSupportStatus] = useState<SupportStatusPayload | null>(null)
  const [loadingReports, setLoadingReports] = useState(false)
  const [loadingSupport, setLoadingSupport] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [supportError, setSupportError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"combat" | "support">("combat")
  const [directionFilter, setDirectionFilter] = useState<string>("all")
  const [missionFilter, setMissionFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 400)
    return () => clearTimeout(timeout)
  }, [searchTerm])

  const fetchPlayer = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/player-data")
      const json: PlayerResponse = await res.json()
      if (json.success && json.data?.player?.id) {
        setPlayerId(json.data.player.id)
      } else {
        setPlayerId("temp-player-id")
      }
    } catch (error) {
      console.warn("Failed to load player", error)
      setPlayerId("temp-player-id")
    }
  }, [])

  const fetchReports = useCallback(
    async (pid: string) => {
      setLoadingReports(true)
      setReportError(null)
      try {
        const params = new URLSearchParams({ playerId: pid })
        if (directionFilter !== "all") params.set("direction", directionFilter)
        if (missionFilter !== "all") params.set("mission", missionFilter)
        if (debouncedSearch) params.set("search", debouncedSearch)
        const response = await fetch(`/api/reports?${params.toString()}`)
        const json: ReportListResponse = await response.json()
        if (!json.success || !json.data) {
          setReportError(json.error ?? "Failed to load reports.")
          setReports([])
        } else {
          setReports(json.data)
        }
      } catch (error) {
        setReportError(error instanceof Error ? error.message : "Failed to load reports.")
        setReports([])
      } finally {
        setLoadingReports(false)
      }
    },
    [directionFilter, missionFilter, debouncedSearch],
  )

  const fetchSupport = useCallback(
    async (pid: string) => {
      setLoadingSupport(true)
      setSupportError(null)
      try {
        const response = await fetch(`/api/reports/support?playerId=${pid}`)
        const json: SupportResponse = await response.json()
        if (!json.success || !json.data) {
          setSupportError(json.error ?? "Failed to load support status.")
          setSupportStatus(null)
        } else {
          setSupportStatus(json.data)
        }
      } catch (error) {
        setSupportError(error instanceof Error ? error.message : "Failed to load support status.")
        setSupportStatus(null)
      } finally {
        setLoadingSupport(false)
      }
    },
    [],
  )

  useEffect(() => {
    fetchPlayer()
  }, [fetchPlayer])

  useEffect(() => {
    if (playerId) {
      fetchReports(playerId)
      fetchSupport(playerId)
    }
  }, [playerId, fetchReports, fetchSupport])

  const summary = useMemo(() => {
    const total = reports.length
    const newCount = reports.filter((report) => report.isNew).length
    const sent = reports.filter((report) => report.direction === "sent").length
    const received = reports.filter((report) => report.direction === "received").length
    return { total, newCount, sent, received }
  }, [reports])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowRight className="w-4 h-4 rotate-180" />
              Back
            </Button>
          </Link>
          <div className="text-center space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Intelligence Center</p>
            <h1 className="text-2xl font-bold">Combat & Support Reports</h1>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export
          </Button>
        </div>
      </header>

      <main className="w-full p-4">
        <div className="max-w-6xl mx-auto space-y-6">
          <SummaryStrip summary={summary} loading={loadingReports} />

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "combat" | "support")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="combat">Combat Reports</TabsTrigger>
              <TabsTrigger value="support">Support & Returns</TabsTrigger>
            </TabsList>

            <TabsContent value="combat" className="space-y-4">
              <FiltersBar
                direction={directionFilter}
                onDirectionChange={setDirectionFilter}
                mission={missionFilter}
                onMissionChange={setMissionFilter}
                search={searchTerm}
                onSearchChange={setSearchTerm}
              />

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Swords className="w-5 h-5 text-primary" />
                      Recent Battles
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Newest reports highlighted.</p>
                  </div>
                  <div className="text-sm text-muted-foreground">{reports.length} entries</div>
                </CardHeader>
                <CardContent>
                  {loadingReports ? (
                    <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading combat reports…
                    </div>
                  ) : reportError ? (
                    <p className="text-sm text-destructive">{reportError}</p>
                  ) : reports.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No reports match your filters.</p>
                  ) : (
                    <div className="space-y-2">
                      {reports.map((report) => (
                        <ReportRow key={report.id} report={report} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="support" className="space-y-4">
              <Card>
                <CardHeader className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Shield className="w-5 h-5 text-primary" />
                      Support Management
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Monitor stationed troops and incoming support.</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => playerId && fetchSupport(playerId)}>
                    <RefreshIcon loading={loadingSupport} />
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {supportError && <p className="text-sm text-destructive">{supportError}</p>}
                  <SupportOverview status={supportStatus} loading={loadingSupport} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}

function SummaryStrip({ summary, loading }: { summary: { total: number; newCount: number; sent: number; received: number }; loading: boolean }) {
  const cards = [
    { label: "Total reports", value: summary.total, icon: <Bell className="w-4 h-4" /> },
    { label: "New", value: summary.newCount, icon: <AlarmClock className="w-4 h-4" /> },
    { label: "Attacks sent", value: summary.sent, icon: <Target className="w-4 h-4" /> },
    { label: "Attacks received", value: summary.received, icon: <Shield className="w-4 h-4" /> },
  ]
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="flex items-center justify-between py-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
              <p className="text-xl font-semibold">{loading ? "—" : card.value}</p>
            </div>
            <div className="text-muted-foreground">{card.icon}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function FiltersBar({
  direction,
  onDirectionChange,
  mission,
  onMissionChange,
  search,
  onSearchChange,
}: {
  direction: string
  onDirectionChange: (value: string) => void
  mission: string
  onMissionChange: (value: string) => void
  search: string
  onSearchChange: (value: string) => void
}) {
  return (
    <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
      <div className="flex flex-wrap gap-2">
        {directionFilters.map((filter) => (
          <Button
            key={filter.value}
            variant={direction === filter.value ? "default" : "outline"}
            size="sm"
            onClick={() => onDirectionChange(filter.value)}
          >
            {filter.label}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 w-full md:w-auto">
        <div className="flex gap-2">
          {missionFilters.map((filter) => (
            <Button
              key={filter.value}
              variant={mission === filter.value ? "secondary" : "outline"}
              size="sm"
              onClick={() => onMissionChange(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
        <div className="relative flex-1 md:flex-none">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search by player or coordinates"
            className="pl-8 min-w-[220px]"
          />
        </div>
      </div>
    </div>
  )
}

function ReportRow({ report }: { report: CombatReportListItem }) {
  return (
    <Link
      href={`/reports/${report.id}`}
      className={`block border border-border rounded-lg px-4 py-3 hover:border-primary/60 transition ${report.isNew ? "bg-primary/5" : "bg-card/30"}`}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold">{report.subject}</p>
            {report.isNew && <Badge variant="secondary">New</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {report.attacker.playerName ?? "Unknown"} → {report.defender.playerName ?? "Unknown"} • {formatDate(report.createdAt)}
          </p>
          <p className="text-xs text-muted-foreground">
            Expires {formatDate(report.expiresAt)} • Outcome: {describeOutcome(report.outcome)}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {report.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
          <Button variant="ghost" size="icon">
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Link>
  )
}

function SupportOverview({ status, loading }: { status: SupportStatusPayload | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading support summaries…
      </div>
    )
  }
  if (!status) {
    return <p className="text-sm text-muted-foreground">No support data available.</p>
  }
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Stationed abroad
        </h3>
        {status.stationedAbroad.length === 0 ? (
          <p className="text-sm text-muted-foreground">No troops stationed in other villages.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {status.stationedAbroad.map((stack) => (
              <div key={`${stack.villageId}-${stack.unitTypeId}`} className="border border-border rounded-lg p-3 bg-card/40 space-y-1">
                <p className="text-sm font-semibold">{stack.villageName ?? "Unknown village"}</p>
                <p className="text-xs text-muted-foreground">Owner: {stack.villageOwner ?? "Unknown"}</p>
                <p className="text-sm">
                  {stack.unitName} · {stack.count.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <Separator />

      <section className="space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Swords className="w-4 h-4" />
          Support received
        </h3>
        {status.supportReceived.length === 0 ? (
          <p className="text-sm text-muted-foreground">No external support in your villages.</p>
        ) : (
          <div className="space-y-3">
            {status.supportReceived.map((entry) => (
              <div key={entry.villageId} className="border border-border rounded-lg p-3 bg-card/30 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{entry.villageName ?? entry.villageId}</p>
                  <Badge variant="secondary">{entry.totalTroops.toLocaleString()} units</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {entry.contributors.map((contributor) => `${contributor.ownerName ?? "Unknown"} (${contributor.totalUnits.toLocaleString()})`).join(" • ")}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <Separator />

      <section className="space-y-2">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Target className="w-4 h-4" />
          Returning troops
        </h3>
        {status.returningMissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No returning missions en route.</p>
        ) : (
          <div className="space-y-2">
            {status.returningMissions.map((mission) => (
              <div key={mission.movementId} className="border border-border rounded-lg p-3 bg-card/40 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{mission.toVillageName ?? "Home village"}</p>
                  <p className="text-xs text-muted-foreground">
                    Arrives {formatDate(mission.arriveAt)} · {mission.mission.toUpperCase()}
                  </p>
                </div>
                <Button size="sm" variant="outline">
                  Recall
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function RefreshIcon({ loading }: { loading: boolean }) {
  if (loading) {
    return <Loader2 className="w-4 h-4 animate-spin" />
  }
  return <RefreshCw className="w-4 h-4" />
}

function describeOutcome(outcome: CombatReportListItem["outcome"]) {
  switch (outcome) {
    case "attacker_victory":
      return "Attacker victory"
    case "defender_victory":
      return "Defender victory"
    case "mutual_loss":
      return "Mutual loss"
    default:
      return "Undecided"
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

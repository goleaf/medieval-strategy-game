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
import type {
  CombatReportListItem,
  ParticipantSummary,
  ScoutIntelReport,
  SupportStatusPayload,
} from "@/lib/reports/types"
import type { SystemFolderKey } from "@/lib/reports/manage"

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

type IntelResponse = {
  success: boolean
  data?: ScoutIntelReport[]
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
  const [intelReports, setIntelReports] = useState<ScoutIntelReport[]>([])
  const [loadingIntel, setLoadingIntel] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [supportError, setSupportError] = useState<string | null>(null)
  const [intelError, setIntelError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"combat" | "support" | "intel" | "analytics">("combat")
  const [analytics, setAnalytics] = useState<{
    totals: { sent: number; received: number; attackerVictories: number; defenderVictories: number; mutualLosses: number }
    rates: { attackSuccess: number; defenseSuccess: number }
    losses: { attacker: number; defender: number }
    timeline: Array<{ day: string; sent: number; received: number }>
  } | null>(null)
  const [directionFilter, setDirectionFilter] = useState<string>("all")
  const [missionFilter, setMissionFilter] = useState<string>("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [folderOverview, setFolderOverview] = useState<{
    system: Array<{ id: string; name: string; count: number; key?: SystemFolderKey }>
    custom: Array<{ id: string; name: string; count: number }>
    tags: Array<{ id: string; label: string; count: number; color?: string | null }>
  } | null>(null)
  const [activeSystemFolder, setActiveSystemFolder] = useState<SystemFolderKey | null>(null)
  const [activeCustomFolderId, setActiveCustomFolderId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Record<string, boolean>>({})

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

  const fetchFolders = useCallback(
    async (pid: string) => {
      try {
        const res = await fetch(`/api/reports/manage/folders?playerId=${pid}`)
        const json = await res.json()
        if (json.success && json.data) setFolderOverview(json.data)
      } catch {}
    },
    [],
  )

  const fetchAnalytics = useCallback(
    async (pid: string) => {
      try {
        const res = await fetch(`/api/reports/analytics?playerId=${pid}`)
        const json = await res.json()
        if (json.success && json.data) setAnalytics(json.data)
      } catch {}
    },
    [],
  )

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

  const fetchIntel = useCallback(
    async (pid: string) => {
      setLoadingIntel(true)
      setIntelError(null)
      try {
        const response = await fetch(`/api/reports/intel?playerId=${pid}`)
        const json: IntelResponse = await response.json()
        if (!json.success || !json.data) {
          setIntelError(json.error ?? "Failed to load scouting intel.")
          setIntelReports([])
        } else {
          setIntelReports(json.data)
        }
      } catch (error) {
        setIntelError(error instanceof Error ? error.message : "Failed to load scouting intel.")
        setIntelReports([])
      } finally {
        setLoadingIntel(false)
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
      fetchIntel(playerId)
      fetchFolders(playerId)
      fetchAnalytics(playerId)
    }
  }, [playerId, fetchReports, fetchSupport, fetchIntel, fetchFolders, fetchAnalytics])

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

          <div className="grid gap-4 md:grid-cols-[240px_1fr]">
            <aside className="space-y-4">
              <FolderTree
                overview={folderOverview}
                activeSystem={activeSystemFolder}
                onSelectSystem={(key) => {
                  setActiveSystemFolder(key)
                  setActiveCustomFolderId(null)
                  if (key === "scouting") setActiveTab("intel")
                  else if (key === "support") setActiveTab("support")
                  else setActiveTab("combat")
                  if (key === "attacks_sent") setDirectionFilter("sent")
                  else if (key === "attacks_received") setDirectionFilter("received")
                }}
                activeCustomId={activeCustomFolderId}
                onSelectCustom={(id) => {
                  setActiveCustomFolderId(id)
                  setActiveSystemFolder(null)
                  setActiveTab("combat")
                }}
              />
            </aside>
            <section className="space-y-6">
              <BulkBar selected={selected} onAction={async (action) => {
                if (!playerId) return
                const items = Object.entries(selected)
                  .filter(([, v]) => v)
                  .map(([id]) => ({ kind: "MOVEMENT" as const, refId: id }))
                if (!items.length) return
                await fetch("/api/reports/manage/meta", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ playerId, items, action }),
                })
                setSelected({})
                fetchFolders(playerId)
              }} />
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="combat">Combat Reports</TabsTrigger>
                  <TabsTrigger value="support">Support & Returns</TabsTrigger>
                  <TabsTrigger value="intel">Scouting</TabsTrigger>
                  <TabsTrigger value="analytics">Analytics</TabsTrigger>
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
                        <div key={report.id} className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            className="mt-2"
                            checked={Boolean(selected[report.id])}
                            onChange={(e) => setSelected((prev) => ({ ...prev, [report.id]: e.target.checked }))}
                          />
                          <ReportRow report={report} />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Performance Overview</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <Stat label="Attacks sent" value={analytics?.totals.sent ?? 0} />
                  <Stat label="Attacks received" value={analytics?.totals.received ?? 0} />
                  <Stat label="Attack success rate" value={formatRate(analytics?.rates.attackSuccess)} />
                  <Stat label="Defense success rate" value={formatRate(analytics?.rates.defenseSuccess)} />
                  <Stat label="Losses (attacker)" value={(analytics?.losses.attacker ?? 0).toLocaleString()} />
                  <Stat label="Losses (defender)" value={(analytics?.losses.defender ?? 0).toLocaleString()} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Activity Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  {!analytics?.timeline?.length ? (
                    <p className="text-sm text-muted-foreground">No data available.</p>
                  ) : (
                    <div className="text-xs text-muted-foreground space-y-1">
                      {analytics.timeline.slice(-14).map((p) => (
                        <div key={p.day} className="flex items-center justify-between">
                          <span>{p.day}</span>
                          <span>Sent {p.sent} • Received {p.received}</span>
                        </div>
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

            <TabsContent value="intel" className="space-y-4">
              <Card>
                <CardHeader className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Search className="w-5 h-5 text-primary" />
                      Scouting Intel (24h)
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">Latest scouting results with deltas.</p>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => playerId && fetchIntel(playerId)}>
                    <RefreshIcon loading={loadingIntel} />
                    Refresh
                  </Button>
                </CardHeader>
                <CardContent>
                  {loadingIntel ? (
                    <div className="flex items-center justify-center py-10 text-muted-foreground gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading scouting intel…
                    </div>
                  ) : intelError ? (
                    <p className="text-sm text-destructive">{intelError}</p>
                  ) : intelReports.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No recent scouting intel found.</p>
                  ) : (
                    <div className="space-y-2">
                      {intelReports.map((entry) => (
                        <IntelRow key={entry.id} report={entry} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
              </Tabs>
            </section>
          </div>
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
          <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-1">
            <ParticipantLink participant={report.attacker} />
            <span>→</span>
            <ParticipantLink participant={report.defender} />
            <span>• {formatDate(report.createdAt)}</span>
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

function ParticipantLink({ participant }: { participant: ParticipantSummary }) {
  const label = participant.playerName ?? "Unknown"
  if (participant.playerId) {
    return (
      <Link href={`/players/${participant.playerId}`} className="text-primary hover:underline">
        {label}
      </Link>
    )
  }
  return <span>{label}</span>
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

function IntelRow({ report }: { report: ScoutIntelReport }) {
  const [expanded, setExpanded] = useState(false)
  const reliabilityLabel =
    report.reliability === "full" ? "High confidence" : report.reliability === "partial" ? "Partial" : "Failed"
  const badgeVariant = report.reliability === "full" ? "default" : report.reliability === "partial" ? "secondary" : "outline"
  const expiresIn = timeUntil(report.expiresAt)
  return (
    <div className={`border border-border rounded-lg px-4 py-3 bg-card/30 ${report.superseded ? "opacity-70" : ""}`}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold">
              {report.defender.villageName ?? report.defender.coordsLabel ?? report.defender.villageId}
            </p>
            <Badge variant={badgeVariant}>{reliabilityLabel}</Badge>
            <span className="text-xs text-muted-foreground">{timeAgo(report.resolvedAt)}</span>
            {report.superseded && <Badge variant="outline">Superseded</Badge>}
          </div>
          <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-1">
            <ParticipantLink participant={report.attacker} />
            <span>→</span>
            <ParticipantLink participant={report.defender} />
          </p>
          <p className="text-xs text-muted-foreground">Expires in {expiresIn}</p>
        </div>
        <div className="text-sm space-y-1 min-w-[260px]">
          <div className="flex items-center justify-between">
            <span>Troops</span>
            <span>
              {report.summary.troopCount != null ? report.summary.troopCount.toLocaleString() : "—"}
              {report.deltas.troopCount != null && <Delta value={report.deltas.troopCount} />}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Resources</span>
            <span>
              {report.summary.resourceTotal != null ? report.summary.resourceTotal.toLocaleString() : "—"}
              {report.deltas.resourceTotal != null && <Delta value={report.deltas.resourceTotal} />}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Wall</span>
            <span>
              {report.summary.wallLevel != null ? report.summary.wallLevel : "—"}
              {report.deltas.wallLevel != null && <Delta value={report.deltas.wallLevel} />}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start md:self-center">
          <Button size="sm" variant="outline" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Hide details" : "Show details"}
          </Button>
          <Button size="sm" onClick={() => (window.location.href = `/attacks?targetX=${report.defender.x ?? ""}&targetY=${report.defender.y ?? ""}`)}>
            Plan attack
          </Button>
          <Button size="sm" variant="secondary" onClick={() => (window.location.href = `/attacks?mission=scout&targetX=${report.defender.x ?? ""}&targetY=${report.defender.y ?? ""}`)}>
            Send scouts
          </Button>
        </div>
      </div>
      <div className="text-xs text-muted-foreground mt-2">{report.actionSuggestion}</div>
      {expanded && (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <IntelSection title="Defending Troops">
            {renderTroopsSection(report)}
          </IntelSection>
          <IntelSection title="Resources">
            {renderEconomySection(report)}
          </IntelSection>
          <IntelSection title="Defenses & Buildings">
            {renderInfrastructureSection(report)}
          </IntelSection>
          <IntelSection title="Mission Summary">
            {renderSummarySection(report)}
          </IntelSection>
        </div>
      )}
    </div>
  )
}

function IntelSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-lg p-3 bg-card/40">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="mt-2 text-sm space-y-2">{children}</div>
    </div>
  )
}

function renderSummarySection(report: ScoutIntelReport) {
  const s = report.payload?.summary
  if (!s) return <p>No mission summary data.</p>
  const fidelity = report.payload?.summary.fidelity
  return (
    <>
      <div className="flex items-center justify-between"><span>Outcome</span><span>{report.reliability === "failed" ? "Failed" : fidelity === "exact" ? "Full intelligence" : "Partial intelligence"}</span></div>
      <div className="flex items-center justify-between"><span>Scouts sent</span><span>{s.attackersSent}</span></div>
      <div className="flex items-center justify-between"><span>Scouts survived</span><span>{s.attackersSurvived}</span></div>
      <div className="flex items-center justify-between"><span>Enemy scouts lost</span><span>{s.defenderLosses}</span></div>
      {report.payload?.notes && <p className="text-xs text-yellow-600">{report.payload.notes}</p>}
    </>
  )
}

function renderTroopsSection(report: ScoutIntelReport) {
  const fidelity = report.payload?.summary.fidelity
  if (report.reliability === "failed" || fidelity === "none") {
    const s = report.payload?.summary
    return <p>Scouts were defeated. Losses: {s?.attackerLosses ?? "?"}. No intel returned.</p>
  }
  const garrison = report.payload?.garrison
  const reinf = report.payload?.reinforcements
  const items: React.ReactNode[] = []
  if (garrison?.units?.length) {
    items.push(
      <div key="own">
        <p className="font-medium">Village garrison</p>
        <div className="grid grid-cols-2 gap-1 mt-1">
          {garrison.units.map((u) => (
            <div key={String(u.type)} className="flex items-center justify-between">
              <span>{formatUnitType(String(u.type))}</span>
              <span className="font-medium">{u.quantity.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>,
    )
  } else if (garrison?.classes?.length) {
    items.push(
      <div key="own-classes">
        <p className="font-medium">Village garrison (by class)</p>
        <div className="grid grid-cols-2 gap-1 mt-1">
          {garrison.classes.map((c) => (
            <div key={c.class} className="flex items-center justify-between">
              <span className="capitalize">{c.class}</span>
              <span className="font-medium">{formatBandOrCount(c.count, (c as any).band)}</span>
            </div>
          ))}
        </div>
      </div>,
    )
  }
  if (reinf?.entries?.length) {
    if (report.reliability === "full" && fidelity === "exact") {
      items.push(
        <div key="sup">
          <p className="font-medium">Supporting troops</p>
          <div className="space-y-1 mt-1">
            {reinf.entries.map((e) => (
              <div key={e.ownerId} className="flex items-center justify-between">
                <span>{e.ownerName}</span>
                <span className="text-muted-foreground">{e.total.toLocaleString()} units</span>
              </div>
            ))}
          </div>
        </div>,
      )
    } else {
      const totalSupporters = reinf.entries.length
      const totalUnits = reinf.entries.reduce((sum, e) => sum + e.total, 0)
      items.push(
        <div key="sup-agg">
          <p className="font-medium">Supporting troops</p>
          <p className="text-muted-foreground">{totalSupporters} supporters, {totalUnits.toLocaleString()} units (names hidden)</p>
        </div>,
      )
    }
  }
  return items.length ? <>{items}</> : <p>No troop information returned.</p>
}

function renderEconomySection(report: ScoutIntelReport) {
  const stocks = report.payload?.economy?.stocks
  if (!stocks) return <p>No resource information available.</p>
  const keys: Array<keyof typeof stocks> = Object.keys(stocks) as any
  const rows = keys
    .filter((k) => stocks[k])
    .map((k) => {
      const entry = stocks[k]!
      return (
        <div key={k as string} className="flex items-center justify-between">
          <span className="capitalize">{k}</span>
          <span>{typeof entry.amount === "number" ? entry.amount.toLocaleString() : formatBand(entry.band)}</span>
        </div>
      )
    })
  return <div className="space-y-1">{rows}</div>
}

function renderInfrastructureSection(report: ScoutIntelReport) {
  const wall = report.payload?.defenses?.wall
  const wt = report.payload?.defenses?.watchtower
  const infra = report.payload?.infrastructure?.buildings
  const blocks: React.ReactNode[] = []
  if (wall) {
    blocks.push(
      <div key="wall" className="flex items-center justify-between">
        <span>Wall</span>
        <span>{typeof wall.level === "number" ? `Lv ${wall.level}` : wall.band ? formatBand(wall.band) : "—"}</span>
      </div>,
    )
  }
  if (wt) {
    blocks.push(
      <div key="wt" className="flex items-center justify-between">
        <span>Watchtower</span>
        <span>{typeof wt.level === "number" ? `Lv ${wt.level}` : wt.band ? formatBand(wt.band) : "—"}</span>
      </div>,
    )
  }
  if (infra?.length) {
    blocks.push(
      <div key="infra" className="mt-1">
        <p className="font-medium">Buildings</p>
        <div className="grid grid-cols-2 gap-1 mt-1">
          {infra.map((b, idx) => (
            <div key={`${String(b.type)}-${idx}`} className="flex items-center justify-between">
              <span>{formatBuildingType(String(b.type))}</span>
              <span>{typeof (b as any).level === "number" ? `Lv ${(b as any).level}` : (b as any).band ? formatBand((b as any).band) : "—"}</span>
            </div>
          ))}
        </div>
      </div>,
    )
  }
  return blocks.length ? <>{blocks}</> : <p>No defensive or building intel.</p>
}

function formatBand(band?: { min: number; max?: number | null }) {
  if (!band) return "—"
  const max = band.max ?? band.min
  return `${band.min}–${max}`
}

function formatBandOrCount(count: number, band?: { min: number; max?: number | null }) {
  return band ? formatBand(band) : count.toLocaleString()
}

function formatUnitType(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ")
}

function formatBuildingType(type: string) {
  return type
    .toLowerCase()
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ")
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const sec = Math.floor(diff / 1000)
  const min = Math.floor(sec / 60)
  const hr = Math.floor(min / 60)
  const day = Math.floor(hr / 24)
  if (day > 0) return `${day} day${day === 1 ? "" : "s"} ago`
  if (hr > 0) return `${hr} hour${hr === 1 ? "" : "s"} ago`
  if (min > 0) return `${min} minute${min === 1 ? "" : "s"} ago`
  return `just now`
}

function timeUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff <= 0) return "expired"
  const sec = Math.floor(diff / 1000)
  const min = Math.floor(sec / 60)
  const hr = Math.floor(min / 60)
  const day = Math.floor(hr / 24)
  if (day > 0) return `${day} day${day === 1 ? "" : "s"}`
  if (hr > 0) return `${hr} hour${hr === 1 ? "" : "s"}`
  if (min > 0) return `${min} minute${min === 1 ? "" : "s"}`
  return `${sec} sec`
}

function Delta({ value }: { value: number }) {
  const positive = value > 0
  const label = `${positive ? "+" : ""}${value.toLocaleString()}`
  return <span className={`ml-2 ${positive ? "text-green-600" : value < 0 ? "text-destructive" : "text-muted-foreground"}`}>{label}</span>
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-border rounded-lg p-3 bg-card/40">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-base font-semibold mt-1">{typeof value === "number" ? value.toLocaleString() : value}</p>
    </div>
  )
}

function formatRate(v?: number) {
  if (v == null) return "—"
  return `${Math.round(v * 100)}%`
}

function FolderTree({
  overview,
  activeSystem,
  onSelectSystem,
  activeCustomId,
  onSelectCustom,
}: {
  overview: {
    system: Array<{ id: string; name: string; count: number; key?: SystemFolderKey }>
    custom: Array<{ id: string; name: string; count: number }>
    tags: Array<{ id: string; label: string; count: number; color?: string | null }>
  } | null
  activeSystem: SystemFolderKey | null
  onSelectSystem: (key: SystemFolderKey) => void
  activeCustomId: string | null
  onSelectCustom: (id: string) => void
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Folders</p>
        <div className="space-y-1">
          {(overview?.system ?? []).map((f) => (
            <button
              key={f.id}
              className={`w-full text-left text-sm px-2 py-1 rounded hover:bg-muted ${activeSystem === f.key ? "bg-muted" : ""}`}
              onClick={() => f.key && onSelectSystem(f.key)}
            >
              <span>{f.name}</span>
              <span className="float-right text-xs text-muted-foreground">{f.count}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Custom</p>
        <div className="space-y-1">
          {(overview?.custom ?? []).map((f) => (
            <button
              key={f.id}
              className={`w-full text-left text-sm px-2 py-1 rounded hover:bg-muted ${activeCustomId === f.id ? "bg-muted" : ""}`}
              onClick={() => onSelectCustom(f.id)}
            >
              <span>{f.name}</span>
              <span className="float-right text-xs text-muted-foreground">{f.count}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Tags</p>
        <div className="flex flex-wrap gap-1">
          {(overview?.tags ?? []).map((t) => (
            <span key={t.id} className="text-xs border border-border rounded px-1.5 py-0.5">
              {t.label} <span className="text-muted-foreground">{t.count}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function BulkBar({ selected, onAction }: { selected: Record<string, boolean>; onAction: (action: string) => Promise<void> }) {
  const count = Object.values(selected).filter(Boolean).length
  if (count === 0) return null
  return (
    <div className="flex items-center justify-between border border-border rounded-lg p-2 bg-card/40">
      <span className="text-sm">Selected: {count}</span>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => onAction("star")}>Star</Button>
        <Button size="sm" variant="outline" onClick={() => onAction("unstar")}>Unstar</Button>
        <Button size="sm" variant="outline" onClick={() => onAction("archive")}>Archive</Button>
        <Button size="sm" variant="outline" onClick={() => onAction("unarchive")}>Unarchive</Button>
        <Button size="sm" onClick={() => onAction("mark_read")}>
          Mark read
        </Button>
      </div>
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

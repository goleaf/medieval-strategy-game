"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Share2,
  Users,
  Shield,
  Castle,
  Sparkles,
  Swords,
  Target,
  MailPlus,
  RefreshCw,
} from "lucide-react"

import type { CombatReportDetail } from "@/lib/reports/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { CONSTRUCTION_CONFIG } from "@/lib/config/construction"
import { Separator } from "@/components/ui/separator"

type PlayerResponse = {
  success: boolean
  data?: { player?: { id: string } }
}

type ReportResponse = {
  success: boolean
  data?: CombatReportDetail
  error?: string
}

const UNIT_ROLE_ICONS: Record<string, string> = {
  inf: "⚔️",
  cav: "🏇",
  scout: "👁️",
  ram: "🪵",
  catapult: "🎯",
  admin: "🎖️",
  settler: "🛖",
  hero: "🦸",
  unknown: "❔",
}

export default function CombatReportPage() {
  const params = useParams<{ reportId: string }>()
  const { toast } = useToast()
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [report, setReport] = useState<CombatReportDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPlayerId = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/player-data")
      const json: PlayerResponse = await response.json()
      if (json.success && json.data?.player?.id) {
        setPlayerId(json.data.player.id)
      } else {
        setPlayerId("temp-player-id")
      }
    } catch (err) {
      console.warn("Failed to fetch player info", err)
      setPlayerId("temp-player-id")
    }
  }, [])

  const fetchReport = useCallback(
    async (pid: string) => {
      if (!pid) return
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/reports/${params.reportId}?playerId=${pid}`)
        const json: ReportResponse = await response.json()
        if (!json.success || !json.data) {
          setError(json.error || "Unable to load combat report.")
          setReport(null)
          return
        }
        setReport(json.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load combat report.")
        setReport(null)
      } finally {
        setLoading(false)
      }
    },
    [params.reportId],
  )

  useEffect(() => {
    fetchPlayerId()
  }, [fetchPlayerId])

  useEffect(() => {
    if (playerId) {
      fetchReport(playerId)
    }
  }, [playerId, fetchReport])

  const handleShare = async () => {
    if (!report) return
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast({ title: "Link copied", description: "Share this URL with allies to review the report." })
    } catch {
      toast({ title: "Unable to copy", description: "Copy the address bar manually.", variant: "destructive" })
    }
  }

  const reviveAction = () => {
    toast({ title: "Planner shortcut ready", description: "Opening attack planner with target prefilled..." })
    window.location.href = `/attacks?targetX=${report?.defender.x ?? ""}&targetY=${report?.defender.y ?? ""}`
  }

  const wallEstimate = useMemo(() => estimateWallRepair(report?.context.wall), [report])

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border p-4">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading report...
            </div>
          </div>
        </header>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <header className="border-b border-border p-4">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link href="/reports">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <span className="text-red-500">{error ?? "Report unavailable"}</span>
            <div />
          </div>
        </header>
      </div>
    )
  }

  const supporterEntries = Object.values(report.context.defenderSupport ?? {})
  const primaryDefenderId = report.defender.playerId

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/reports">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4" />
              Reports
            </Button>
          </Link>
          <div className="text-center">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Combat Report</p>
            <h1 className="text-2xl font-bold">{report.subject}</h1>
            <p className="text-xs text-muted-foreground">{formatDate(report.createdAt)}</p>
          </div>
          <div className="flex gap-2">
            <Badge variant={report.direction === "sent" ? "default" : "secondary"}>{report.direction === "sent" ? "Sent" : "Received"}</Badge>
            <Badge variant="outline">{report.mission.toUpperCase()}</Badge>
          </div>
        </div>
      </header>

      <main className="w-full p-4">
        <div className="max-w-5xl mx-auto space-y-6">
          <Card>
            <CardHeader className="space-y-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Swords className="w-5 h-5 text-primary" />
                Battle Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <BattleParticipant heading="Attacker" info={report.attacker} role="offense" />
              <BattleParticipant heading="Defender" info={report.defender} role="defense" />
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Outcome</p>
                <div className="text-lg font-semibold">{describeOutcome(report.outcome)}</div>
                <p className="text-sm text-muted-foreground">
                  Luck {formatPercent(report.luck)} · Morale {formatPercent(report.morale)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Attacker losses: {report.losses.attacker.toLocaleString()} · Defender losses: {report.losses.defender.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Forces Deployed
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <ForceBreakdown title="Attacking Army" before={report.context.attackerBefore} after={report.context.attackerAfter} />
              <Separator />
              <ForceBreakdown title="Defending Army" before={report.context.defenderBefore} after={report.context.defenderAfter} />

              {supporterEntries.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Supporting Troops
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      {supporterEntries.map((supporter) => {
                        const isOwner = supporter.ownerAccountId === primaryDefenderId
                        return (
                          <div key={supporter.ownerAccountId} className="border border-border rounded-lg p-3 space-y-3 bg-card/40">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold">{supporter.ownerName ?? "Unknown commander"}</p>
                                <p className="text-xs text-muted-foreground">{isOwner ? "Village garrison" : "Reinforcement"}</p>
                              </div>
                              {supporter.tribeTag && <Badge variant="outline">{supporter.tribeTag}</Badge>}
                            </div>
                            <UnitTotals totals={supporter.totals} />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Castle className="w-5 h-5 text-primary" />
                Battle Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <DetailStat label="Wall status" value={formatWall(report.context.wall)} icon={<Shield className="w-4 h-4" />} />
                <DetailStat label="Loyalty" value={formatLoyalty(report.context.loyalty)} icon={<Sparkles className="w-4 h-4" />} />
                <DetailStat label="Active modifiers" value={describeModifiers(report.summary)} icon={<Target className="w-4 h-4" />} />
              </div>

              {report.context.catapult?.targets?.length ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Catapult Damage</p>
                  <div className="space-y-2">
                    {report.context.catapult.targets.map((target) => (
                      <div key={target.targetId} className="text-sm flex items-center justify-between border border-dashed border-border rounded px-3 py-2">
                        <div>
                          <p className="font-medium">{target.targetLabel}</p>
                          <p className="text-xs text-muted-foreground">{target.targetKind === "resource_field" ? "Resource field" : "Structure"}</p>
                        </div>
                        <div className="text-sm">
                          Level {target.beforeLevel} → {target.afterLevel} ({target.drop} drop)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No siege damage recorded.</p>
              )}

              <CombatBreakdown summary={report.summary} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-primary" />
                Aftermath
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-sm font-semibold">Plundered Resources</p>
                <ResourceTotals loot={report.context.loot} capacity={report.context.totalCarryCapacity} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold">Rebuild Estimate</p>
                {wallEstimate ? (
                  <div className="text-sm text-muted-foreground">
                    Wall repair (~{wallEstimate.timeHours.toFixed(1)}h) will cost roughly {formatResourceCost(wallEstimate.cost)}.
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No significant structural damage detected.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <Button variant="secondary" onClick={() => (window.location.href = `/messages?draft=forward-report&reportId=${report.id}`)}>
                Forward to tribe
              </Button>
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share link
              </Button>
              <Button variant="outline" onClick={() => (window.location.href = `/messages?draft=contact&playerId=${report.attacker.playerId ?? ""}`)}>
                <MailPlus className="w-4 h-4 mr-2" />
                Message
              </Button>
              <Button onClick={reviveAction}>Plan revenge attack</Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

function BattleParticipant({
  heading,
  info,
  role,
}: {
  heading: string
  info: CombatReportDetail["attacker"]
  role: "offense" | "defense"
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{heading}</p>
      <div className="text-lg font-semibold">{info.playerName ?? "Unknown"}</div>
      <p className="text-sm text-muted-foreground">{info.villageName ? `${info.villageName} (${info.x ?? "?"}|${info.y ?? "?"})` : "Unknown village"}</p>
      <Badge variant="outline">{role === "offense" ? "Attacker" : "Defender"}</Badge>
    </div>
  )
}

function ForceBreakdown({ title, before, after }: { title: string; before: Record<string, number>; after: Record<string, number> }) {
  const rows = useMemo(() => buildUnitRows(before, after), [before, after])
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No data recorded.</p>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Unit</th>
                <th className="text-right px-3 py-2 font-medium">Before</th>
                <th className="text-right px-3 py-2 font-medium">After</th>
                <th className="text-right px-3 py-2 font-medium">Lost</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.unitId} className="border-t border-border/40">
                  <td className="px-3 py-2 flex items-center gap-2">
                    <span>{row.icon}</span>
                    {row.label}
                  </td>
                  <td className="px-3 py-2 text-right">{row.before.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{row.after.toLocaleString()}</td>
                  <td className={`px-3 py-2 text-right ${row.losses > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                    {row.losses > 0 ? `-${row.losses.toLocaleString()}` : "0"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function UnitTotals({ totals }: { totals: Record<string, number> }) {
  const rows = buildUnitRows(totals, {})
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">0 stationed troops.</p>
  }
  return (
    <div className="space-y-1 text-sm">
      {rows.map((row) => (
        <div key={row.unitId} className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span>{row.icon}</span>
            {row.label}
          </span>
          <span className="font-medium">{row.before.toLocaleString()}</span>
        </div>
      ))}
    </div>
  )
}

function DetailStat({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="border border-border rounded-lg p-3 bg-card/40">
      <p className="text-xs uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </p>
      <p className="text-base font-semibold mt-1">{value}</p>
    </div>
  )
}

function CombatBreakdown({ summary }: { summary: CombatReportDetail["summary"] }) {
  if (!summary?.battleReport) {
    return <p className="text-sm text-muted-foreground">Detailed combat math unavailable.</p>
  }
  const { battleReport } = summary
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="border border-border rounded-lg p-3 space-y-1 bg-card/30">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Attack progression</p>
        <StatRow label="Base" value={formatNumber(battleReport.attackBreakdown.base)} />
        <StatRow label="After bonuses" value={formatNumber(battleReport.attackBreakdown.postBonuses)} />
        <StatRow label="After morale" value={formatNumber(battleReport.attackBreakdown.postMorale)} />
        <StatRow label="Final strength" value={formatNumber(battleReport.attackBreakdown.final)} highlight />
      </div>
      <div className="border border-border rounded-lg p-3 space-y-1 bg-card/30">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Defense progression</p>
        <StatRow label="Weighted" value={formatNumber(battleReport.defenseBreakdown.weighted)} />
        <StatRow label="After wall" value={formatNumber(battleReport.defenseBreakdown.postWall)} />
        <StatRow label="After night" value={formatNumber(battleReport.defenseBreakdown.postNight)} />
        <StatRow label="Final strength" value={formatNumber(battleReport.defenseBreakdown.final)} highlight />
      </div>
    </div>
  )
}

function StatRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={highlight ? "font-semibold" : ""}>{value}</span>
    </div>
  )
}

function ResourceTotals({ loot, capacity }: { loot?: Record<string, number> | null; capacity: number }) {
  if (!loot) {
    return <p className="text-sm text-muted-foreground">Loot data unavailable for this report.</p>
  }
  const resources = ["wood", "clay", "iron", "crop"]
  const total = resources.reduce((sum, resource) => sum + (loot[resource] ?? 0), 0)
  return (
    <div className="space-y-1 text-sm">
      {resources.map((resource) => (
        <div key={resource} className="flex items-center justify-between">
          <span className="capitalize">{resource}</span>
          <span>{(loot[resource] ?? 0).toLocaleString()}</span>
        </div>
      ))}
      <Separator />
      <div className="flex items-center justify-between font-semibold">
        <span>Total</span>
        <span>
          {total.toLocaleString()} / {capacity.toLocaleString()} carry
        </span>
      </div>
    </div>
  )
}

function buildUnitRows(before: Record<string, number>, after: Record<string, number>) {
  const ids = new Set([...Object.keys(before), ...Object.keys(after)])
  return Array.from(ids).map((unitId) => {
    const beforeCount = before[unitId] ?? 0
    const afterCount = after[unitId] ?? 0
    const losses = beforeCount - afterCount
    return {
      unitId,
      label: formatUnitLabel(unitId),
      icon: UNIT_ROLE_ICONS[resolveRole(unitId)],
      before: beforeCount,
      after: afterCount,
      losses,
    }
  })
}

function resolveRole(unitId: string): string {
  if (unitId.includes("ram")) return "ram"
  if (unitId.includes("catapult")) return "catapult"
  if (unitId.includes("scout")) return "scout"
  if (unitId.includes("admin")) return "admin"
  if (unitId.includes("cav") || unitId.includes("horse")) return "cav"
  return unitId.includes("settler") ? "settler" : "inf"
}

function formatUnitLabel(unitId: string): string {
  return unitId
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

function describeOutcome(outcome: CombatReportDetail["outcome"]) {
  switch (outcome) {
    case "attacker_victory":
      return "Attacker Victory"
    case "defender_victory":
      return "Defender Victory"
    case "mutual_loss":
      return "Mutual Destruction"
    default:
      return "Undecided"
  }
}

function formatPercent(value?: number | null) {
  if (value == null) return "—"
  return `${Math.round(value * 100)}%`
}

function formatWall(wall?: { before: number | null; after: number | null; drop: number | null; type?: string }) {
  if (!wall) return "Unknown"
  if (wall.before == null && wall.after == null) return "Unknown"
  return `${wall.before ?? "?"} → ${wall.after ?? "?"} (${wall.drop ?? 0} drop)`
}

function formatLoyalty(loyalty?: { before?: number | null; after?: number | null }) {
  if (!loyalty) return "Unknown"
  if (loyalty.before == null && loyalty.after == null) return "Unknown"
  return `${loyalty.before ?? "?"} → ${loyalty.after ?? "?"}`
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "—"
  if (Math.abs(value) > 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
  return value.toFixed(0)
}

function describeModifiers(summary: CombatReportDetail["summary"]) {
  if (!summary?.battleReport) return "Standard rules"
  const modifiers: string[] = []
  const { multipliers } = summary.battleReport
  if (multipliers.wall && multipliers.wall !== 1) modifiers.push(`Wall x${multipliers.wall.toFixed(2)}`)
  if (multipliers.night && multipliers.night !== 1) modifiers.push(`Night x${multipliers.night.toFixed(2)}`)
  if (multipliers.morale && multipliers.morale !== 1) modifiers.push(`Morale x${multipliers.morale.toFixed(2)}`)
  if (multipliers.attackerBonuses && multipliers.attackerBonuses !== 1) modifiers.push(`Attacker buffs x${multipliers.attackerBonuses.toFixed(2)}`)
  if (multipliers.defenderBonuses && multipliers.defenderBonuses !== 1) modifiers.push(`Defender buffs x${multipliers.defenderBonuses.toFixed(2)}`)
  return modifiers.length ? modifiers.join(" · ") : "No modifiers"
}

function estimateWallRepair(wall?: { before: number | null; after: number | null; drop: number | null }) {
  if (!wall?.drop || !wall.before) return null
  const blueprint = CONSTRUCTION_CONFIG.buildingBlueprints.wall
  if (!blueprint) return null
  let cost = { wood: 0, clay: 0, iron: 0, crop: 0 }
  let timeSeconds = 0
  const start = wall.after ?? Math.max(0, wall.before - wall.drop)
  for (let level = start + 1; level <= wall.before; level += 1) {
    const definition = blueprint.levels.find((entry) => entry.level === level)
    if (!definition) continue
    cost = {
      wood: cost.wood + definition.cost.wood,
      clay: cost.clay + definition.cost.clay,
      iron: cost.iron + definition.cost.iron,
      crop: cost.crop + definition.cost.crop,
    }
    timeSeconds += definition.buildTimeSeconds
  }
  return { cost, timeHours: timeSeconds / 3600 }
}

function formatResourceCost(cost: { wood: number; clay: number; iron: number; crop: number }) {
  return `${cost.wood.toLocaleString()}w / ${cost.clay.toLocaleString()}c / ${cost.iron.toLocaleString()}i / ${cost.crop.toLocaleString()}f`
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  AlertTriangle,
  ChevronDown,
  Clock,
  Eye,
  Globe,
  Hammer,
  Info,
  LayoutPanelLeft,
  LayoutPanelRight,
  Loader2,
  LogOut,
  Map as MapIcon,
  MapPin,
  MessageCircle,
  Settings,
  Shield,
  ShoppingCart,
  Sparkles,
  Swords,
  Trophy,
  Users,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { useAuth } from "@/hooks/use-auth"
import { ResourceDisplay, type ResourceLedgerSnapshot } from "@/components/game/resource-display"
import { BuildingQueue } from "@/components/game/building-queue"
import { VillageOverview } from "@/components/game/village-overview"
import { NotificationBell } from "@/components/game/notification-bell"
import { NotificationAlerts } from "@/components/game/notification-alerts"
import { NotificationCenter } from "@/components/game/notifications"
import { cn } from "@/lib/utils"
import { ProtectionStatus } from "@/components/game/protection-status"
import { ProtectionInfobox } from "@/components/game/protection-infobox"
import { AdvisorHints } from "@/components/advisor/AdvisorHints"
import { useNotificationFeed } from "@/hooks/use-notifications"
import type { NotificationController } from "@/types/notifications"
// Types inferred from API responses
type VillageWithRelations = {
  id: string
  name: string
  x: number
  y: number
  wood: number
  stone: number
  iron: number
  gold: number
  food: number
  woodProduction: number
  stoneProduction: number
  ironProduction: number
  goldProduction: number
  foodProduction: number
  population: number
  loyalty: number
  buildings: Array<{
    id: string
    type: string
    level: number
    isBuilding: boolean
    completionAt: string | null
    queuePosition: number | null
    research?: { isResearching: boolean } | null
  }>
  buildQueueTasks: Array<{
    id: string
    buildingId: string | null
    entityKey: string
    fromLevel: number
    toLevel: number
    status: string
    position: number
    startedAt: string | null
    finishesAt: string | null
  }>
  troops: Array<{
    id: string
    type: string
    quantity: number
    attack: number
    defense: number
    speed: number
  }>
  resourceLedgers: ResourceLedgerSnapshot[]
  tribeTag?: string | null
  tribeName?: string | null
  // Protection decorators from API
  isProtected?: boolean
  protectionHoursRemaining?: number | null
}

type ActivityItem = {
  id: string
  label: string
  description?: string
  timestamp?: string | null
  type: "BUILDING" | "TROOP" | "ATTACK" | "MESSAGE" | "SYSTEM"
  href?: string
}

type CoreResourceKey = "WOOD" | "CLAY" | "IRON"

type ResourceSummary = {
  key: CoreResourceKey
  label: string
  icon: string
  amount: number
  perHour: number
}

const CORE_RESOURCES: Record<CoreResourceKey, { label: string; icon: string }> = {
  WOOD: { label: "Wood", icon: "🪵" },
  CLAY: { label: "Clay", icon: "🧱" },
  IRON: { label: "Iron", icon: "⛓" },
}

const RESOURCE_ACCENTS: Record<CoreResourceKey, string> = {
  WOOD: "from-[#2a1b0d] via-[#1a1007] to-[#36230f] border-emerald-600/60",
  CLAY: "from-[#30160f] via-[#1c0b07] to-[#3a1d14] border-orange-600/60",
  IRON: "from-[#1b1c21] via-[#0f0f13] to-[#2b2e35] border-slate-500/60",
}

const ACTIVITY_ACCENTS: Record<
  ActivityItem["type"],
  { border: string; bg: string; text: string; icon: string; badge?: string }
> = {
  BUILDING: {
    border: "border-amber-600/70",
    bg: "bg-amber-950/40",
    text: "text-amber-100",
    icon: "🛠️",
    badge: "text-amber-300",
  },
  TROOP: {
    border: "border-emerald-600/70",
    bg: "bg-emerald-950/30",
    text: "text-emerald-100",
    icon: "🛡️",
    badge: "text-emerald-300",
  },
  ATTACK: {
    border: "border-red-600/70",
    bg: "bg-red-950/30",
    text: "text-red-100",
    icon: "⚔️",
    badge: "text-red-300",
  },
  MESSAGE: {
    border: "border-cyan-600/70",
    bg: "bg-cyan-950/30",
    text: "text-cyan-100",
    icon: "📜",
    badge: "text-cyan-300",
  },
  SYSTEM: {
    border: "border-slate-600/70",
    bg: "bg-slate-950/40",
    text: "text-slate-100",
    icon: "🔔",
    badge: "text-slate-300",
  },
}

const VIEW_TABS = [
  { id: "village", label: "Village View" },
  { id: "map", label: "Strategic Map" },
  { id: "reports", label: "Reports" },
  { id: "messages", label: "Messages" },
  { id: "rankings", label: "Rankings" },
  { id: "tribe", label: "Tribe" },
] as const

type ViewTabId = (typeof VIEW_TABS)[number]["id"]

const REPORT_TABS = [
  { id: "latest", label: "Latest" },
  { id: "battle", label: "Battle" },
  { id: "economy", label: "Economy" },
  { id: "diplomacy", label: "Diplomacy" },
] as const

type ReportTabId = (typeof REPORT_TABS)[number]["id"]

const PANEL_BASE_CLASS =
  "rounded-2xl border border-amber-900/50 bg-gradient-to-br from-[#1b1309] via-[#120903] to-[#2c1c0d] shadow-[0_12px_30px_rgba(0,0,0,0.55)]"
const PANEL_ACCENT_CLASS = "border-amber-600/60 shadow-[0_0_24px_rgba(234,179,8,0.3)]"
const SECTION_HEADING_CLASS = "text-xs font-semibold uppercase tracking-[0.25em] text-amber-300/80"
const SURFACE_GRADIENT = "bg-[radial-gradient(circle_at_top,_rgba(77,36,6,0.25),_transparent_60%)]"

const MAX_FEED_ITEMS = 10
const WORLD_LIMIT = 999
const NUMBER_FORMAT = new Intl.NumberFormat()

function getTribeAccent(seed?: string | null) {
  if (!seed) return "hsl(32 65% 55%)"
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue} 65% 55%)`
}

function legacyResourceLedgers(village: VillageWithRelations): ResourceLedgerSnapshot[] {
  const timestamp = new Date().toISOString()
  return [
    {
      resourceType: "WOOD",
      currentAmount: village.wood,
      productionPerHour: village.woodProduction,
      netProductionPerHour: village.woodProduction,
      storageCapacity: 0,
      lastTickAt: timestamp,
    },
    {
      resourceType: "CLAY",
      currentAmount: village.stone,
      productionPerHour: village.stoneProduction,
      netProductionPerHour: village.stoneProduction,
      storageCapacity: 0,
      lastTickAt: timestamp,
    },
    {
      resourceType: "IRON",
      currentAmount: village.iron,
      productionPerHour: village.ironProduction,
      netProductionPerHour: village.ironProduction,
      storageCapacity: 0,
      lastTickAt: timestamp,
    },
  ]
}

function calculatePopulationCapacity(village: VillageWithRelations): number {
  const farmBuilding = village.buildings.find((b) => b.type === "FARM")
  const farmLevel = farmBuilding?.level ?? 0
  return farmLevel * 240 + 240
}

function calculateResourceSummaries(ledgers: ResourceLedgerSnapshot[], now: number): ResourceSummary[] {
  const ledgerMap = new Map<string, ResourceLedgerSnapshot>()
  ledgers.forEach((ledger) => ledgerMap.set(ledger.resourceType, ledger))

  return (Object.keys(CORE_RESOURCES) as CoreResourceKey[]).map((key) => {
    const ledger = ledgerMap.get(key)
    if (!ledger) {
      return {
        key,
        label: CORE_RESOURCES[key].label,
        icon: CORE_RESOURCES[key].icon,
        amount: 0,
        perHour: 0,
      }
    }
    const elapsedSeconds = Math.max(0, (now - new Date(ledger.lastTickAt).getTime()) / 1000)
    const projected = ledger.currentAmount + (ledger.netProductionPerHour * elapsedSeconds) / 3600
    return {
      key,
      label: CORE_RESOURCES[key].label,
      icon: CORE_RESOURCES[key].icon,
      amount: Math.max(0, projected),
      perHour: ledger.netProductionPerHour,
    }
  })
}

function buildActivityFeed(village: VillageWithRelations): ActivityItem[] {
  const events: ActivityItem[] = []

  village.buildQueueTasks.forEach((task) => {
    events.push({
      id: `build-${task.id}`,
      label: `${task.entityKey.replace(/_/g, " ")} → Lv${task.toLevel}`,
      description: task.status === "COMPLETED" ? "Construction complete" : "Upgrading",
      timestamp: task.finishesAt || task.startedAt,
      type: "BUILDING",
      href: `/village/${village.id}/buildings`,
    })
  })

  if (village.troops.length > 0) {
    const totalTroops = village.troops.reduce((sum, troop) => sum + troop.quantity, 0)
    events.push({
      id: `troops-${village.id}`,
      label: "Garrison readiness",
      description: `${NUMBER_FORMAT.format(totalTroops)} troops stationed`,
      timestamp: new Date().toISOString(),
      type: "TROOP",
      href: `/village/${village.id}/troops`,
    })
  }

  events.sort((a, b) => {
    const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0
    const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0
    return bTime - aTime
  })

  if (events.length === 0) {
    events.push({
      id: "placeholder",
      label: "Scouts report no major events",
      description: "All is calm in the village.",
      timestamp: new Date().toISOString(),
      type: "SYSTEM",
    })
  }

  return events.slice(0, MAX_FEED_ITEMS)
}

function formatActivityTimestamp(value?: string | null): string {
  if (!value) return "—"
  try {
    const date = new Date(value)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } catch {
    return value
  }
}

function clampCoordinate(value: number) {
  if (Number.isNaN(value)) return 0
  return Math.min(Math.max(value, 0), WORLD_LIMIT)
}

export default function Dashboard() {
  const router = useRouter()
  const [villages, setVillages] = useState<VillageWithRelations[]>([])
  const [selectedVillageId, setSelectedVillageId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeView, setActiveView] = useState<ViewTabId>("village")
  const [reportTab, setReportTab] = useState<ReportTabId>("latest")
  const [mobileLeftOpen, setMobileLeftOpen] = useState(false)
  const [mobileRightOpen, setMobileRightOpen] = useState(false)
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true)
  const [serverTime, setServerTime] = useState(() => new Date())
  const [resourceTicker, setResourceTicker] = useState(() => Date.now())
  const prefersReducedMotion = usePrefersReducedMotion()
  const { auth, initialized, clearAuth } = useAuth({ redirectOnMissing: true, redirectTo: "/login" })
  const notificationController = useNotificationFeed(auth?.playerId ?? null)
  const online = useOnlineStatus()
  const viewStorageKey = auth ? `dashboard:view:${auth.playerId}` : null

  const fetchVillages = useCallback(async () => {
    if (!auth) return
    try {
      setLoading(true)
      const res = await fetch(`/api/villages?playerId=${auth.playerId}`, {
        headers: { "Authorization": `Bearer ${auth.token}` },
      })
      const data = await res.json()
      if (data.success && data.data) {
        setVillages(data.data)
        setSelectedVillageId((prev) => {
          if (!data.data.length) return null
          if (!prev) return data.data[0].id
          return data.data.some((v: VillageWithRelations) => v.id === prev) ? prev : data.data[0].id
        })
      } else {
        setVillages([])
        setSelectedVillageId(null)
      }
    } catch (error) {
      console.error("Failed to fetch villages:", error)
      setVillages([])
    } finally {
      setLoading(false)
    }
  }, [auth])

  const handleLogout = useCallback(async () => {
    try {
      if (auth?.token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { "Authorization": `Bearer ${auth.token}` },
        })
      }
    } catch (error) {
      console.error("Logout API call failed:", error)
    }
    clearAuth()
    router.push("/login")
  }, [auth, clearAuth, router])

  useEffect(() => {
    if (!auth) return
    fetchVillages()
    const interval = setInterval(fetchVillages, 30000)
    if (typeof window !== "undefined") {
      (window as any).__dashboardFetchHandler = fetchVillages
      ;(window as any).__dashboardSetSelectedVillage = (id: string | null) => setSelectedVillageId(id)
      ;(window as any).__dashboardLogoutHandler = handleLogout
    }
    return () => {
      clearInterval(interval)
      if (typeof window !== "undefined") {
        delete (window as any).__dashboardFetchHandler
        delete (window as any).__dashboardSetSelectedVillage
        delete (window as any).__dashboardLogoutHandler
      }
    }
  }, [auth, fetchVillages, handleLogout])

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).Alpine) {
      const alpineElement = document.querySelector("[x-data]")
      if (alpineElement && (alpineElement as any)._x_dataStack) {
        const alpineData = (alpineElement as any)._x_dataStack[0]
        if (alpineData && alpineData.selectedVillageId !== selectedVillageId) {
          alpineData.selectedVillageId = selectedVillageId || ""
        }
        if (alpineData && alpineData.loading !== loading) {
          alpineData.loading = loading
        }
        if (alpineData && alpineData.villagesCount !== villages.length) {
          alpineData.villagesCount = villages.length
        }
      }
    }
  }, [selectedVillageId, loading, villages.length])

  useEffect(() => {
    const timer = setInterval(() => {
      setServerTime(new Date())
      setResourceTicker(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!viewStorageKey || typeof window === "undefined") return
    const stored = window.localStorage.getItem(viewStorageKey) as ViewTabId | null
    if (stored && VIEW_TABS.some((tab) => tab.id === stored)) {
      setActiveView(stored)
    }
  }, [viewStorageKey])

  useEffect(() => {
    if (!viewStorageKey || typeof window === "undefined") return
    window.localStorage.setItem(viewStorageKey, activeView)
  }, [activeView, viewStorageKey])

  if (!initialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        Loading dashboard...
      </div>
    )
  }

  if (!auth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        Redirecting to login...
      </div>
    )
  }

  const currentVillage =
    villages.find((village) => village.id === selectedVillageId) ?? (villages.length > 0 ? villages[0] : null)

  const ledgersToShow = useMemo(() => {
    if (!currentVillage) return []
    if (currentVillage.resourceLedgers && currentVillage.resourceLedgers.length > 0) {
      return currentVillage.resourceLedgers
    }
    return legacyResourceLedgers(currentVillage)
  }, [currentVillage])

  const resourceSummaries = useMemo(() => {
    if (!currentVillage) return []
    return calculateResourceSummaries(ledgersToShow, resourceTicker)
  }, [currentVillage, ledgersToShow, resourceTicker])

  const activityFeed = useMemo(() => (currentVillage ? buildActivityFeed(currentVillage) : []), [currentVillage])
  const populationCapacity = currentVillage ? calculatePopulationCapacity(currentVillage) : 0
  const premiumPoints = currentVillage?.gold ?? 0
  const premiumActive = premiumPoints > 0
  const coordinate = currentVillage ? { x: currentVillage.x, y: currentVillage.y } : null
  const worldSpeed = Number(process.env.NEXT_PUBLIC_WORLD_SPEED || 1)
  const hasVillages = villages.length > 0
  const activeResearchCount =
    currentVillage?.buildings.filter((building) => building.research?.isResearching).length ?? 0
  const panelClass = useMemo(
    () =>
      `${PANEL_BASE_CLASS} ${
        prefersReducedMotion ? "" : "transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-500/70"
      }`,
    [prefersReducedMotion],
  )
  const staticPanelClass = PANEL_BASE_CLASS
  const tribeAccentColor = getTribeAccent(currentVillage?.tribeTag ?? currentVillage?.id ?? null)

  return (
    <div
      x-data={`{
        selectedVillageId: '${selectedVillageId || ""}',
        loading: ${loading},
        villagesCount: ${villages.length},
        handleChange() {
          if (window.__dashboardSetSelectedVillage) {
            window.__dashboardSetSelectedVillage(this.selectedVillageId);
          }
        },
        async handleLogout() {
          if (window.__dashboardLogoutHandler) {
            await window.__dashboardLogoutHandler();
          }
        }
      }`}
      className={`flex min-h-screen flex-col bg-[#060301] text-amber-50 ${SURFACE_GRADIENT}`}
    >
      <TopNavigationBar
        villages={villages}
        selectedVillageId={selectedVillageId}
        onVillageChange={(value) => setSelectedVillageId(value)}
        currentVillage={currentVillage}
        resourceSummaries={resourceSummaries}
        population={currentVillage?.population ?? 0}
        populationCapacity={populationCapacity}
        premiumPoints={premiumPoints}
        premiumActive={premiumActive}
        onLogout={handleLogout}
        onOpenLeftPanel={() => setMobileLeftOpen(true)}
        onOpenRightPanel={() => setMobileRightOpen(true)}
        onToggleRightPanel={() => setIsRightSidebarOpen((prev) => !prev)}
        isRightSidebarOpen={isRightSidebarOpen}
        notificationController={notificationController}
        prefersReducedMotion={prefersReducedMotion}
        tribeAccentColor={tribeAccentColor}
      />
      {/* Live alerts for critical/high notifications */}
      {notificationController && <NotificationAlerts controller={notificationController} />}

      <div className="flex flex-1 overflow-hidden bg-gradient-to-b from-[#140a03] via-[#0c0501] to-[#1d1006]">
        <aside className="hidden w-full max-w-sm border-r border-amber-900/40 lg:flex">
          {currentVillage ? (
            <LeftSidebarPanel
              village={currentVillage}
              activityFeed={activityFeed}
              onNavigate={() => undefined}
              onMapNavigate={() => {
                router.push(`/world-map?x=${currentVillage.x}&y=${currentVillage.y}`)
              }}
              prefersReducedMotion={prefersReducedMotion}
              tribeAccentColor={tribeAccentColor}
            />
          ) : (
            <div className="flex w-full items-center justify-center p-6 text-sm text-muted-foreground">
              Select or create a village to see its overview.
            </div>
          )}
        </aside>

        <section className="flex flex-1 flex-col overflow-hidden">
          <div className="flex h-full flex-col overflow-hidden px-4 py-6">
            {loading && (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading your realm...
              </div>
            )}

            {!loading && !hasVillages && (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                <p className="text-lg font-semibold">Setting up your kingdom...</p>
                <p className="text-sm text-muted-foreground">Your first village is being created.</p>
              </div>
            )}

            {!loading && hasVillages && currentVillage && (
              <Tabs value={activeView} onValueChange={(value) => setActiveView(value as ViewTabId)} className="flex h-full flex-col">
                <div className="flex flex-col gap-3">
                  <TabsList className="flex-wrap bg-[rgba(119,65,14,0.15)]">
                    {VIEW_TABS.map((tab) => (
                      <TabsTrigger key={tab.id} value={tab.id}>
                        {tab.label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>Loyalty {currentVillage.loyalty}%</span>
                    <span>
                      Coordinates {currentVillage.x}|{currentVillage.y}
                    </span>
                    <Badge variant="secondary">Village HQ</Badge>
                    {currentVillage.isProtected && (
                      <Badge variant="outline" className="border-green-600/60 text-green-400">Protected</Badge>
                    )}
                    {!isRightSidebarOpen && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="hidden lg:inline-flex"
                        onClick={() => setIsRightSidebarOpen(true)}
                      >
                        Show intel panel
                      </Button>
                    )}
                  </div>
                </div>

                <TabsContent value="village" className="flex-1 overflow-y-auto pt-4">
                  <div className="space-y-4 pb-6">
                    {/* Advisor coachmarks on first visit */}
                    <AdvisorHints scope="dashboard" enabled={Boolean(currentVillage?.isProtected)} />
                    {/* Beginner protection status and guidance */}
                    {auth?.playerId && (
                      <section className={`${panelClass} p-4`}>
                        <div className="grid gap-4 md:grid-cols-2">
                          <ProtectionStatus playerId={auth.playerId} />
                          <div>
                            <ProtectionInfobox playerId={auth.playerId} />
                            <div className="mt-3 text-xs text-muted-foreground">
                              New to the game? Visit the Beginner Quests to learn core mechanics and earn rewards.
                              <br />
                              <Link href="/tutorial" className="text-primary underline">Open Beginner Quests</Link>
                            </div>
                          </div>
                        </div>
                      </section>
                    )}
                    {notificationController && (
                      <section className={`${panelClass} p-4`}>
                        <NotificationCenter controller={notificationController} />
                      </section>
                    )}
                    <section className={`${panelClass} p-4`}>
                      <h3 className={`${SECTION_HEADING_CLASS} mb-3`}>
                        Resources
                      </h3>
                      <ResourceDisplay ledgers={ledgersToShow} showCrop={false} />
                    </section>

                    <section className={`${panelClass} p-4`}>
                      <BuildingQueue
                        tasks={currentVillage.buildQueueTasks}
                        activeResearchCount={activeResearchCount}
                        villageId={currentVillage.id}
                        onCancel={async (buildingId) => {
                          try {
                            const res = await fetch("/api/buildings/cancel", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${auth.token}`,
                              },
                              body: JSON.stringify({ buildingId }),
                            })
                            const data = await res.json()
                            if (data.success) {
                              await fetchVillages()
                            } else {
                              alert(data.error || "Failed to cancel building")
                            }
                          } catch (error) {
                            console.error("Failed to cancel building:", error)
                            alert("Failed to cancel building")
                          }
                        }}
                        onInstantComplete={async () => {
                          await fetchVillages()
                        }}
                      />
                    </section>

                    <section className={`${panelClass} p-4`}>
                      <VillageOverview
                        village={currentVillage}
                        onUpgrade={async (buildingId) => {
                          try {
                            const res = await fetch("/api/buildings/upgrade", {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${auth.token}`,
                              },
                              body: JSON.stringify({ buildingId }),
                            })
                            const data = await res.json()
                            if (data.success) {
                              await fetchVillages()
                            }
                          } catch (error) {
                            console.error("Failed to upgrade building:", error)
                          }
                        }}
                      />
                    </section>

                    <section className="grid gap-2 sm:grid-cols-3">
                      <Link href={`/village/${currentVillage.id}`} className="flex">
                        <Button variant="outline" className="w-full">
                          <Eye className="h-4 w-4" />
                          View Details
                        </Button>
                      </Link>
                      <Link href={`/village/${currentVillage.id}/buildings`} className="flex">
                        <Button variant="outline" className="w-full">
                          <Hammer className="h-4 w-4" />
                          Buildings
                        </Button>
                      </Link>
                      <Link href={`/village/${currentVillage.id}/troops`} className="flex">
                        <Button variant="outline" className="w-full">
                          <Shield className="h-4 w-4" />
                          Troops
                        </Button>
                      </Link>
                    </section>
                  </div>
                </TabsContent>

                <TabsContent value="map" className="flex-1 overflow-y-auto pt-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <MapMiniMap
                      coordinate={{ x: currentVillage.x, y: currentVillage.y }}
                      onNavigate={() => router.push(`/world-map?x=${currentVillage.x}&y=${currentVillage.y}`)}
                      size="large"
                      accentColor={tribeAccentColor}
                      prefersReducedMotion={prefersReducedMotion}
                    />
                    <div className={`${panelClass} space-y-3 p-4`}>
                      <h3 className="text-base font-semibold">Strategic overview</h3>
                      <p className="text-sm text-muted-foreground">
                        Track your current province, switch between tactical, province, or world scopes, and jump to tribe
                        members or bookmarked targets instantly.
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Link href="/map">
                          <Button className="w-full">
                            <MapIcon className="h-4 w-4" />
                            Tactical Map
                          </Button>
                        </Link>
                        <Link href="/world-map">
                          <Button variant="outline" className="w-full">
                            <Globe className="h-4 w-4" />
                            World Explorer
                          </Button>
                        </Link>
                      </div>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li>• Use arrow keys to pan the province view.</li>
                        <li>• Scroll or pinch to zoom between tactical and world layers.</li>
                        <li>• Right-click for contextual actions (reinforce, scout, attack).</li>
                      </ul>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="reports" className="flex-1 overflow-y-auto pt-4">
                  <div className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {REPORT_TABS.map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setReportTab(tab.id)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-sm transition",
                            reportTab === tab.id ? "border-primary bg-primary/10 text-primary" : "border-border"
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                      <Link href="/reports" className="ml-auto">
                        <Button size="sm" variant="outline">
                          View All
                        </Button>
                      </Link>
                    </div>
                    <div className={`${panelClass} p-4`}>
                      <h3 className="mb-2 text-base font-semibold capitalize">{reportTab} reports</h3>
                      <p className="text-sm text-muted-foreground">
                        Reports remember the last tab you opened so you can keep multiple dossiers handy without losing
                        context.
                      </p>
                      <ul className="mt-4 space-y-3 text-sm">
                        {activityFeed.slice(0, 4).map((event) => (
                          <li key={event.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                            <div>
                              <p className="font-medium">{event.label}</p>
                              {event.description && (
                                <p className="text-xs text-muted-foreground">{event.description}</p>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatActivityTimestamp(event.timestamp)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="messages" className="flex-1 overflow-y-auto pt-4">
                  <div className={`${panelClass} space-y-4 p-4`}>
                    <h3 className="text-base font-semibold">Command communications</h3>
                    <p className="text-sm text-muted-foreground">
                      Quickly switch between tribe chat, diplomacy threads, and system updates. Long-press on touch
                      devices to open context menus.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Link href="/messages">
                        <Button className="w-full">
                          <MessageCircle className="h-4 w-4" />
                          Inbox
                        </Button>
                      </Link>
                      <Link href="/messages?tab=tribe">
                        <Button variant="outline" className="w-full">
                          <Users className="h-4 w-4" />
                          Tribe
                        </Button>
                      </Link>
                      <Link href="/messages?tab=system">
                        <Button variant="outline" className="w-full">
                          <Sparkles className="h-4 w-4" />
                          System
                        </Button>
                      </Link>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="rankings" className="flex-1 overflow-y-auto pt-4">
                    <div className={`${panelClass} p-4`}>
                      <h3 className="text-base font-semibold">World standings</h3>
                      <p className="text-sm text-muted-foreground">
                        Compare your tribe&apos;s progress, monitor war fronts, and bookmark rivals for quick diplomacy or
                        retaliation.
                      </p>
                    <div className="mt-4 flex flex-wrap gap-3 text-sm">
                      <Badge variant="secondary">Villages controlled: {villages.length}</Badge>
                      <Badge variant="outline">{currentVillage.troops.length} troop types trained</Badge>
                      <Badge variant="outline">Population {currentVillage.population}</Badge>
                    </div>
                    <Link href="/leaderboard" className="mt-4 inline-flex">
                      <Button>
                        <Trophy className="h-4 w-4" />
                        Open leaderboard
                      </Button>
                    </Link>
                  </div>
                </TabsContent>

                <TabsContent value="tribe" className="flex-1 overflow-y-auto pt-4">
                  <div className={`${panelClass} p-4`}>
                    <h3 className="text-base font-semibold">Tribal operations</h3>
                    <p className="text-sm text-muted-foreground">
                      Coordinate recruitment, issue circulars, and review shared targets. Swipe between tabs on tablet or
                      use keyboard shortcuts on desktop.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2 text-sm">
                      <Badge variant="secondary">Members online: 3</Badge>
                      <Badge variant="outline">Shared ops: 2</Badge>
                      <Badge variant="outline">Support tickets open: 1</Badge>
                    </div>
                    <Link href="/tribes" className="mt-4 inline-flex">
                      <Button variant="outline">
                        <Users className="h-4 w-4" />
                        Manage tribe
                      </Button>
                    </Link>
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </section>

        {isRightSidebarOpen && currentVillage && (
          <aside className="hidden w-full max-w-sm border-l border-border lg:flex">
          <RightSidebarPanel
            village={currentVillage}
            premiumPoints={premiumPoints}
            premiumActive={premiumActive}
            activeView={activeView}
            onCollapse={() => setIsRightSidebarOpen(false)}
            prefersReducedMotion={prefersReducedMotion}
            tribeAccentColor={tribeAccentColor}
          />
          </aside>
        )}
      </div>

      <BottomStatusBar
        serverTime={serverTime}
        worldSpeed={worldSpeed}
        coordinate={coordinate}
        online={online}
      />

      {mobileLeftOpen && currentVillage && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileLeftOpen(false)} />
          <div className="fixed inset-y-0 left-0 z-50 w-80 max-w-full overflow-y-auto bg-background shadow-2xl lg:hidden">
            <LeftSidebarPanel
              village={currentVillage}
              activityFeed={activityFeed}
              onMapNavigate={() => {
                setMobileLeftOpen(false)
                router.push(`/world-map?x=${currentVillage.x}&y=${currentVillage.y}`)
              }}
              onNavigate={() => setMobileLeftOpen(false)}
              onClose={() => setMobileLeftOpen(false)}
              prefersReducedMotion={prefersReducedMotion}
              tribeAccentColor={tribeAccentColor}
            />
          </div>
        </>
      )}

      {mobileRightOpen && currentVillage && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={() => setMobileRightOpen(false)} />
          <div className="fixed inset-y-0 right-0 z-50 w-80 max-w-full overflow-y-auto bg-background shadow-2xl lg:hidden">
          <RightSidebarPanel
            village={currentVillage}
            premiumPoints={premiumPoints}
            premiumActive={premiumActive}
            activeView={activeView}
            onClose={() => setMobileRightOpen(false)}
            prefersReducedMotion={prefersReducedMotion}
            tribeAccentColor={tribeAccentColor}
          />
          </div>
        </>
      )}
    </div>
  )
}

interface TopNavigationBarProps {
  villages: VillageWithRelations[]
  selectedVillageId: string | null
  onVillageChange: (value: string) => void
  currentVillage: VillageWithRelations | null
  resourceSummaries: ResourceSummary[]
  population: number
  populationCapacity: number
  premiumPoints: number
  premiumActive: boolean
  onLogout: () => void
  onOpenLeftPanel: () => void
  onOpenRightPanel: () => void
  onToggleRightPanel: () => void
  isRightSidebarOpen: boolean
  notificationController: NotificationController | null
  prefersReducedMotion: boolean
  tribeAccentColor: string
}

function TopNavigationBar({
  villages,
  selectedVillageId,
  onVillageChange,
  currentVillage,
  resourceSummaries,
  population,
  populationCapacity,
  premiumPoints,
  premiumActive,
  onLogout,
  onOpenLeftPanel,
  onOpenRightPanel,
  onToggleRightPanel,
  isRightSidebarOpen,
  notificationController,
  prefersReducedMotion,
  tribeAccentColor,
}: TopNavigationBarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const populationRatio = populationCapacity > 0 ? population / populationCapacity : 0
  const populationColor =
    populationRatio > 0.95 ? "text-red-500" : populationRatio > 0.8 ? "text-amber-500" : "text-emerald-500"
  const interactiveControlClass = prefersReducedMotion
    ? ""
    : "transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber-500/10"

  return (
    <header
      className="sticky top-0 z-30 border-b border-amber-900/40 bg-gradient-to-r from-[#1d1209]/95 via-[#120803]/95 to-[#1a0d09]/95 backdrop-blur"
      style={{ boxShadow: `0 10px 40px rgba(0,0,0,0.45)` }}
    >
      <div className="flex flex-col gap-4 p-4 text-amber-100">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className={cn(
                "text-2xl font-serif tracking-wide text-amber-100 drop-shadow",
                !prefersReducedMotion && "transition-transform duration-300 hover:-translate-y-0.5",
              )}
            >
              🏰 <span className="hidden sm:inline">Medieval Strategy</span>
            </Link>
            <span className="hidden text-sm text-amber-200/80 sm:inline">
              {currentVillage ? `${currentVillage.name} (${currentVillage.x}|${currentVillage.y})` : "No village selected"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/tutorial">
              <Button size="sm" variant="outline" title="Beginner help">Help</Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className={cn("lg:hidden text-amber-200", interactiveControlClass)}
              onClick={onOpenLeftPanel}
              aria-label="Open village panel"
            >
              <LayoutPanelLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("hidden lg:inline-flex text-amber-200", interactiveControlClass)}
              onClick={onToggleRightPanel}
              aria-label="Toggle intel panel"
            >
              <LayoutPanelRight className={cn("h-4 w-4", !isRightSidebarOpen && "text-muted-foreground")} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn("lg:hidden text-amber-200", interactiveControlClass)}
              onClick={onOpenRightPanel}
              aria-label="Open intel panel"
            >
              <LayoutPanelRight className="h-4 w-4" />
            </Button>
            <NotificationBell controller={notificationController} />
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen((prev) => !prev)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm",
                  interactiveControlClass,
                )}
                style={{ borderColor: tribeAccentColor }}
              >
                Commander
                <ChevronDown className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-lg border border-amber-900/60 bg-[#1a0f08] shadow-2xl">
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-amber-100 hover:bg-amber-500/10"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      onLogout()
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-secondary"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="village-select" className="text-xs uppercase tracking-[0.2em] text-amber-300/80">
                Village
              </label>
              <select
                id="village-select"
                value={selectedVillageId ?? ""}
                onChange={(event) => onVillageChange(event.target.value)}
                className={cn(
                  "rounded-md border bg-[#140a05] px-3 py-1.5 text-sm text-amber-100 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40",
                  !prefersReducedMotion && "transition-colors duration-200",
                )}
                style={{ borderColor: tribeAccentColor }}
                disabled={villages.length === 0}
              >
                {villages.map((village) => (
                  <option key={village.id} value={village.id}>
                    {village.name} ({village.x}|{village.y})
                  </option>
                ))}
              </select>
            </div>
            <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-200">
              {villages.length} {villages.length === 1 ? "village" : "villages"}
            </Badge>
          </div>

          <div className="flex flex-1 flex-wrap items-center gap-3">
            {resourceSummaries.map((resource) => (
              <div
                key={resource.key}
                className={cn(
                  "min-w-[140px] rounded-xl border bg-gradient-to-br px-3 py-2 text-xs shadow-lg",
                  RESOURCE_ACCENTS[resource.key],
                  prefersReducedMotion ? "" : "transition-all duration-300 hover:-translate-y-0.5",
                )}
              >
                <p className="flex items-center gap-2 font-semibold">
                  <span>{resource.icon}</span>
                  {resource.label}
                </p>
                <p className="font-mono text-sm">
                  {NUMBER_FORMAT.format(Math.floor(resource.amount))}{" "}
                  <span className="text-muted-foreground">(+{Math.round(resource.perHour)}/h)</span>
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-amber-300/80">Population</p>
              <p className={populationColor}>
                {NUMBER_FORMAT.format(population)} / {NUMBER_FORMAT.format(populationCapacity)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-amber-300/80">Premium</p>
              <div className="flex items-center gap-1 text-amber-100">
                <Sparkles className={cn("h-4 w-4", premiumActive ? "text-amber-300" : "text-muted-foreground")} />
                <span>{premiumActive ? "Active" : "Inactive"}</span>
                <Badge
                  variant="outline"
                  className="border-amber-500/70 text-amber-200"
                  style={{ borderColor: premiumActive ? "#f59e0b" : "#55321a" }}
                >
                  {premiumPoints} pts
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

interface LeftSidebarPanelProps {
  village: VillageWithRelations
  activityFeed: ActivityItem[]
  onNavigate?: () => void
  onMapNavigate: () => void
  onClose?: () => void
  prefersReducedMotion: boolean
  tribeAccentColor: string
}

function LeftSidebarPanel({
  village,
  activityFeed,
  onNavigate,
  onMapNavigate,
  onClose,
  prefersReducedMotion,
  tribeAccentColor,
}: LeftSidebarPanelProps) {
  const buildingQueueCount = village.buildQueueTasks.length
  const nextTask = [...village.buildQueueTasks].sort((a, b) => {
    const aTime = a.finishesAt ? new Date(a.finishesAt).getTime() : Number.POSITIVE_INFINITY
    const bTime = b.finishesAt ? new Date(b.finishesAt).getTime() : Number.POSITIVE_INFINITY
    return aTime - bTime
  })[0]
  const trainingTasks = village.buildQueueTasks.filter((task) => task.entityKey.toLowerCase().includes("train"))
  const incomingAttacks = village.buildQueueTasks.filter((task) => task.entityKey.toLowerCase().includes("attack"))
  const queueProgress =
    nextTask?.startedAt && nextTask?.finishesAt
      ? Math.min(
          100,
          Math.max(
            0,
            ((Date.now() - new Date(nextTask.startedAt).getTime()) /
              (new Date(nextTask.finishesAt).getTime() - new Date(nextTask.startedAt).getTime())) *
              100,
          ),
        )
      : null
  const panelShell = `${PANEL_BASE_CLASS} ${
    prefersReducedMotion ? "" : "transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-500/70"
  }`
  const tribeBorderStyle = { borderColor: tribeAccentColor }

  const shortcuts = [
    {
      label: "Build",
      href: `/village/${village.id}/buildings`,
      description: "Upgrade structures",
      icon: <Hammer className="h-4 w-4" />,
    },
    {
      label: "Recruit",
      href: `/village/${village.id}/troops`,
      description: "Train forces",
      icon: <Shield className="h-4 w-4" />,
    },
    {
      label: "Attack",
      href: `/attacks?villageId=${village.id}`,
      description: "Launch assaults",
      icon: <Swords className="h-4 w-4" />,
    },
    {
      label: "Market",
      href: `/market?villageId=${village.id}`,
      description: "Trade resources",
      icon: <ShoppingCart className="h-4 w-4" />,
    },
    {
      label: "Reports",
      href: "/reports",
      description: "Review intel",
      icon: <MessageCircle className="h-4 w-4" />,
    },
  ]

  return (
    <div className="flex h-full w-full flex-col gap-4 p-4">
      {onClose && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      )}

      <section className={`${panelShell} p-4`}>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-base font-semibold text-amber-100">Village overview</p>
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-100">
            {buildingQueueCount} builds
          </Badge>
        </div>
        <ul className="space-y-2 text-sm text-amber-200/80">
          <li className="flex justify-between">
            <span>Building queue</span>
            <span className="font-semibold text-amber-100">
              {buildingQueueCount > 0 ? `${buildingQueueCount} active` : "Idle"}
            </span>
          </li>
          <li className="flex justify-between">
            <span>Troop training</span>
            <span className="font-semibold text-amber-100">
              {trainingTasks.length > 0 ? `${trainingTasks.length} queues` : "Idle"}
            </span>
          </li>
          <li className="flex items-center justify-between">
            <span>Incoming attacks</span>
            <span className={incomingAttacks.length > 0 ? "text-red-400 font-semibold" : "text-emerald-300 font-semibold"}>
              {incomingAttacks.length > 0 ? `${incomingAttacks.length} spotted` : "Borders calm"}
            </span>
          </li>
        </ul>
        {nextTask && (
          <div className="mt-3">
            <p className="text-xs uppercase tracking-[0.25em] text-amber-300/80">Next completion</p>
            <p className="text-sm text-amber-100">{nextTask.entityKey.replace(/_/g, " ")}</p>
            {queueProgress !== null && Number.isFinite(queueProgress) && (
              <div className="mt-2 h-2 rounded-full bg-[#281307]">
                <div
                  className="h-full rounded-full bg-amber-500 transition-[width]"
                  style={{ width: `${queueProgress}%` }}
                />
              </div>
            )}
          </div>
        )}
      </section>

      <section className={`${panelShell} p-4`}>
        <h3 className={`${SECTION_HEADING_CLASS} mb-3`}>Action shortcuts</h3>
        <div className="grid gap-2">
          {shortcuts.map((shortcut) => (
            <Link
              key={shortcut.label}
              href={shortcut.href}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-[#120803]/70 px-3 py-2 text-sm text-amber-100",
                !prefersReducedMotion && "transition-all duration-200 hover:-translate-y-0.5",
              )}
              style={tribeBorderStyle}
              onClick={onNavigate}
            >
              <span className="text-primary">{shortcut.icon}</span>
              <div className="flex flex-col">
                <span className="font-medium text-amber-100">{shortcut.label}</span>
                <span className="text-xs text-amber-200/80">{shortcut.description}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className={`${panelShell} p-4`}>
        <h3 className={`${SECTION_HEADING_CLASS} mb-3`}>Map minimap</h3>
        <MapMiniMap
          coordinate={{ x: village.x, y: village.y }}
          accentColor={tribeAccentColor}
          prefersReducedMotion={prefersReducedMotion}
          onNavigate={() => {
            onNavigate?.()
            onMapNavigate()
          }}
        />
      </section>

      <section className={`${panelShell} flex-1 p-4`}>
        <h3 className={`${SECTION_HEADING_CLASS} mb-3`}>Recent activity</h3>
        <ActivityFeedList activityFeed={activityFeed} prefersReducedMotion={prefersReducedMotion} />
      </section>
    </div>
  )
}

interface RightSidebarPanelProps {
  village: VillageWithRelations
  premiumPoints: number
  premiumActive: boolean
  activeView: ViewTabId
  onCollapse?: () => void
  onClose?: () => void
  prefersReducedMotion: boolean
  tribeAccentColor: string
}

function RightSidebarPanel({
  village,
  premiumPoints,
  premiumActive,
  activeView,
  onCollapse,
  onClose,
: RightSidebarPanelProps) {
  const sortedBuildings = [...village.buildings].sort((a, b) => a.type.localeCompare(b.type)).slice(0, 12)
  const researching = village.buildings.filter((building) => building.research?.isResearching)
  const tips = [
    "Use keyboard shortcuts (Q, B, M) on desktop.",
    "Pin critical reports to keep them in the tab list.",
    `Last visited tab: ${activeView}.`,
  ]
  const news = [
    "World wonder foundations discovered in K44.",
    "Two major conquests reported on the eastern front.",
    `${village.name} achieved 100% production efficiency.`,
  ]
  const panelShell = `${PANEL_BASE_CLASS} ${
    prefersReducedMotion ? "" : "transition-all duration-300 hover:-translate-y-0.5 hover:border-amber-500/70"
  }`

  return (
    <div className="flex h-full w-full flex-col gap-4 p-4 text-amber-50">
      <div className="flex items-center justify-between text-sm font-semibold text-amber-200">
        <span>Intel panel</span>
        <div className="flex items-center gap-2">
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
          {onCollapse && (
            <Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={onCollapse}>
              <LayoutPanelRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <section className={`${panelShell} p-4`}>
        <h3 className={`${SECTION_HEADING_CLASS} mb-2`}>Village detail</h3>
        <ul className="max-h-40 space-y-1 overflow-y-auto text-sm text-amber-100">
          {sortedBuildings.map((building) => (
            <li key={building.id} className="flex items-center justify-between">
              <span>{building.type.replace(/_/g, " ")}</span>
              <Badge variant="outline" className="border-amber-500/60 text-amber-200">
                Lv {building.level}
              </Badge>
            </li>
          ))}
        </ul>
      </section>

      <section className={`${panelShell} p-4`}>
        <h3 className={`${SECTION_HEADING_CLASS} mb-2`}>Stationed troops</h3>
        {village.troops.length === 0 ? (
          <p className="text-sm text-amber-200/70">No troops garrisoned.</p>
        ) : (
          <ul className="space-y-1 text-sm text-amber-100">
            {village.troops.map((troop) => (
              <li key={troop.id} className="flex items-center justify-between">
                <span>{troop.type}</span>
                <span className="font-medium">{NUMBER_FORMAT.format(troop.quantity)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${panelShell} p-4`}>
        <h3 className={`${SECTION_HEADING_CLASS} mb-2`}>Research</h3>
        {researching.length === 0 ? (
          <p className="text-sm text-amber-200/70">No active research.</p>
        ) : (
          <ul className="space-y-1 text-sm text-amber-100">
            {researching.map((building) => (
              <li key={building.id}>{building.type.replace(/_/g, " ")} researching...</li>
            ))}
          </ul>
        )}
      </section>

      <section className={`${panelShell} p-4`}>
        <h3 className={`${SECTION_HEADING_CLASS} mb-2 flex items-center gap-2`}>
          <Info className="h-4 w-4" />
          Tips & tutorials
        </h3>
        <ul className="space-y-1 text-sm text-amber-200/80">
          {tips.map((tip) => (
            <li key={tip}>• {tip}</li>
          ))}
        </ul>
      </section>

      <section className={`${panelShell} p-4`}>
        <h3 className={`${SECTION_HEADING_CLASS} mb-2 flex items-center gap-2`}>
          <Globe className="h-4 w-4" />
          World news
        </h3>
        <ul className="space-y-1 text-sm text-amber-200/80">
          {news.map((entry) => (
            <li key={entry}>• {entry}</li>
          ))}
        </ul>
      </section>

      <section className={`${panelShell} p-4`}>
        <h3 className={`${SECTION_HEADING_CLASS} mb-2 flex items-center gap-2`}>
          <Sparkles className="h-4 w-4 text-amber-400" />
          Premium offers
        </h3>
        <p className="text-sm text-amber-100">
          {premiumActive
            ? `Premium active with ${premiumPoints} points available for instant completions or queue boosts.`
            : "Activate premium to unlock build queue automation, quick marching, and instant reports."}
        </p>
      </section>
    </div>
  )
}

interface MapMiniMapProps {
  coordinate: { x: number; y: number }
  onNavigate?: () => void
  size?: "compact" | "large"
  accentColor?: string
  prefersReducedMotion?: boolean
}

function MapMiniMap({ coordinate, onNavigate, size = "compact", accentColor, prefersReducedMotion }: MapMiniMapProps) {
  const normalizedX = (clampCoordinate(coordinate.x) / WORLD_LIMIT) * 100
  const normalizedY = (clampCoordinate(coordinate.y) / WORLD_LIMIT) * 100
  const accent = accentColor ?? "hsl(32 70% 55%)"

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onNavigate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onNavigate?.()
        }
      }}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border bg-gradient-to-br from-[#050301] via-[#0a0502] to-[#1a0e06] text-white shadow-inner",
        size === "large" ? "h-72" : "h-48",
        prefersReducedMotion ? "" : "transition-all duration-300 hover:-translate-y-1 hover:shadow-amber-500/20",
      )}
      style={{ borderColor: accent }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px,rgba(255,255,255,0.08),transparent_45%)] bg-[length:24px_24px]" />
      <div className="relative z-10 flex h-full flex-col justify-between p-4 text-xs uppercase tracking-wide">
        <div className="flex items-center justify-between text-amber-200/70">
          <span>Current position</span>
          <span>
            {coordinate.x}|{coordinate.y}
          </span>
        </div>
        <div className="relative flex flex-1 items-center justify-center">
          <span
            className={cn("absolute text-xl", prefersReducedMotion ? "" : "animate-pulse")}
            style={{ left: `${normalizedX}%`, top: `${normalizedY}%`, transform: "translate(-50%, -50%)" }}
          >
            <MapPin className="h-5 w-5 drop-shadow" style={{ color: accent }} />
          </span>
        </div>
        <div className="flex items-center justify-between text-xs text-amber-200/70">
          <span>Tap to open full map</span>
          <MapIcon className="h-4 w-4" />
        </div>
      </div>
    </div>
  )
}

interface ActivityFeedListProps {
  activityFeed: ActivityItem[]
  prefersReducedMotion: boolean
}

function ActivityFeedList({ activityFeed, prefersReducedMotion }: ActivityFeedListProps) {
  return (
    <ul className="space-y-2 text-sm">
      {activityFeed.map((activity) => (
        <li
          key={activity.id}
          className={cn(
            "rounded-xl border px-3 py-3",
            ACTIVITY_ACCENTS[activity.type]?.border ?? "border-amber-900/60",
            ACTIVITY_ACCENTS[activity.type]?.bg ?? "bg-[#140a05]/60",
            prefersReducedMotion ? "" : "transition-all duration-200 hover:-translate-y-0.5",
          )}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{ACTIVITY_ACCENTS[activity.type]?.icon ?? "•"}</span>
              <p className={cn("font-medium", ACTIVITY_ACCENTS[activity.type]?.text)}>{activity.label}</p>
            </div>
            <span className="text-xs text-amber-200/80">{formatActivityTimestamp(activity.timestamp)}</span>
          </div>
          {activity.description && (
            <p className={cn("text-xs", ACTIVITY_ACCENTS[activity.type]?.badge ?? "text-amber-200/80")}>
              {activity.description}
            </p>
          )}
        </li>
      ))}
    </ul>
  )
}

interface BottomStatusBarProps {
  serverTime: Date
  worldSpeed: number
  coordinate: { x: number; y: number } | null
  online: boolean
}

function BottomStatusBar({ serverTime, worldSpeed, coordinate, online }: BottomStatusBarProps) {
  return (
    <footer className="border-t border-amber-900/40 bg-[#0b0503]/90 px-4 py-2 text-xs text-amber-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          Server time: {serverTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </span>
        <span className="flex items-center gap-1">
          <Zap className="h-4 w-4" />
          World speed: {worldSpeed}x
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="h-4 w-4" />
          {coordinate ? `${coordinate.x}|${coordinate.y}` : "--|--"}
        </span>
        <span className="flex items-center gap-1">
          {online ? <Wifi className="h-4 w-4 text-emerald-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
          {online ? "Online" : "Offline"}
        </span>
      </div>
    </footer>
  )
}

function useOnlineStatus() {
  const [online, setOnline] = useState(() => {
    if (typeof navigator === "undefined") return true
    return navigator.onLine
  })

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return online
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches
  })

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    const handler = () => setPrefersReducedMotion(mediaQuery.matches)
    mediaQuery.addEventListener("change", handler)
    return () => mediaQuery.removeEventListener("change", handler)
  }, [])

  return prefersReducedMotion
}

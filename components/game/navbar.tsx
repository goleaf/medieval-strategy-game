"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { FeedbackForm } from "@/components/game/feedback-form"
import type { Village, Building } from "@prisma/client"
import { CentralVillageOverview } from "./central-village-overview"
import { SitterLogin } from "./sitter-login"
import { Edit3, KeySquare, Loader2, Lock, Save, X } from "lucide-react"

interface NavbarProps {
  villages: (Village & { buildings: Building[] })[]
  currentVillageId: string | null
  onVillageChange: (villageId: string) => void
  notificationCount?: number
  playerId: string
}

interface QuickLinkOptionPayload {
  id: string
  name: string
  description?: string | null
  icon?: string | null
  requiresPremium: boolean
  requiredBuildingType?: string | null
  requiredBuildingLevel?: number | null
}

interface QuickLinkAssignment {
  slotNumber: number
  quickLinkOptionId: string | null
  quickLinkOption?: QuickLinkOptionPayload | null
}

const PLAYER_SLOTS = 4
const VILLAGE_SLOTS = 5

function buildSlots(
  assignments: Array<{ slotNumber: number; quickLinkOptionId: string | null; quickLinkOption?: QuickLinkOptionPayload | null }>,
  totalSlots: number,
): QuickLinkAssignment[] {
  const slots: QuickLinkAssignment[] = []
  for (let slot = 1; slot <= totalSlots; slot++) {
    const found = assignments.find((assignment) => assignment.slotNumber === slot)
    slots.push({
      slotNumber: slot,
      quickLinkOptionId: found?.quickLinkOptionId ?? null,
      quickLinkOption: found?.quickLinkOption ?? null,
    })
  }
  return slots
}

export function Navbar({ villages, currentVillageId, onVillageChange, notificationCount = 0, playerId }: NavbarProps) {
  const [showCentralOverview, setShowCentralOverview] = useState(false)
  const [showSitterLogin, setShowSitterLogin] = useState(false)
  const [selectedVillageId, setSelectedVillageId] = useState(currentVillageId || villages[0]?.id || "")
  const [quicklinkOptions, setQuicklinkOptions] = useState<QuickLinkOptionPayload[]>([])
  const [playerQuicklinks, setPlayerQuicklinks] = useState<QuickLinkAssignment[]>(buildSlots([], PLAYER_SLOTS))
  const [villageQuicklinks, setVillageQuicklinks] = useState<QuickLinkAssignment[]>(buildSlots([], VILLAGE_SLOTS))
  const [playerDraft, setPlayerDraft] = useState<QuickLinkAssignment[]>(buildSlots([], PLAYER_SLOTS))
  const [villageDraft, setVillageDraft] = useState<QuickLinkAssignment[]>(buildSlots([], VILLAGE_SLOTS))
  const [quicklinkLoading, setQuicklinkLoading] = useState(false)
  const [quicklinkError, setQuicklinkError] = useState<string | null>(null)
  const [savingQuicklinks, setSavingQuicklinks] = useState(false)
  const [isEditingQuicklinks, setIsEditingQuicklinks] = useState(false)
  const [hasGoldClubMembership, setHasGoldClubMembership] = useState(false)

  const currentVillage =
    villages.find((v) => v.id === selectedVillageId) || villages.find((v) => v.id === currentVillageId) || villages[0]

  // Calculate farm capacity from FARM building level
  const farmBuilding = currentVillage?.buildings.find((b) => b.type === "FARM")
  const farmLevel = farmBuilding?.level || 0
  const farmCapacity = farmLevel * 240 + 240 // Base 240 + 240 per level
  const farmUsed = currentVillage?.population || 0

  // Calculate warehouse capacity from WAREHOUSE building level
  const warehouseBuilding = currentVillage?.buildings.find((b) => b.type === "WAREHOUSE")
  const warehouseLevel = warehouseBuilding?.level || 0
  const warehouseCapacity = warehouseLevel * 10000 + 10000 // Base 10000 + 10000 per level
  const warehouseUsed = (currentVillage?.wood || 0) + (currentVillage?.stone || 0) + (currentVillage?.iron || 0)

  useEffect(() => {
    if (currentVillageId) {
      setSelectedVillageId(currentVillageId)
    } else if (!selectedVillageId && villages.length > 0) {
      setSelectedVillageId(villages[0].id)
    }
  }, [currentVillageId, selectedVillageId, villages])

  const fetchQuicklinkOptions = useCallback(async () => {
    try {
      const res = await fetch("/api/quicklinks/options")
      if (!res.ok) {
        throw new Error("Failed to load quicklink options")
      }
      const json = await res.json()
      setQuicklinkOptions(json.data.options || [])
    } catch (error) {
      console.error("Quicklink options fetch failed:", error)
    }
  }, [])

  const fetchQuicklinks = useCallback(async () => {
    if (!playerId) return
    setQuicklinkLoading(true)
    setQuicklinkError(null)
    try {
      const params = new URLSearchParams({ playerId })
      if (selectedVillageId) {
        params.set("villageId", selectedVillageId)
      }
      const res = await fetch(`/api/quicklinks?${params.toString()}`)
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || "Failed to load quicklinks")
      }
      const serverPlayerQuicklinks = (json.data.playerQuicklinks || []).map((entry: any) => ({
        slotNumber: entry.slotNumber,
        quickLinkOptionId: entry.quickLinkOptionId,
        quickLinkOption: entry.quickLinkOption,
      }))
      const serverVillageQuicklinks = (json.data.villageQuicklinks || []).map((entry: any) => ({
        slotNumber: entry.slotNumber,
        quickLinkOptionId: entry.quickLinkOptionId,
        quickLinkOption: entry.quickLinkOption,
      }))
      setPlayerQuicklinks(buildSlots(serverPlayerQuicklinks, PLAYER_SLOTS))
      setVillageQuicklinks(buildSlots(serverVillageQuicklinks, VILLAGE_SLOTS))
      setHasGoldClubMembership(Boolean(json.data.membership?.hasGoldClubMembership))
    } catch (error) {
      setQuicklinkError(error instanceof Error ? error.message : "Failed to load quicklinks")
    } finally {
      setQuicklinkLoading(false)
    }
  }, [playerId, selectedVillageId])

  useEffect(() => {
    fetchQuicklinkOptions()
  }, [fetchQuicklinkOptions])

  useEffect(() => {
    fetchQuicklinks()
  }, [fetchQuicklinks])

  useEffect(() => {
    if (isEditingQuicklinks) {
      setPlayerDraft(playerQuicklinks.map((slot) => ({ ...slot })))
      setVillageDraft(villageQuicklinks.map((slot) => ({ ...slot })))
    }
  }, [isEditingQuicklinks, playerQuicklinks, villageQuicklinks])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "q" || event.metaKey || event.ctrlKey) return
      const target = event.target as HTMLElement
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return
      }
      event.preventDefault()
      setIsEditingQuicklinks((prev) => !prev)
    }

    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  const handleSlotChange = useCallback(
    (scope: "PLAYER" | "VILLAGE", slotNumber: number, optionId: string | null) => {
      const option = quicklinkOptions.find((opt) => opt.id === optionId) || null
      const update = (slot: QuickLinkAssignment) =>
        slot.slotNumber === slotNumber
          ? {
              slotNumber,
              quickLinkOptionId: optionId,
              quickLinkOption: option,
            }
          : slot

      if (scope === "PLAYER") {
        setPlayerDraft((prev) => prev.map(update))
      } else {
        setVillageDraft((prev) => prev.map(update))
      }
    },
    [quicklinkOptions],
  )

  const persistQuicklinks = useCallback(
    async (scope: "PLAYER" | "VILLAGE", slots: QuickLinkAssignment[]) => {
      if (!playerId) return
      if (scope === "VILLAGE" && !selectedVillageId) return

      const body: Record<string, unknown> = {
        playerId,
        scope,
        slots: slots.map((slot) => ({
          slotNumber: slot.slotNumber,
          quickLinkOptionId: slot.quickLinkOptionId,
        })),
      }

      if (scope === "VILLAGE") {
        body.villageId = selectedVillageId
      }

      const res = await fetch("/api/quicklinks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || "Failed to save quicklinks")
      }
    },
    [playerId, selectedVillageId],
  )

  const handleQuicklinkSave = useCallback(async () => {
    setSavingQuicklinks(true)
    setQuicklinkError(null)
    try {
      await persistQuicklinks("PLAYER", playerDraft)
      if (selectedVillageId) {
        await persistQuicklinks("VILLAGE", villageDraft)
      }
      setIsEditingQuicklinks(false)
      await fetchQuicklinks()
    } catch (error) {
      setQuicklinkError(error instanceof Error ? error.message : "Failed to save quick bar")
    } finally {
      setSavingQuicklinks(false)
    }
  }, [fetchQuicklinks, persistQuicklinks, playerDraft, selectedVillageId, villageDraft])

  const visiblePlayerSlots = isEditingQuicklinks ? playerDraft : playerQuicklinks
  const visibleVillageSlots = isEditingQuicklinks ? villageDraft : villageQuicklinks

  const renderQuicklinkSlot = (slot: QuickLinkAssignment, scope: "PLAYER" | "VILLAGE") => {
    if (isEditingQuicklinks) {
      return (
        <div key={`${scope}-${slot.slotNumber}`} className="flex flex-col text-xs gap-1 w-full md:w-auto">
          <span className="text-muted-foreground">Slot {slot.slotNumber}</span>
          <select
            value={slot.quickLinkOptionId ?? ""}
            onChange={(e) => handleSlotChange(scope, slot.slotNumber, e.target.value || null)}
            className="px-2 py-1 border border-border rounded bg-background text-foreground text-sm"
          >
            <option value="">Empty</option>
            {quicklinkOptions.map((option) => (
              <option key={option.id} value={option.id} disabled={option.requiresPremium && !hasGoldClubMembership}>
                {option.name}
                {option.requiresPremium ? " (Gold Club)" : ""}
              </option>
            ))}
          </select>
        </div>
      )
    }

    return (
      <div
        key={`${scope}-${slot.slotNumber}`}
        className={`px-2 py-1 border rounded text-sm flex items-center gap-1 ${
          slot.quickLinkOption ? "bg-secondary border-border" : "bg-muted text-muted-foreground border-dashed"
        }`}
      >
        <span>
          {slot.quickLinkOption?.icon?.trim() ||
            slot.quickLinkOption?.name ||
            `Slot ${slot.slotNumber}`}
        </span>
        {slot.quickLinkOption?.requiresPremium && !hasGoldClubMembership && (
          <Lock className="w-3 h-3 text-amber-500" />
        )}
      </div>
    )
  }

  const renderQuicklinkGroup = (label: string, slots: QuickLinkAssignment[], scope: "PLAYER" | "VILLAGE") => (
    <div className="space-y-1" key={`${scope}-group`}>
      <div className="flex items-center gap-2 text-xs uppercase text-muted-foreground">
        <span>{label}</span>
        {scope === "PLAYER" && (
          <span className="text-[10px] text-muted-foreground">(Slots 1-{PLAYER_SLOTS})</span>
        )}
        {scope === "VILLAGE" && (
          <span className="text-[10px] text-muted-foreground">(Slots 1-{VILLAGE_SLOTS})</span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {slots.map((slot) => renderQuicklinkSlot(slot, scope))}
      </div>
    </div>
  )

  return (
    <nav className="w-full border-b border-border bg-card">
      <div className="w-full p-2 space-y-2">
        {/* Village Switcher */}
        <div className="flex gap-2 w-full">
          <div className="flex-1">
            <label htmlFor="village-select" className="sr-only">Select Village</label>
            <select
              id="village-select"
              value={selectedVillageId}
              onChange={(e) => {
                setSelectedVillageId(e.target.value)
                onVillageChange(e.target.value)
              }}
              className="w-full p-2 border border-border rounded bg-background text-foreground"
            >
              {villages.map((village) => (
                <option key={village.id} value={village.id}>
                  {village.name} ({village.x}, {village.y})
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowCentralOverview(true)}
            className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm whitespace-nowrap"
            title="Central Village Overview"
          >
            📊
          </button>
        </div>
        
        {/* Resources Row */}
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="px-2 py-1 bg-secondary rounded">
            🪵 {currentVillage ? currentVillage.wood.toLocaleString() : 0}
          </span>
          <span className="px-2 py-1 bg-secondary rounded">
            🧱 {currentVillage ? currentVillage.stone.toLocaleString() : 0}
          </span>
          <span className="px-2 py-1 bg-secondary rounded">
            ⛓ {currentVillage ? currentVillage.iron.toLocaleString() : 0}
          </span>
          <span className="px-2 py-1 bg-secondary rounded">
            🪙 {currentVillage ? currentVillage.gold.toLocaleString() : 0}
          </span>
        </div>
        
        {/* Farm and Warehouse Row */}
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="px-2 py-1 bg-secondary rounded">
            👨‍🌾 {farmUsed}/{farmCapacity}
          </span>
          <span className="px-2 py-1 bg-secondary rounded">
            📦 {warehouseUsed.toLocaleString()}/{warehouseCapacity.toLocaleString()}
          </span>
        </div>

        {/* Quick Bar */}
        {playerId && (
          <div className="border border-border rounded p-2 bg-background space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase text-muted-foreground">
              <div className="flex items-center gap-2">
                <KeySquare className="w-3 h-3" />
                <span>Quick Bar</span>
                {!hasGoldClubMembership && (
                  <span className="flex items-center gap-1 text-[11px] text-amber-600">
                    <Lock className="w-3 h-3" />
                    Gold Club locks premium slots
                  </span>
                )}
                <span className="text-[11px] text-muted-foreground">Press Q to toggle edit</span>
              </div>
              <div className="flex items-center gap-2">
                {quicklinkLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                {isEditingQuicklinks ? (
                  <>
                    <button
                      onClick={handleQuicklinkSave}
                      disabled={savingQuicklinks}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-600 text-white text-xs hover:bg-green-700 disabled:opacity-60"
                    >
                      <Save className="w-3 h-3" />
                      {savingQuicklinks ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setIsEditingQuicklinks(false)}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border text-xs hover:bg-secondary"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditingQuicklinks(true)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded border border-border text-xs hover:bg-secondary"
                  >
                    <Edit3 className="w-3 h-3" />
                    Edit
                  </button>
                )}
              </div>
            </div>
            {quicklinkError && <p className="text-xs text-destructive">{quicklinkError}</p>}
            <div className="space-y-2">
              {renderQuicklinkGroup("Account", visiblePlayerSlots, "PLAYER")}
              {currentVillage && renderQuicklinkGroup(currentVillage.name, visibleVillageSlots, "VILLAGE")}
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setShowSitterLogin(true)}
            className="px-3 py-2 bg-secondary rounded border border-border hover:bg-accent transition"
            aria-label="Sitter Login"
          >
            👤 Sitter
          </button>
          <Link
            href="/sitters"
            className="px-3 py-2 bg-secondary rounded border border-border hover:bg-accent transition"
            aria-label="Account Management"
          >
            👥 Sitters
          </Link>
          <Link
            href="/settings"
            className="px-3 py-2 bg-secondary rounded border border-border hover:bg-accent transition"
            aria-label="Account Settings"
          >
            ⚙️ Settings
          </Link>
          <Link
            href="/reports"
            className="px-3 py-2 bg-secondary rounded border border-border hover:bg-accent transition"
            aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ""}`}
          >
            🔔 {notificationCount > 0 && <span className="font-bold">({notificationCount})</span>}
          </Link>
          <FeedbackForm />
        </div>
      </div>

      {/* Central Village Overview Modal */}
      {showCentralOverview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold">Central Village Overview</h2>
              <button
                onClick={() => setShowCentralOverview(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              <CentralVillageOverview
                playerId={playerId}
                onVillageSelect={(villageId) => {
                  onVillageChange(villageId)
                  setShowCentralOverview(false)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Sitter Login Modal */}
      {showSitterLogin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold">Sitter Login</h2>
              <button
                onClick={() => setShowSitterLogin(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <SitterLogin
                onLoginSuccess={() => setShowSitterLogin(false)}
              />
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

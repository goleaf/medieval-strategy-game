"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { TextTable } from "@/components/game/text-table"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { TRIBE_PERMISSION_VALUES, type TribePermissionValue } from "@/lib/tribes/permissions"

type TribeRoleType = "FOUNDER" | "CO_FOUNDER" | "OFFICER" | "MEMBER"

interface TribeSummary {
  id: string
  name: string
  tag: string
  description: string | null
  totalPoints: number
  memberCount: number
  leader: { playerName: string }
}

interface TribeMember {
  id: string
  playerName: string
  totalPoints: number
  villagesUsed: number
  rank: number
  lastActiveAt: string
  tribeRole: TribeRoleType | null
  tribeJoinedAt: string | null
}

interface TribeInvite {
  id: string
  status: string
  message: string | null
  expiresAt: string
  player: {
    id: string
    playerName: string
    totalPoints: number
    rank: number
  }
  invitedBy: {
    id: string
    playerName: string
  } | null
}

interface TribeApplicationItem {
  id: string
  message: string | null
  createdAt: string
  player: {
    id: string
    playerName: string
    totalPoints: number
    villagesUsed: number
    rank: number
  }
}

interface TribeDetail extends TribeSummary {
  motd: string | null
  profileBody?: string | null
  members: TribeMember[]
  pendingInvites: TribeInvite[]
  pendingInviteCount: number
  pendingApplications: TribeApplicationItem[]
  applicationCount: number
  memberDefaultPermissions: TribePermissionValue[]
  config?: {
    leaveCooldownHours?: number
  }
}

interface TribeRequirements {
  minimumPoints: number
  premiumCost: number
}

const permissionLabels: Record<TribePermissionValue, string> = {
  INVITE_MEMBER: "Invite members",
  REMOVE_MEMBER: "Dismiss members",
  EDIT_DIPLOMACY: "Edit diplomacy",
  MODERATE_FORUM: "Forum moderator tools",
  SEND_MASS_MAIL: "Send mass mails",
  EDIT_PROFILE: "Edit tribe profile",
  VIEW_APPLICATIONS: "Review applications",
  MANAGE_PERMISSIONS: "Manage permissions",
}

const roleLabels: Record<TribeRoleType, string> = {
  FOUNDER: "Founder",
  CO_FOUNDER: "Co-founder",
  OFFICER: "Officer",
  MEMBER: "Member",
}

type MemberSortKey = "points" | "villages" | "rank" | "lastActive" | "joinDate"
type TribeRoleFilter = "ALL" | TribeRoleType

const sortOptions: { value: MemberSortKey; label: string }[] = [
  { value: "points", label: "Points" },
  { value: "villages", label: "Villages" },
  { value: "rank", label: "Rank" },
  { value: "lastActive", label: "Last active" },
  { value: "joinDate", label: "Join date" },
]

const memberRoleFilterOptions: { value: TribeRoleFilter; label: string }[] = [
  { value: "ALL", label: "All roles" },
  { value: "FOUNDER", label: "Founder" },
  { value: "CO_FOUNDER", label: "Co-founders" },
  { value: "OFFICER", label: "Officers" },
  { value: "MEMBER", label: "Members" },
]

const dateFormatter = typeof window !== "undefined" ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }) : null

const initialRequirements: TribeRequirements = {
  minimumPoints: 5000,
  premiumCost: 0,
}

export default function TribesPage() {
  const [tribes, setTribes] = useState<TribeSummary[]>([])
  const [requirements, setRequirements] = useState<TribeRequirements>(initialRequirements)
  const [loading, setLoading] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: "",
    tag: "",
    description: "",
    profileBody: "",
    joinPolicy: "INVITE_ONLY" as "INVITE_ONLY" | "OPEN" | "APPLICATION",
    memberDefaultPermissions: [] as TribePermissionValue[],
    usePremiumBypass: false,
  })
  const [creating, setCreating] = useState(false)
  const [playerId, setPlayerId] = useState<string | null>(null)
  const [authToken, setAuthToken] = useState<string | null>(null)

  const [selectedTribeId, setSelectedTribeId] = useState<string | null>(null)
  const [selectedTribe, setSelectedTribe] = useState<TribeDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [managerPermissions, setManagerPermissions] = useState<TribePermissionValue[]>([])
  const [defaultPermissionDraft, setDefaultPermissionDraft] = useState<TribePermissionValue[]>([])
  const [savingDefaults, setSavingDefaults] = useState(false)

  const [memberSort, setMemberSort] = useState<{ key: MemberSortKey; direction: "asc" | "desc" }>({
    key: "points",
    direction: "desc",
  })
  const [memberRoleFilter, setMemberRoleFilter] = useState<TribeRoleFilter>("ALL")

  const [inviteTarget, setInviteTarget] = useState("")
  const [bulkNames, setBulkNames] = useState("")
  const [bulkCoords, setBulkCoords] = useState("")
  const [bulkMessage, setBulkMessage] = useState("")
  const [bulkInviting, setBulkInviting] = useState(false)
  const [reviewingApplicationId, setReviewingApplicationId] = useState<string | null>(null)
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetchTribes().finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const storedPlayerId = typeof window !== "undefined" ? localStorage.getItem("playerId") : null
    const storedToken = typeof window !== "undefined" ? localStorage.getItem("authToken") : null
    if (storedPlayerId) {
      setPlayerId(storedPlayerId)
    }
    if (storedToken) {
      setAuthToken(storedToken)
    }
  }, [])

  useEffect(() => {
    if (selectedTribe) {
      setDefaultPermissionDraft(selectedTribe.memberDefaultPermissions || [])
    }
  }, [selectedTribe])

  async function fetchTribes() {
    try {
      const res = await fetch("/api/tribes")
      const result = await res.json()
      if (result.success && result.data) {
        setTribes(result.data.tribes || [])
        setRequirements(result.data.requirements || initialRequirements)
      } else {
        alert(result.error || "Failed to load tribes")
      }
    } catch (error) {
      console.error("Failed to load tribes", error)
      alert("Failed to load tribes")
    }
  }

  async function fetchTribeDetail(tribeId: string) {
    try {
      setDetailLoading(true)
      const params = new URLSearchParams({ tribeId })
      if (playerId) {
        params.append("managerId", playerId)
      }
      const res = await fetch(`/api/tribes?${params.toString()}`)
      const result = await res.json()
      if (result.success && result.data?.tribe) {
        setSelectedTribeId(tribeId)
        setSelectedTribe(result.data.tribe)
        setManagerPermissions(result.data.permissions || [])
      } else {
        alert(result.error || "Failed to load tribe details")
      }
    } catch (error) {
      console.error("Failed to fetch tribe detail", error)
      alert("Failed to load tribe details")
    } finally {
      setDetailLoading(false)
    }
  }

  const sortedMembers = useMemo(() => {
    if (!selectedTribe) return []
    let members = [...selectedTribe.members]
    if (memberRoleFilter !== "ALL") {
      members = members.filter((member) => (member.tribeRole || "MEMBER") === memberRoleFilter)
    }
    members.sort((a, b) => {
      switch (memberSort.key) {
        case "villages":
          return compareNumbers(a.villagesUsed, b.villagesUsed, memberSort.direction)
        case "rank":
          return compareNumbers(a.rank, b.rank, memberSort.direction === "asc" ? "desc" : "asc")
        case "lastActive":
          return compareDates(a.lastActiveAt, b.lastActiveAt, memberSort.direction)
        case "joinDate":
          return compareDates(a.tribeJoinedAt, b.tribeJoinedAt, memberSort.direction)
        case "points":
        default:
          return compareNumbers(a.totalPoints, b.totalPoints, memberSort.direction)
      }
    })
    return members
  }, [selectedTribe, memberRoleFilter, memberSort])

  function compareNumbers(a: number, b: number, direction: "asc" | "desc") {
    return direction === "asc" ? a - b : b - a
  }

  function compareDates(a: string | null, b: string | null, direction: "asc" | "desc") {
    const aTime = a ? new Date(a).getTime() : 0
    const bTime = b ? new Date(b).getTime() : 0
    return direction === "asc" ? aTime - bTime : bTime - aTime
  }

  function toggleCreatePermission(permission: TribePermissionValue) {
    setCreateForm((prev) => {
      const exists = prev.memberDefaultPermissions.includes(permission)
      const next = exists
        ? prev.memberDefaultPermissions.filter((perm) => perm !== permission)
        : [...prev.memberDefaultPermissions, permission]
      return { ...prev, memberDefaultPermissions: next }
    })
  }

  function toggleDefaultPermission(permission: TribePermissionValue) {
    setDefaultPermissionDraft((prev) => {
      const exists = prev.includes(permission)
      return exists ? prev.filter((perm) => perm !== permission) : [...prev, permission]
    })
  }

  async function createTribe() {
    if (!playerId) {
      alert("Please log in to create a tribe")
      return
    }

    if (!createForm.name.trim() || !createForm.tag.trim()) {
      alert("Name and tag are required")
      return
    }

    try {
      setCreating(true)
      const res = await fetch("/api/tribes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          action: "create",
          leaderId: playerId,
          name: createForm.name.trim(),
          tag: createForm.tag.trim().toUpperCase(),
          description: createForm.description.trim() || null,
          profileBody: createForm.profileBody.trim() || null,
          joinPolicy: createForm.joinPolicy,
          memberDefaultPermissions: createForm.memberDefaultPermissions,
          usePremiumBypass: createForm.usePremiumBypass,
        }),
      })

      const result = await res.json()
      if (result.success) {
        alert("Tribe created successfully")
        setShowCreateForm(false)
        setCreateForm({
          name: "",
          tag: "",
          description: "",
          profileBody: "",
          joinPolicy: "INVITE_ONLY",
          memberDefaultPermissions: [],
          usePremiumBypass: false,
        })
        await fetchTribes()
        if (result.data?.id) {
          fetchTribeDetail(result.data.id)
        }
      } else {
        alert(result.error || "Failed to create tribe")
      }
    } catch (error) {
      console.error("Failed to create tribe", error)
      alert("Failed to create tribe")
    } finally {
      setCreating(false)
    }
  }

  async function sendSingleInvite() {
    if (!selectedTribe || !playerId || !inviteTarget.trim()) {
      alert("Provide a player ID to invite")
      return
    }

    try {
      const res = await fetch("/api/tribes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          action: "invite",
          tribeId: selectedTribe.id,
          playerId: inviteTarget.trim(),
          invitedById: playerId,
        }),
      })
      const result = await res.json()
      if (result.success) {
        alert("Invite sent")
        setInviteTarget("")
        fetchTribeDetail(selectedTribe.id)
      } else {
        alert(result.error || "Failed to send invite")
      }
    } catch (error) {
      console.error("Failed to send invite", error)
      alert("Failed to send invite")
    }
  }

  async function handleBulkInvite() {
    if (!selectedTribe || !playerId) {
      alert("Select a tribe first")
      return
    }

    const playerNames = bulkNames
      .split(/[,\n]/)
      .map((name) => name.trim())
      .filter(Boolean)

    const coordinatePairs = bulkCoords
      .split(/\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map(parseCoordinateLine)
      .filter((coord): coord is { x: number; y: number } => coord !== null)

    if (!playerNames.length && !coordinatePairs.length) {
      alert("Provide player names or coordinates")
      return
    }

    try {
      setBulkInviting(true)
      const res = await fetch("/api/tribes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          action: "bulkInvite",
          tribeId: selectedTribe.id,
          invitedById: playerId,
          playerNames: playerNames.length ? playerNames : undefined,
          coordinates: coordinatePairs.length ? coordinatePairs : undefined,
          message: bulkMessage.trim() || undefined,
        }),
      })
      const result = await res.json()
      if (result.success) {
        alert(`Invites created: ${result.data?.created ?? 0}`)
        setBulkNames("")
        setBulkCoords("")
        setBulkMessage("")
        fetchTribeDetail(selectedTribe.id)
      } else {
        alert(result.error || "Failed to send bulk invites")
      }
    } catch (error) {
      console.error("Bulk invite failed", error)
      alert("Failed to send bulk invites")
    } finally {
      setBulkInviting(false)
    }
  }

  async function handleReview(applicationId: string, decision: "APPROVE" | "REJECT") {
    if (!selectedTribe || !playerId) return
    try {
      setReviewingApplicationId(applicationId)
      const res = await fetch("/api/tribes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          action: "reviewApplication",
          applicationId,
          reviewerId: playerId,
          action: decision,
        }),
      })
      const result = await res.json()
      if (result.success) {
        fetchTribeDetail(selectedTribe.id)
      } else {
        alert(result.error || "Failed to review application")
      }
    } catch (error) {
      console.error("Failed to review application", error)
      alert("Failed to review application")
    } finally {
      setReviewingApplicationId(null)
    }
  }

  async function handleRoleChange(member: TribeMember, nextRole: TribeRoleType) {
    if (!selectedTribe || !playerId) return
    if (member.tribeRole === nextRole) return

    try {
      const res = await fetch("/api/tribes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          action: "updateRole",
          tribeId: selectedTribe.id,
          actorId: playerId,
          targetPlayerId: member.id,
          role: nextRole,
        }),
      })
      const result = await res.json()
      if (result.success) {
        fetchTribeDetail(selectedTribe.id)
      } else {
        alert(result.error || "Failed to update role")
      }
    } catch (error) {
      console.error("Failed to update role", error)
      alert("Failed to update role")
    }
  }

  async function handleRemoveMember(member: TribeMember) {
    if (!selectedTribe || !playerId) return
    if (!confirm(`Remove ${member.playerName} from the tribe?`)) return

    try {
      setRemovingMemberId(member.id)
      const res = await fetch("/api/tribes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          action: "removeMember",
          tribeId: selectedTribe.id,
          actorId: playerId,
          targetPlayerId: member.id,
        }),
      })
      const result = await res.json()
      if (result.success) {
        fetchTribeDetail(selectedTribe.id)
      } else {
        alert(result.error || "Failed to remove member")
      }
    } catch (error) {
      console.error("Failed to remove member", error)
      alert("Failed to remove member")
    } finally {
      setRemovingMemberId(null)
    }
  }

  async function handleSaveDefaultPermissions() {
    if (!selectedTribe || !playerId) return

    try {
      setSavingDefaults(true)
      const res = await fetch("/api/tribes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          action: "updateDefaultPermissions",
          tribeId: selectedTribe.id,
          actorId: playerId,
          memberDefaultPermissions: defaultPermissionDraft,
        }),
      })
      const result = await res.json()
      if (result.success) {
        alert("Default permissions updated")
        fetchTribeDetail(selectedTribe.id)
      } else {
        alert(result.error || "Failed to update permissions")
      }
    } catch (error) {
      console.error("Failed to update default permissions", error)
      alert("Failed to update permissions")
    } finally {
      setSavingDefaults(false)
    }
  }

  const canInvite = managerPermissions.includes("INVITE_MEMBER")
  const canRemoveMembers = managerPermissions.includes("REMOVE_MEMBER")
  const canManagePermissions = managerPermissions.includes("MANAGE_PERMISSIONS")
  const canReviewApplications = managerPermissions.includes("VIEW_APPLICATIONS")

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <Link href="/dashboard" className="text-sm hover:underline">
            ← Back
          </Link>
          <h1 className="text-xl font-bold">👥 Tribes</h1>
          <Button variant="outline" size="sm" onClick={() => setShowCreateForm(true)}>
            Create Tribe
          </Button>
        </div>
      </header>

      <main className="flex-1 w-full p-4">
        <div className="max-w-6xl mx-auto grid gap-6 lg:grid-cols-[2fr,3fr]">
          <section className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h2 className="font-semibold text-lg">Top Tribes</h2>
                <span className="text-sm text-muted-foreground">
                  Need {requirements.minimumPoints.toLocaleString()} points or {requirements.premiumCost} premium to found
                </span>
              </div>
              {loading ? (
                <div className="text-center py-8 text-sm text-muted-foreground">Loading...</div>
              ) : (
                <TextTable
                  headers={["Rank", "Name", "Tag", "Points", "Members", "Leader", "Actions"]}
                  rows={tribes.map((tribe, idx) => [
                    (idx + 1).toString(),
                    tribe.name,
                    tribe.tag,
                    tribe.totalPoints?.toLocaleString() || "0",
                    tribe.memberCount?.toString() || "0",
                    tribe.leader?.playerName || "-",
                    <Button
                      key={tribe.id}
                      variant={tribe.id === selectedTribeId ? "default" : "outline"}
                      size="sm"
                      onClick={() => fetchTribeDetail(tribe.id)}
                    >
                      {tribe.id === selectedTribeId ? "Viewing" : "View"}
                    </Button>,
                  ])}
                />
              )}
            </div>
            {selectedTribe && (
              <div className="rounded-lg border border-border bg-card p-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      {selectedTribe.name}
                      <Badge variant="outline">{selectedTribe.tag}</Badge>
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Leader: {selectedTribe.leader?.playerName || "Unknown"} • Members: {selectedTribe.memberCount}
                    </p>
                    {selectedTribe.description && (
                      <p className="mt-2 text-sm whitespace-pre-wrap">{selectedTribe.description}</p>
                    )}
                  </div>
                  {selectedTribe.config?.leaveCooldownHours && (
                    <Badge variant="secondary">{selectedTribe.config.leaveCooldownHours}h leave cooldown</Badge>
                  )}
                </div>

                {canManagePermissions && (
                  <div className="rounded-md border border-border/60 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm uppercase tracking-wide">Default member permissions</h3>
                      <Button
                        size="sm"
                        onClick={handleSaveDefaultPermissions}
                        disabled={savingDefaults || !selectedTribe}
                      >
                        {savingDefaults ? "Saving..." : "Save"}
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {TRIBE_PERMISSION_VALUES.map((permission) => (
                        <label key={permission} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={defaultPermissionDraft.includes(permission)}
                            onCheckedChange={() => toggleDefaultPermission(permission)}
                          />
                          {permissionLabels[permission]}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Label htmlFor="memberSort">Sort by</Label>
                    <select
                      id="memberSort"
                      className="border border-border rounded-md bg-background p-1 text-sm"
                      value={memberSort.key}
                      onChange={(e) => setMemberSort((prev) => ({ ...prev, key: e.target.value as MemberSortKey }))}
                    >
                      {sortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setMemberSort((prev) => ({ ...prev, direction: prev.direction === "asc" ? "desc" : "asc" }))
                      }
                    >
                      {memberSort.direction === "asc" ? "↑" : "↓"}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Label htmlFor="memberFilter">Filter</Label>
                    <select
                      id="memberFilter"
                      className="border border-border rounded-md bg-background p-1 text-sm"
                      value={memberRoleFilter}
                      onChange={(e) => setMemberRoleFilter(e.target.value as TribeRoleFilter)}
                    >
                      {memberRoleFilterOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="p-2 text-left font-medium">Player</th>
                        <th className="p-2 text-left font-medium">Role</th>
                        <th className="p-2 text-right font-medium">Points</th>
                        <th className="p-2 text-right font-medium">Villages</th>
                        <th className="p-2 text-right font-medium">Rank</th>
                        <th className="p-2 text-left font-medium">Joined</th>
                        <th className="p-2 text-left font-medium">Last active</th>
                        <th className="p-2 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailLoading && (
                        <tr>
                          <td colSpan={8} className="p-4 text-center text-muted-foreground">
                            Loading members...
                          </td>
                        </tr>
                      )}
                      {!detailLoading && sortedMembers.length === 0 && (
                        <tr>
                          <td colSpan={8} className="p-4 text-center text-muted-foreground">
                            No members found
                          </td>
                        </tr>
                      )}
                      {!detailLoading &&
                        sortedMembers.map((member) => {
                          const role = member.tribeRole || "MEMBER"
                          return (
                            <tr key={member.id} className="border-t border-border/60">
                              <td className="p-2 font-medium">{member.playerName}</td>
                              <td className="p-2">
                                {roleLabels[role]}
                                {role === "FOUNDER" && <Badge variant="outline" className="ml-2 text-xs">Founder</Badge>}
                              </td>
                              <td className="p-2 text-right">{member.totalPoints.toLocaleString()}</td>
                              <td className="p-2 text-right">{member.villagesUsed}</td>
                              <td className="p-2 text-right">{member.rank}</td>
                              <td className="p-2">{formatDate(member.tribeJoinedAt)}</td>
                              <td className="p-2">{formatDate(member.lastActiveAt)}</td>
                              <td className="p-2 text-right space-y-1">
                                {canManagePermissions && role !== "FOUNDER" && member.id !== playerId && (
                                  <select
                                    className="border border-border rounded-md bg-background p-1 text-sm w-full"
                                    value={role}
                                    onChange={(e) => handleRoleChange(member, e.target.value as TribeRoleType)}
                                  >
                                    <option value="CO_FOUNDER">Co-founder</option>
                                    <option value="OFFICER">Officer</option>
                                    <option value="MEMBER">Member</option>
                                  </select>
                                )}
                                {canRemoveMembers && role !== "FOUNDER" && member.id !== playerId && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => handleRemoveMember(member)}
                                    disabled={removingMemberId === member.id}
                                  >
                                    {removingMemberId === member.id ? "Removing..." : "Remove"}
                                  </Button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                  </table>
                </div>

                {canInvite && (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm uppercase tracking-wide">Invitations</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-sm">Invite Player (ID)</Label>
                        <div className="flex gap-2">
                          <Input
                            value={inviteTarget}
                            onChange={(e) => setInviteTarget(e.target.value)}
                            placeholder="Player ID"
                          />
                          <Button onClick={sendSingleInvite}>Send</Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Bulk message (optional)</Label>
                        <Input
                          value={bulkMessage}
                          onChange={(e) => setBulkMessage(e.target.value)}
                          placeholder="Message"
                        />
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label className="text-sm">Player names (comma or newline separated)</Label>
                        <Textarea
                          value={bulkNames}
                          onChange={(e) => setBulkNames(e.target.value)}
                          rows={4}
                          placeholder="PlayerOne\nPlayerTwo"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Village coordinates (x y per line)</Label>
                        <Textarea
                          value={bulkCoords}
                          onChange={(e) => setBulkCoords(e.target.value)}
                          rows={4}
                          placeholder="123 456"
                        />
                      </div>
                    </div>
                    <Button onClick={handleBulkInvite} disabled={bulkInviting}>
                      {bulkInviting ? "Inviting..." : "Send bulk invites"}
                    </Button>
                  </div>
                )}

                {selectedTribe.pendingInvites.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm uppercase tracking-wide">Pending invites</h3>
                    <div className="border border-border rounded-md divide-y divide-border/60">
                      {selectedTribe.pendingInvites.map((invite) => (
                        <div key={invite.id} className="p-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{invite.player.playerName}</span>
                            <span className="text-muted-foreground text-xs">
                              Expires {formatDate(invite.expiresAt)}
                            </span>
                          </div>
                          {invite.message && <p className="text-muted-foreground">{invite.message}</p>}
                          <p className="text-xs text-muted-foreground">
                            Invited by {invite.invitedBy?.playerName || "Unknown"} • Score {invite.player.totalPoints.toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {canReviewApplications && selectedTribe.pendingApplications.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold text-sm uppercase tracking-wide">Applications</h3>
                    <div className="border border-border rounded-md divide-y divide-border/60">
                      {selectedTribe.pendingApplications.map((application) => (
                        <div key={application.id} className="p-3 text-sm space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{application.player.playerName}</span>
                            <span className="text-xs text-muted-foreground">{formatDate(application.createdAt)}</span>
                          </div>
                          <p className="text-muted-foreground">{application.message || "No message provided."}</p>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleReview(application.id, "APPROVE")}
                              disabled={reviewingApplicationId === application.id}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReview(application.id, "REJECT")}
                              disabled={reviewingApplicationId === application.id}
                            >
                              Reject
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="space-y-4">
            {!selectedTribe && (
              <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                Select a tribe from the left to view roster, invites, and applications.
              </div>
            )}
            {selectedTribe && (
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="font-semibold mb-3">Tribe Profile</h3>
                {selectedTribe.profileBody ? (
                  <p className="text-sm whitespace-pre-wrap">{selectedTribe.profileBody}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">No profile set.</p>
                )}
              </div>
            )}
          </section>
        </div>
      </main>

      {showCreateForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-card p-6 rounded-lg max-w-2xl w-full space-y-4 border border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Create New Tribe</h2>
              <Button variant="ghost" onClick={() => setShowCreateForm(false)}>
                ✕
              </Button>
            </div>
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label>Tribe Name</Label>
                <Input
                  value={createForm.name}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, name: e.target.value }))}
                  maxLength={60}
                  placeholder="Enter tribe name"
                />
              </div>
              <div className="grid gap-2">
                <Label>Tag (2-6 characters)</Label>
                <Input
                  value={createForm.tag}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, tag: e.target.value.toUpperCase() }))}
                  maxLength={6}
                  placeholder="TAG"
                />
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, description: e.target.value }))}
                  maxLength={500}
                  rows={3}
                  placeholder="Describe your tribe..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Profile Body</Label>
                <Textarea
                  value={createForm.profileBody}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, profileBody: e.target.value }))}
                  maxLength={4000}
                  rows={4}
                  placeholder="Full tribe profile, diplomacy rules, etc."
                />
              </div>
              <div className="grid gap-2">
                <Label>Join Policy</Label>
                <select
                  className="border border-border rounded-md bg-background p-2"
                  value={createForm.joinPolicy}
                  onChange={(e) =>
                    setCreateForm((prev) => ({ ...prev, joinPolicy: e.target.value as "INVITE_ONLY" | "OPEN" | "APPLICATION" }))
                  }
                >
                  <option value="INVITE_ONLY">Invite Only</option>
                  <option value="OPEN">Open Enrollment</option>
                  <option value="APPLICATION">Application Required</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label>Default Member Permissions</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {TRIBE_PERMISSION_VALUES.map((permission) => (
                    <label key={permission} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={createForm.memberDefaultPermissions.includes(permission)}
                        onCheckedChange={() => toggleCreatePermission(permission)}
                      />
                      {permissionLabels[permission]}
                    </label>
                  ))}
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={createForm.usePremiumBypass}
                  onCheckedChange={(checked) =>
                    setCreateForm((prev) => ({ ...prev, usePremiumBypass: Boolean(checked) }))
                  }
                />
                Spend {requirements.premiumCost} premium to bypass minimum points ({requirements.minimumPoints.toLocaleString()})
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateForm(false)} disabled={creating}>
                Cancel
              </Button>
              <Button onClick={createTribe} disabled={creating}>
                {creating ? "Creating..." : "Create Tribe"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function parseCoordinateLine(line: string): { x: number; y: number } | null {
  const parts = line.split(/[\s,|]+/).filter(Boolean)
  if (parts.length !== 2) return null
  const [x, y] = parts.map((value) => Number.parseInt(value, 10))
  if (Number.isNaN(x) || Number.isNaN(y)) return null
  return { x, y }
}

function formatDate(value: string | null) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return dateFormatter ? dateFormatter.format(date) : date.toLocaleString()
}

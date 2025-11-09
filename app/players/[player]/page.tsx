"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  Award,
  Globe,
  MapPin,
  Shield,
  Swords,
  Users,
  UserCheck,
  MessageSquare,
  Star,
  NotebookPen,
  Activity,
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { TextTable } from "@/components/game/text-table"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { cn } from "@/lib/utils"

type PlayerProfileResponse = {
  player: {
    id: string
    playerName: string
    rank: number
    totalPoints: number
    villagesUsed: number
    tribe?: { id: string; name: string; tag: string } | null
    tribeRole?: string | null
    createdAt: string
    lastActiveAt: string
    profileHeadline?: string | null
    profileBio?: string | null
    countryCode?: string | null
    preferredLanguage?: string | null
  }
  access: {
    visibility: "PUBLIC" | "TRIBE_ONLY" | "PRIVATE"
    restricted: boolean
  }
  stats: {
    od: { attacking: number; defending: number; supporting: number }
    troops: { killed: number; lost: number }
    battles: { wavesSurvived: number }
  } | null
  territory: {
    villages: Array<{
      id: string
      name: string
      x: number
      y: number
      population: number
      isCapital: boolean
      points: number
      createdAt: string
    }>
    averageVillagePoints: number
    villageCount: number
    bounds: { minX: number; maxX: number; minY: number; maxY: number }
    expansionHistory: Array<{
      villageId: string
      name: string
      type: string
      happenedAt: string
      coordinate: { x: number; y: number }
    }>
  } | null
  social: {
    friends: Array<{
      id: string
      status: string
      relation: string
      requestedAt: string
      respondedAt: string | null
      friend: {
        id: string
        playerName: string
        tribeTag: string | null
        rank: number | null
        lastActiveAt: string | null
        online: boolean
      }
    }>
    badges: Array<{
      id: string
      badgeKey: string
      title: string
      description: string | null
      icon: string | null
      category: string | null
      tier: number
      awardedAt: string
    }>
    endorsements: Array<{
      id: string
      message: string | null
      strength: number
      createdAt: string
      endorser: { id: string; playerName: string; rank: number | null; tribe?: { tag: string | null } | null }
    }>
    mentorships: {
      asMentor: Array<{
        id: string
        status: string
        startedAt: string | null
        mentee: { id: string; playerName: string; rank: number | null }
      }>
      asMentee: Array<{
        id: string
        status: string
        startedAt: string | null
        mentor: { id: string; playerName: string; rank: number | null }
      }>
    }
    socialFeed: Array<{
      id: string
      activityType: string
      visibility: string
      summary: string
      payload: Record<string, unknown> | null
      createdAt: string
      actor?: { id: string; playerName: string } | null
    }>
    preferences: {
      allowFriendRequests: boolean
      allowMentorship: boolean
      socialFeedOptIn: boolean
    }
    viewerContext: {
      relationship: { status: string; initiatedByViewer: boolean } | null
      blockedByViewer: boolean
      blockedViewer: boolean
      canFriend: boolean
      canMentor: boolean
      note: { id: string; stance: string; note: string; tags: string[]; updatedAt: string } | null
      endorsement: { id: string; status: string; strength: number; message: string | null } | null
    } | null
  }
}

type TerritoryVillages = NonNullable<PlayerProfileResponse["territory"]>["villages"]

const FRIEND_ACTIONS = {
  NONE: "REQUEST",
  PENDING_OUTBOUND: "CANCEL",
  PENDING_INBOUND_ACCEPT: "ACCEPT",
  PENDING_INBOUND_DECLINE: "DECLINE",
  ACCEPTED: "REMOVE",
} as const

const ONLINE_WINDOW_MS = 10 * 60 * 1000

type PlayerProfilePageProps = { params: { player: string } }

export default function PlayerProfilePage({ params }: PlayerProfilePageProps) {
  const slug = decodeURIComponent(params.player)
  const { auth, initialized } = useAuth()
  const [profile, setProfile] = useState<PlayerProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingNote, setSavingNote] = useState(false)
  const [friendshipLoading, setFriendshipLoading] = useState(false)
  const [blockActionLoading, setBlockActionLoading] = useState(false)
  const [endorsementMessage, setEndorsementMessage] = useState("")
  const [postingFeed, setPostingFeed] = useState(false)
  const [feedSummary, setFeedSummary] = useState("")
  const [feedType, setFeedType] = useState("ACHIEVEMENT")
  const [feedVisibility, setFeedVisibility] = useState<"PUBLIC" | "FRIENDS" | "PRIVATE">("PUBLIC")
  const [noteDraft, setNoteDraft] = useState({ stance: "NEUTRAL", note: "", tags: "" })

  const looksLikeId = useMemo(() => /^[a-z0-9]{20,}$/i.test(slug), [slug])

  const viewerIsOwner = auth?.playerId && profile?.player?.id === auth.playerId

  useEffect(() => {
    if (!profile?.social.viewerContext?.note) {
      setNoteDraft((prev) => ({ ...prev, note: "", stance: "NEUTRAL", tags: "" }))
      return
    }
    const note = profile.social.viewerContext.note
    setNoteDraft({
      stance: note.stance,
      note: note.note,
      tags: note.tags.join(", "),
    })
  }, [profile?.social.viewerContext?.note])

  const fetchProfile = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (looksLikeId) {
        params.set("playerId", slug)
      } else {
        params.set("handle", slug)
      }
      const headers: HeadersInit = {}
      if (auth?.token) {
        headers["Authorization"] = `Bearer ${auth.token}`
      }
      const res = await fetch(`/api/players/profile?${params.toString()}`, { headers })
      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error || "Failed to load profile")
      }
      setProfile(json.data as PlayerProfileResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile")
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [slug, looksLikeId, auth?.token])

  useEffect(() => {
    if (!initialized) return
    fetchProfile()
  }, [fetchProfile, initialized])

  const lastActiveLabel = useMemo(() => {
    if (!profile?.player.lastActiveAt) return "-"
    const lastActive = new Date(profile.player.lastActiveAt)
    const online = Date.now() - lastActive.getTime() < ONLINE_WINDOW_MS
    return online ? "Online now" : `Last seen ${lastActive.toLocaleString()}`
  }, [profile?.player.lastActiveAt])

  const handleFriendAction = useCallback(
    async (action: "REQUEST" | "ACCEPT" | "DECLINE" | "REMOVE" | "CANCEL") => {
      if (!auth?.token || !auth.playerId || !profile) {
        alert("Sign in to manage friendships.")
        return
      }
      setFriendshipLoading(true)
      try {
        const res = await fetch("/api/social/friends", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({
            actorId: auth.playerId,
            targetId: profile.player.id,
            action,
          }),
        })
        const json = await res.json()
        if (!json.success) {
          throw new Error(json.error || "Friend action failed")
        }
        await fetchProfile()
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to update friendship")
      } finally {
        setFriendshipLoading(false)
      }
    },
    [auth?.token, auth?.playerId, profile, fetchProfile],
  )

  const handleNoteSave = useCallback(async () => {
    if (!auth?.token || !auth.playerId || !profile) {
      alert("Sign in to manage notes.")
      return
    }
    setSavingNote(true)
    try {
      const body = {
        ownerId: auth.playerId,
        targetId: profile.player.id,
        stance: noteDraft.stance,
        note: noteDraft.note.trim(),
        tags: noteDraft.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      }
      if (!body.note) {
        throw new Error("Note cannot be empty.")
      }
      const res = await fetch("/api/social/notes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error || "Failed to save note")
      }
      await fetchProfile()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save note")
    } finally {
      setSavingNote(false)
    }
  }, [auth?.token, auth?.playerId, profile, noteDraft, fetchProfile])

  const handleBlockToggle = useCallback(async () => {
    if (!auth?.token || !auth.playerId || !profile) {
      alert("Sign in to manage blocks.")
      return
    }
    setBlockActionLoading(true)
    try {
      const viewerContext = profile.social.viewerContext
      const action = viewerContext?.blockedByViewer ? "UNBLOCK" : "BLOCK"
      const res = await fetch("/api/social/blocks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          actorId: auth.playerId,
          targetId: profile.player.id,
          action,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error || "Failed to update block")
      }
      await fetchProfile()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update block")
    } finally {
      setBlockActionLoading(false)
    }
  }, [auth?.token, auth?.playerId, profile, fetchProfile])

  const handleEndorsementToggle = useCallback(async () => {
    if (!auth?.token || !auth.playerId || !profile) {
      alert("Sign in to endorse players.")
      return
    }
    const hasEndorsed = Boolean(profile.social.viewerContext?.endorsement)
    try {
      const res = await fetch("/api/social/endorsements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          actorId: auth.playerId,
          targetId: profile.player.id,
          action: hasEndorsed ? "REVOKE" : "ENDORSE",
          message: hasEndorsed ? undefined : endorsementMessage,
          strength: hasEndorsed ? undefined : 3,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error || "Failed to update endorsement")
      }
      setEndorsementMessage("")
      await fetchProfile()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update endorsement")
    }
  }, [auth?.token, auth?.playerId, profile, endorsementMessage, fetchProfile])

  const handleMentorshipRequest = useCallback(async () => {
    if (!auth?.token || !auth.playerId || !profile) {
      alert("Sign in to request mentorships.")
      return
    }
    try {
      const res = await fetch("/api/social/mentorships", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          actorId: auth.playerId,
          mentorId: profile.player.id,
          menteeId: auth.playerId,
          action: "REQUEST",
        }),
      })
      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error || "Failed to request mentorship")
      }
      await fetchProfile()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to request mentorship")
    }
  }, [auth?.token, auth?.playerId, profile, fetchProfile])

  const handleFeedPost = useCallback(async () => {
    if (!auth?.token || !auth.playerId || !profile || !viewerIsOwner) {
      alert("You can only post to your own feed.")
      return
    }
    if (!feedSummary.trim()) {
      alert("Write a short summary before posting.")
      return
    }
    setPostingFeed(true)
    try {
      const res = await fetch("/api/social/feed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          actorId: auth.playerId,
          playerId: auth.playerId,
          summary: feedSummary.trim(),
          activityType: feedType,
          visibility: feedVisibility,
        }),
      })
      const json = await res.json()
      if (!json.success) {
        throw new Error(json.error || "Failed to publish update")
      }
      setFeedSummary("")
      await fetchProfile()
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to publish update")
    } finally {
      setPostingFeed(false)
    }
  }, [auth?.token, auth?.playerId, profile, viewerIsOwner, feedSummary, feedType, feedVisibility, fetchProfile])

  const activeMentorshipWithViewer = useMemo(() => {
    if (!auth?.playerId || !profile) return null
    return profile.social.mentorships.asMentor.find(
      (entry) => entry.mentee.id === auth.playerId && entry.status !== "COMPLETED" && entry.status !== "CANCELLED",
    )
  }, [auth?.playerId, profile])

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex items-center gap-3 text-muted-foreground">
          <LoadingSpinner />
          <span>Loading profile…</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <div className="text-center">
          <p className="text-lg font-semibold">Unable to load player profile.</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
        <Button variant="outline" onClick={fetchProfile}>
          Retry
        </Button>
      </div>
    )
  }

  if (!profile) {
    return null
  }

  const viewerContext = profile.social.viewerContext
  const relationshipStatus = viewerContext?.relationship?.status ?? "NONE"
  const pendingIncoming = relationshipStatus === "PENDING" && !viewerContext?.relationship?.initiatedByViewer
  const pendingOutgoing = relationshipStatus === "PENDING" && viewerContext?.relationship?.initiatedByViewer
  const isFriend = relationshipStatus === "ACCEPTED"
  const canFriend = viewerContext?.canFriend ?? false
  const blocked = viewerContext?.blockedByViewer ?? false
  const blockDisabled = viewerContext?.blockedViewer
  const onlineNow = Date.now() - new Date(profile.player.lastActiveAt).getTime() < ONLINE_WINDOW_MS

  const socialFeed = profile.social.socialFeed
  const villages: TerritoryVillages = profile.territory?.villages ?? []

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
        <header className="space-y-1">
          <Link href="/leaderboard" className="text-sm text-muted-foreground hover:underline">
            ← Leaderboard
          </Link>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold flex items-center gap-2">
                {profile.player.playerName}
                {onlineNow && <Badge variant="secondary">Online</Badge>}
              </h1>
              <p className="text-muted-foreground text-sm">{profile.player.profileHeadline ?? "No headline yet"}</p>
            </div>
            <div className="flex gap-2">
              {viewerIsOwner && (
                <Badge variant="outline">Your profile</Badge>
              )}
              <Badge variant="outline">{profile.access.visibility.replace("_", " ")} view</Badge>
            </div>
          </div>
        </header>

        {profile.access.restricted && (
          <Card className="border-yellow-500/40 bg-yellow-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-yellow-600">
                <Shield className="h-4 w-4" />
                Limited profile
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-yellow-700">
              This chieftain only shares full details with trusted tribe mates. You can still view public stats and send social requests.
            </CardContent>
          </Card>
        )}

        <section className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Basic Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Rank</span>
                <span className="font-semibold">#{profile.player.rank}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total points</span>
                <span className="font-semibold">{profile.player.totalPoints.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Villages</span>
                <span className="font-semibold">{profile.player.villagesUsed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tribe</span>
                <span className="font-semibold">
                  {profile.player.tribe ? (
                    <>
                      [{profile.player.tribe.tag}] {profile.player.tribe.name}
                    </>
                  ) : (
                    "Independent"
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Joined</span>
                <span>{new Date(profile.player.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Activity</span>
                <span>{lastActiveLabel}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4" />
                Personal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>{profile.player.profileBio || <span className="text-muted-foreground">This ruler keeps their story secret…</span>}</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground uppercase">Country</p>
                  <p className="font-semibold flex items-center gap-2">
                    {countryFlag(profile.player.countryCode)}
                    {profile.player.countryCode || "Unknown"}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground uppercase">Language</p>
                  <p className="font-semibold">{profile.player.preferredLanguage || "Unspecified"}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.social.badges.slice(0, 4).map((badge) => (
                  <Badge key={badge.id} variant="secondary">
                    {badge.title}
                  </Badge>
                ))}
                {profile.social.badges.length === 0 && (
                  <span className="text-xs text-muted-foreground">No badges yet</span>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {profile.stats && (
          <section className="grid gap-4 md:grid-cols-3">
            <StatCard icon={<Swords className="h-4 w-4" />} title="OD Attacking" value={profile.stats.od.attacking.toLocaleString()} />
            <StatCard icon={<Shield className="h-4 w-4" />} title="OD Defending" value={profile.stats.od.defending.toLocaleString()} />
            <StatCard icon={<Users className="h-4 w-4" />} title="Support" value={profile.stats.od.supporting.toLocaleString()} />
            <StatCard icon={<Activity className="h-4 w-4" />} title="Troops killed" value={profile.stats.troops.killed.toLocaleString()} />
            <StatCard icon={<Activity className="h-4 w-4" />} title="Troops lost" value={profile.stats.troops.lost.toLocaleString()} />
            <StatCard icon={<Globe className="h-4 w-4" />} title="Waves survived" value={profile.stats.battles.wavesSurvived.toLocaleString()} />
          </section>
        )}

        {profile.territory && (
          <section className="grid gap-4 lg:grid-cols-[2fr,1fr]">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4" />
                  Villages
                </CardTitle>
              </CardHeader>
              <CardContent>
                {villages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No known villages yet.</p>
                ) : (
                  <TextTable
                    headers={["Village", "Coordinates", "Points", "Capital"]}
                    rows={villages.map((village) => [
                      village.name,
                      `${village.x}|${village.y}`,
                      village.points.toLocaleString(),
                      village.isCapital ? <Badge key={village.id}>Capital</Badge> : "—",
                    ])}
                  />
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Territory map
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <TerritoryMap villages={villages} />
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Average points</span>
                    <span className="font-semibold">{Math.round(profile.territory.averageVillagePoints || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expansion events</span>
                    <span>{profile.territory.expansionHistory.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Friends & Reputation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex flex-wrap gap-2">
                {profile.social.friends.length === 0 && (
                  <p className="text-muted-foreground text-sm">No public friends yet.</p>
                )}
                {profile.social.friends.map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/players/${entry.friend.id}`}
                    className="rounded-md border border-border/60 px-3 py-2 flex items-center gap-2 hover:bg-muted/40 transition"
                  >
                    <span className={cn("h-2 w-2 rounded-full", entry.friend.online ? "bg-emerald-500" : "bg-muted-foreground/40")} />
                    <span>{entry.friend.playerName}</span>
                    {entry.friend.tribeTag && <Badge variant="outline">{entry.friend.tribeTag}</Badge>}
                  </Link>
                ))}
              </div>
              <div>
                <h4 className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Endorsements</h4>
                <div className="space-y-2">
                  {profile.social.endorsements.length === 0 && (
                    <p className="text-muted-foreground text-sm">No endorsements yet.</p>
                  )}
                  {profile.social.endorsements.map((endorsement) => (
                    <div key={endorsement.id} className="rounded-lg border border-border/60 p-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          by{" "}
                          <Link href={`/players/${endorsement.endorser.id}`} className="font-medium hover:underline">
                            {endorsement.endorser.playerName}
                          </Link>
                        </span>
                        <span>{new Date(endorsement.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm mt-1">{endorsement.message || "Reliable warrior"}</p>
                    </div>
                  ))}
                </div>
              </div>
              {viewerContext && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/60">
                  {pendingIncoming && (
                    <>
                      <Button size="sm" onClick={() => handleFriendAction("ACCEPT")} disabled={friendshipLoading}>
                        Accept request
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleFriendAction("DECLINE")} disabled={friendshipLoading}>
                        Decline
                      </Button>
                    </>
                  )}
                  {pendingOutgoing && (
                    <Button variant="outline" size="sm" onClick={() => handleFriendAction("CANCEL")} disabled={friendshipLoading}>
                      Cancel request
                    </Button>
                  )}
                  {canFriend && relationshipStatus === "NONE" && (
                    <Button size="sm" onClick={() => handleFriendAction("REQUEST")} disabled={friendshipLoading || viewerContext.blockedViewer}>
                      Add friend
                    </Button>
                  )}
                  {isFriend && (
                    <Button variant="outline" size="sm" onClick={() => handleFriendAction("REMOVE")} disabled={friendshipLoading}>
                      Remove friend
                    </Button>
                  )}
                  {viewerContext.endorsement ? (
                    <Button variant="outline" size="sm" onClick={handleEndorsementToggle}>
                      Revoke endorsement
                    </Button>
                  ) : (
                    <>
                      <Input
                        value={endorsementMessage}
                        onChange={(event) => setEndorsementMessage(event.target.value)}
                        placeholder="Optional endorsement note"
                        className="max-w-xs"
                      />
                      <Button size="sm" onClick={handleEndorsementToggle} disabled={!endorsementMessage.trim()}>
                        Endorse player
                      </Button>
                    </>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <NotebookPen className="h-4 w-4" />
                Contact Notes & Mentorship
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {viewerContext ? (
                <>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Diplomatic stance</span>
                    <select
                      className="rounded border border-border bg-background px-3 py-2"
                      value={noteDraft.stance}
                      onChange={(event) => setNoteDraft((prev) => ({ ...prev, stance: event.target.value }))}
                    >
                      {["ALLY", "ENEMY", "FARM", "TRADE", "NEUTRAL"].map((option) => (
                        <option key={option} value={option}>
                          {option.toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Private notes</span>
                    <Textarea
                      rows={4}
                      value={noteDraft.note}
                      onChange={(event) => setNoteDraft((prev) => ({ ...prev, note: event.target.value }))}
                      placeholder="Track diplomacy, farm runs, or battle intel…"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Tags</span>
                    <Input
                      value={noteDraft.tags}
                      onChange={(event) => setNoteDraft((prev) => ({ ...prev, tags: event.target.value }))}
                      placeholder="Comma separated (e.g., ally,night-shift)"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={handleNoteSave} disabled={savingNote}>
                      Save note
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleBlockToggle} disabled={blockActionLoading || blockDisabled}>
                      {blocked ? "Unblock" : "Block player"}
                    </Button>
                    {profile.social.preferences.allowMentorship && !viewerIsOwner && !activeMentorshipWithViewer && viewerContext.canMentor && (
                      <Button size="sm" variant="ghost" onClick={handleMentorshipRequest}>
                        Request mentorship
                      </Button>
                    )}
                    {activeMentorshipWithViewer && (
                      <Badge variant="secondary" className="text-xs">
                        Mentorship {activeMentorshipWithViewer.status.toLowerCase()}
                      </Badge>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">Sign in to leave private notes or manage diplomacy.</p>
              )}
              <div className="pt-2 border-t border-border/60 space-y-2">
                <h4 className="text-xs uppercase tracking-wide text-muted-foreground">Mentorship roster</h4>
                {profile.social.mentorships.asMentor.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No active mentees.</p>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {profile.social.mentorships.asMentor.map((entry) => (
                      <li key={entry.id} className="flex items-center justify-between">
                        <span>
                          Mentoring{" "}
                          <Link href={`/players/${entry.mentee.id}`} className="hover:underline">
                            {entry.mentee.playerName}
                          </Link>
                        </span>
                        <Badge variant="outline">{entry.status.toLowerCase()}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Social Feed
            </h2>
            {viewerIsOwner && (
              <div className="flex flex-wrap gap-2">
                <Input
                  value={feedSummary}
                  onChange={(event) => setFeedSummary(event.target.value)}
                  placeholder="Share a milestone…"
                  className="w-48"
                />
                <select
                  className="rounded border border-border bg-background px-2 py-1 text-sm"
                  value={feedType}
                  onChange={(event) => setFeedType(event.target.value)}
                >
                  {["ACHIEVEMENT", "CONQUEST", "DEFENSE", "EXPANSION", "ECONOMY"].map((type) => (
                    <option key={type} value={type}>
                      {type.toLowerCase()}
                    </option>
                  ))}
                </select>
                <select
                  className="rounded border border-border bg-background px-2 py-1 text-sm"
                  value={feedVisibility}
                  onChange={(event) => setFeedVisibility(event.target.value as "PUBLIC" | "FRIENDS" | "PRIVATE")}
                >
                  {["PUBLIC", "FRIENDS", "PRIVATE"].map((option) => (
                    <option key={option} value={option}>
                      {option.toLowerCase()}
                    </option>
                  ))}
                </select>
                <Button size="sm" onClick={handleFeedPost} disabled={postingFeed}>
                  Publish
                </Button>
              </div>
            )}
          </div>
          {socialFeed.length === 0 ? (
            <Card>
              <CardContent className="p-4 text-sm text-muted-foreground">No broadcasts yet.</CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {socialFeed.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="uppercase tracking-wide">{entry.activityType.toLowerCase()}</span>
                      <span>{new Date(entry.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm">{entry.summary}</p>
                    {entry.actor && (
                      <p className="text-xs text-muted-foreground">
                        via{" "}
                        <Link href={`/players/${entry.actor.id}`} className="hover:underline">
                          {entry.actor.playerName}
                        </Link>
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function StatCard({ icon, title, value }: { icon: ReactNode; title: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1 p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase">
          {icon}
          {title}
        </div>
        <div className="text-2xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  )
}

function TerritoryMap({ villages }: { villages: TerritoryVillages }) {
  if (!villages || villages.length === 0) {
    return <div className="h-48 rounded-md border border-dashed border-border/60 flex items-center justify-center text-sm text-muted-foreground">No sightings</div>
  }

  const minX = Math.min(...villages.map((v) => v.x))
  const maxX = Math.max(...villages.map((v) => v.x))
  const minY = Math.min(...villages.map((v) => v.y))
  const maxY = Math.max(...villages.map((v) => v.y))
  const rangeX = Math.max(1, maxX - minX)
  const rangeY = Math.max(1, maxY - minY)

  return (
    <div className="relative h-48 w-full overflow-hidden rounded-lg border border-border/60 bg-muted/40">
      {villages.map((village) => {
        const left = ((village.x - minX) / rangeX) * 100
        const top = ((village.y - minY) / rangeY) * 100
        return (
          <div
            key={village.id}
            className={cn(
              "absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white shadow",
              village.isCapital ? "bg-amber-500" : "bg-sky-500",
            )}
            style={{ left: `${left}%`, top: `${top}%` }}
            title={`${village.name} (${village.x}|${village.y})`}
          />
        )
      })}
    </div>
  )
}

function countryFlag(code?: string | null) {
  if (!code) return "🏳️"
  const uppercase = code.toUpperCase()
  if (uppercase.length !== 2) return uppercase
  const OFFSET = 127397
  const chars = [...uppercase].map((char) => String.fromCodePoint(char.charCodeAt(0) + OFFSET))
  return chars.join("")
}

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Search, Trash2, RefreshCw, Eye, Users, Home, Target } from "lucide-react"

interface Village {
  id: string
  name: string
  x: number
  y: number
  population: number
  isDestroyed: boolean
  destroyedAt?: string
  player: {
    playerName: string
    id: string
  }
  buildings: Array<{
    type: string
    level: number
  }>
  destructionStats: {
    population: number
    maxPopulation: number
    canBeDestroyed: boolean
    destructionReason?: string
    isDestroyed: boolean
  }
}

interface VillageListResponse {
  villages: Village[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export function VillageDestructionManager() {
  const [villages, setVillages] = useState<Village[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "destroyed">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedVillage, setSelectedVillage] = useState<Village | null>(null)
  const [showDestroyDialog, setShowDestroyDialog] = useState(false)
  const [destroyReason, setDestroyReason] = useState("")
  const [actionLoading, setActionLoading] = useState(false)
  const { toast } = useToast()

  const loadVillages = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
        status: statusFilter,
        ...(searchTerm && { playerName: searchTerm })
      })

      const response = await fetch(`/api/admin/villages?${params}`)
      const data: VillageListResponse = await response.json()

      if (response.ok) {
        setVillages(data.villages)
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to load villages",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load villages",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadVillages()
  }, [currentPage, statusFilter, searchTerm])

  const handleDestroyVillage = async () => {
    if (!selectedVillage) return

    setActionLoading(true)
    try {
      const response = await fetch("/api/admin/villages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          villageId: selectedVillage.id,
          reason: destroyReason
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Village destroyed successfully"
        })
        setShowDestroyDialog(false)
        setSelectedVillage(null)
        setDestroyReason("")
        loadVillages()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to destroy village",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to destroy village",
        variant: "destructive"
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleRestoreVillage = async (villageId: string) => {
    setActionLoading(true)
    try {
      const response = await fetch(`/api/admin/villages/${villageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ restore: true })
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: "Success",
          description: "Village restored successfully"
        })
        loadVillages()
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to restore village",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to restore village",
        variant: "destructive"
      })
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusBadge = (village: Village) => {
    if (village.isDestroyed) {
      return <Badge variant="destructive">Destroyed</Badge>
    }
    if (village.destructionStats.population <= 0) {
      return <Badge variant="destructive">Zero Population</Badge>
    }
    return <Badge variant="default">Active</Badge>
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Village Destruction Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="search">Search by Player Name</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Enter player name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="status">Status Filter</Label>
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Villages</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="destroyed">Destroyed Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={loadVillages} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {villages.map((village) => (
                <Card key={village.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <h3 className="font-semibold">{village.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {village.player.playerName} • ({village.x}, {village.y})
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span className="text-sm">
                          {village.destructionStats.population}/{village.destructionStats.maxPopulation}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        <span className="text-sm">
                          {village.buildings.length} buildings
                        </span>
                      </div>
                      {getStatusBadge(village)}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedVillage(village)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Details
                      </Button>

                      {village.isDestroyed ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestoreVillage(village.id)}
                          disabled={actionLoading}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Restore
                        </Button>
                      ) : (
                        village.destructionStats.canBeDestroyed && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedVillage(village)
                              setShowDestroyDialog(true)
                            }}
                            disabled={actionLoading}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Destroy
                          </Button>
                        )
                      )}
                    </div>
                  </div>

                  {!village.destructionStats.canBeDestroyed && !village.isDestroyed && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Cannot destroy: {village.destructionStats.destructionReason}
                    </p>
                  )}
                </Card>
              ))}

              {villages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No villages found
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Destroy Village Dialog */}
      <AlertDialog open={showDestroyDialog} onOpenChange={setShowDestroyDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Destroy Village</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to destroy the village "{selectedVillage?.name}" owned by {selectedVillage?.player.playerName}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for destruction..."
                value={destroyReason}
                onChange={(e) => setDestroyReason(e.target.value)}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDestroyVillage}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Destroy Village
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

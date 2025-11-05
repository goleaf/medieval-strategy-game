"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Shield, Building2, Users, ChevronLeft, ChevronRight } from "lucide-react"

interface CrannyStats {
  id: string
  villageId: string
  villageName: string
  playerName: string
  tribe: string
  level: number
  capacity: number
  totalProtection: number
  createdAt: string
}

interface PaginationInfo {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export function CrannyManager() {
  const [crannies, setCrannies] = useState<CrannyStats[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [selectedCrannies, setSelectedCrannies] = useState<string[]>([])
  const [filters, setFilters] = useState({
    villageId: "",
    playerId: "",
    limit: 50,
    offset: 0
  })

  const [bulkUpdateDialog, setBulkUpdateDialog] = useState(false)
  const [bulkNewLevel, setBulkNewLevel] = useState(1)
  const [individualUpdateDialog, setIndividualUpdateDialog] = useState(false)
  const [selectedCranny, setSelectedCranny] = useState<CrannyStats | null>(null)
  const [individualNewLevel, setIndividualNewLevel] = useState(1)

  const { toast } = useToast()

  const fetchCrannies = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.villageId) params.set("villageId", filters.villageId)
      if (filters.playerId) params.set("playerId", filters.playerId)
      params.set("limit", filters.limit.toString())
      params.set("offset", filters.offset.toString())

      const response = await fetch(`/api/admin/cranny?${params}`)
      if (!response.ok) throw new Error("Failed to fetch crannies")

      const data = await response.json()
      setCrannies(data.crannies)
      setPagination(data.pagination)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load cranny data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCrannies()
  }, [filters])

  const updateCrannyLevel = async (buildingId: string, newLevel: number, isBulk = false) => {
    try {
      const response = await fetch("/api/admin/cranny", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buildingId, newLevel })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update cranny")
      }

      toast({
        title: "Success",
        description: `Cranny level updated to ${newLevel}`,
      })

      fetchCrannies()
      if (!isBulk) {
        setIndividualUpdateDialog(false)
        setSelectedCranny(null)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update cranny",
        variant: "destructive"
      })
    }
  }

  const bulkUpdateCrannies = async () => {
    if (selectedCrannies.length === 0) return

    setUpdating("bulk")
    try {
      const response = await fetch("/api/admin/cranny/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buildingIds: selectedCrannies,
          newLevel: bulkNewLevel
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to bulk update crannies")
      }

      const data = await response.json()
      toast({
        title: "Success",
        description: `Updated ${data.updatedBuildings.length} crannies to level ${bulkNewLevel}`,
      })

      setSelectedCrannies([])
      setBulkUpdateDialog(false)
      fetchCrannies()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to bulk update crannies",
        variant: "destructive"
      })
    } finally {
      setUpdating(null)
    }
  }

  const bulkDeleteCrannies = async () => {
    if (selectedCrannies.length === 0) return

    if (!confirm(`Are you sure you want to delete ${selectedCrannies.length} crannies?`)) return

    setUpdating("delete")
    try {
      const response = await fetch("/api/admin/cranny/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buildingIds: selectedCrannies })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete crannies")
      }

      toast({
        title: "Success",
        description: `Deleted ${selectedCrannies.length} crannies`,
      })

      setSelectedCrannies([])
      fetchCrannies()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete crannies",
        variant: "destructive"
      })
    } finally {
      setUpdating(null)
    }
  }

  const toggleCrannySelection = (crannyId: string) => {
    setSelectedCrannies(prev =>
      prev.includes(crannyId)
        ? prev.filter(id => id !== crannyId)
        : [...prev, crannyId]
    )
  }

  const selectAllCrannies = () => {
    setSelectedCrannies(crannies.map(c => c.id))
  }

  const clearSelection = () => {
    setSelectedCrannies([])
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Cranny Management
          </CardTitle>
          <CardDescription>
            Monitor and manage cranny buildings across all villages. Crannies protect resources from being looted during attacks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div>
              <Label htmlFor="villageId">Village ID</Label>
              <Input
                id="villageId"
                placeholder="Filter by village ID"
                value={filters.villageId}
                onChange={(e) => setFilters(prev => ({ ...prev, villageId: e.target.value, offset: 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="playerId">Player ID</Label>
              <Input
                id="playerId"
                placeholder="Filter by player ID"
                value={filters.playerId}
                onChange={(e) => setFilters(prev => ({ ...prev, playerId: e.target.value, offset: 0 }))}
              />
            </div>
            <div>
              <Label htmlFor="limit">Items per page</Label>
              <Select
                value={filters.limit.toString()}
                onValueChange={(value) => setFilters(prev => ({ ...prev, limit: parseInt(value), offset: 0 }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={() => setFilters(prev => ({ ...prev, offset: 0 }))}>
                Apply Filters
              </Button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedCrannies.length > 0 && (
            <div className="flex gap-2 mb-4 p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">
                {selectedCrannies.length} crann{selectedCrannies.length === 1 ? 'y' : 'ies'} selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={selectAllCrannies}
              >
                Select All
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={clearSelection}
              >
                Clear
              </Button>
              <Dialog open={bulkUpdateDialog} onOpenChange={setBulkUpdateDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">Bulk Update Level</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Bulk Update Cranny Levels</DialogTitle>
                    <DialogDescription>
                      Set the same level for {selectedCrannies.length} selected crann{selectedCrannies.length === 1 ? 'y' : 'ies'}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="bulk-level" className="text-right">
                        New Level
                      </Label>
                      <Input
                        id="bulk-level"
                        type="number"
                        min="0"
                        max="100"
                        value={bulkNewLevel}
                        onChange={(e) => setBulkNewLevel(parseInt(e.target.value) || 0)}
                        className="col-span-3"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={bulkUpdateCrannies}
                      disabled={updating === "bulk"}
                    >
                      {updating === "bulk" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Update {selectedCrannies.length} Crann{selectedCrannies.length === 1 ? 'y' : 'ies'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Button
                size="sm"
                variant="destructive"
                onClick={bulkDeleteCrannies}
                disabled={updating === "delete"}
              >
                {updating === "delete" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete Selected
              </Button>
            </div>
          )}

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={crannies.length > 0 && selectedCrannies.length === crannies.length}
                      onCheckedChange={(checked) => {
                        if (checked) selectAllCrannies()
                        else clearSelection()
                      }}
                    />
                  </TableHead>
                  <TableHead>Village</TableHead>
                  <TableHead>Player</TableHead>
                  <TableHead>Tribe</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Total Protection</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                      <p className="mt-2 text-muted-foreground">Loading crannies...</p>
                    </TableCell>
                  </TableRow>
                ) : crannies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Building2 className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="mt-2 text-muted-foreground">No crannies found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  crannies.map((cranny) => (
                    <TableRow key={cranny.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCrannies.includes(cranny.id)}
                          onCheckedChange={() => toggleCrannySelection(cranny.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{cranny.villageName}</TableCell>
                      <TableCell>{cranny.playerName}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{cranny.tribe}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={cranny.level > 5 ? "default" : "secondary"}>
                          {cranny.level}
                        </Badge>
                      </TableCell>
                      <TableCell>{cranny.capacity.toLocaleString()}</TableCell>
                      <TableCell className="font-mono">
                        {cranny.totalProtection.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Dialog open={individualUpdateDialog && selectedCranny?.id === cranny.id} onOpenChange={(open) => {
                          if (open) {
                            setSelectedCranny(cranny)
                            setIndividualNewLevel(cranny.level)
                            setIndividualUpdateDialog(true)
                          } else {
                            setIndividualUpdateDialog(false)
                            setSelectedCranny(null)
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Update Cranny Level</DialogTitle>
                              <DialogDescription>
                                Change the level of cranny in {cranny.villageName} owned by {cranny.playerName}.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="individual-level" className="text-right">
                                  New Level
                                </Label>
                                <Input
                                  id="individual-level"
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={individualNewLevel}
                                  onChange={(e) => setIndividualNewLevel(parseInt(e.target.value) || 0)}
                                  className="col-span-3"
                                />
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Current capacity: {cranny.capacity.toLocaleString()} per resource type
                                <br />
                                New capacity: {Math.floor(200 + (individualNewLevel - 1) * 200).toLocaleString()} per resource type
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                onClick={() => updateCrannyLevel(cranny.id, individualNewLevel)}
                                disabled={updating === cranny.id}
                              >
                                {updating === cranny.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Update Level
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination && pagination.total > pagination.limit && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {pagination.offset + 1}-{Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total} crannies
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }))}
                  disabled={pagination.offset === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters(prev => ({ ...prev, offset: prev.offset + prev.limit }))}
                  disabled={!pagination.hasMore}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

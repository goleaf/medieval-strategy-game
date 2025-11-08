"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Sparkles, ShieldCheck, Zap } from "lucide-react"
import type {
  TribalWarsPresetId,
  TribalWarsPresetSummary,
  TribalWarsSwitchboardRow
} from "@/lib/config/tribal-wars-presets"

interface TribalWarsPresetResponse {
  presets: Record<TribalWarsPresetId, TribalWarsPresetSummary>
  switchboard: TribalWarsSwitchboardRow[]
}

const PRESET_ORDER: TribalWarsPresetId[] = [
  "standard",
  "speedRound",
  "highPerformance",
  "classic",
  "casual"
]

export function TribalWarsWorldPresets() {
  // Hold the fetched preset metadata so the table and summary cards can reuse it.
  const [data, setData] = useState<TribalWarsPresetResponse | null>(null)
  // Track loading state to show friendly placeholders while the fetch runs.
  const [loading, setLoading] = useState(true)
  // Capture any network or auth errors and surface them in the UI.
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPresets = async () => {
      try {
        const response = await fetch("/api/admin/tribal-wars/world-presets")
        const payload = await response.json()

        if (!payload.success) {
          throw new Error(payload.error ?? "Failed to load presets")
        }

        setData(payload.data as TribalWarsPresetResponse)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        setLoading(false)
      }
    }

    // Kick off the fetch as soon as the component mounts.
    loadPresets()
  }, [])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading Tribal Wars presets…</CardTitle>
          <CardDescription>Fetching the curated switchboard from the admin API.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            The preset matrix and world summaries will appear once the request completes.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Unable to load presets</AlertTitle>
        <AlertDescription>
          {error ?? "The server did not return preset data. Please verify admin authentication."}
        </AlertDescription>
      </Alert>
    )
  }

  const orderedPresets = PRESET_ORDER.map(id => data.presets[id])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Tribal Wars Preset Summaries
          </CardTitle>
          <CardDescription>
            Use these quick takes to confirm the intent behind each world type before applying a template.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {orderedPresets.map(preset => (
              <Card key={preset.id} className="border-muted">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Badge variant="outline">{preset.name}</Badge>
                    <span>{preset.headline}</span>
                  </CardTitle>
                  <CardDescription>{preset.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-2 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Zap className="h-4 w-4" />
                    {preset.tempo}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4" />
                      Highlights
                    </h4>
                    <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                      {preset.highlights.map(highlight => (
                        <li key={highlight}>• {highlight}</li>
                      ))}
                    </ul>
                  </div>
                  {/* Visual divider so the highlights do not blend into the metadata lines. */}
                  <div className="h-px bg-border" role="presentation" />
                  <p className="text-sm">
                    <span className="font-semibold">Recommended for:</span> {preset.recommendedFor}
                  </p>
                  <p className="text-sm">
                    <span className="font-semibold">Victory flow:</span> {preset.victory}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Switchboard Checklist</CardTitle>
          <CardDescription>
            Tick the column that matches your launch plan—values mirror the ops one-pager exactly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Switch</TableHead>
                  {orderedPresets.map(preset => (
                    <TableHead key={preset.id}>{preset.name}</TableHead>
                  ))}
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.switchboard.map(row => (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium">{row.label}</TableCell>
                    {orderedPresets.map(preset => (
                      <TableCell key={`${row.key}-${preset.id}`}>{row.values[preset.id]}</TableCell>
                    ))}
                    <TableCell className="text-muted-foreground text-sm">{row.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

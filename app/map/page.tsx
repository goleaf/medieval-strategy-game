import { WorldMapExplorer } from "@/components/game/world-map/world-map"

export default function WorldMapPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8">
        <header className="space-y-1">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Strategic Intelligence</p>
          <h1 className="text-3xl font-semibold">World Map</h1>
          <p className="text-sm text-muted-foreground">
            Explore every continent, jump between regions, and inspect villages across the 1000×1000 grid.
          </p>
        </header>
        <WorldMapExplorer />
      </div>
    </main>
  )
}

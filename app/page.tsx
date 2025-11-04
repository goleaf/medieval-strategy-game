import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-3xl font-serif font-bold">⚔️ Medieval Strategy</h1>
          <nav className="flex gap-4">
            <Link href="/login">
              <Button variant="outline">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Join Now</Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="flex-1 max-w-7xl mx-auto w-full p-6">
        <div className="space-y-12">
          {/* Hero */}
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-serif font-bold text-balance">Command Your Kingdom. Conquer Your Enemies.</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Build villages, train armies, form alliances, and dominate the medieval world in this classic strategy
              game.
            </p>
            <Link href="/register">
              <Button size="lg" className="mt-4">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 space-y-4">
              <h3 className="text-xl font-bold">🏰 Build & Expand</h3>
              <p className="text-sm text-muted-foreground">
                Construct buildings, produce resources, and expand your empire across the map.
              </p>
            </Card>
            <Card className="p-6 space-y-4">
              <h3 className="text-xl font-bold">⚡ Train Troops</h3>
              <p className="text-sm text-muted-foreground">
                Recruit warriors, spearmen, cavalry, and siege weapons to build your military.
              </p>
            </Card>
            <Card className="p-6 space-y-4">
              <h3 className="text-xl font-bold">🛡️ Strategy</h3>
              <p className="text-sm text-muted-foreground">
                Master defense, timing, and diplomacy to become the most powerful player.
              </p>
            </Card>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="p-6 space-y-4">
              <h3 className="text-xl font-bold">📊 Trade</h3>
              <p className="text-sm text-muted-foreground">
                Buy and sell resources on the global marketplace to profit and prosper.
              </p>
            </Card>
            <Card className="p-6 space-y-4">
              <h3 className="text-xl font-bold">👥 Tribes</h3>
              <p className="text-sm text-muted-foreground">
                Join or create tribes to collaborate with other players for mutual protection.
              </p>
            </Card>
            <Card className="p-6 space-y-4">
              <h3 className="text-xl font-bold">⚔️ Conquest</h3>
              <p className="text-sm text-muted-foreground">
                Attack enemies, raid villages, and claim dominion over the realm.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <footer className="border-t border-border p-6 bg-secondary">
        <div className="max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          <p>Medieval Strategy Game • Built with Next.js</p>
        </div>
      </footer>
    </main>
  )
}

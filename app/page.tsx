import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <h1 className="text-2xl font-bold">Medieval Strategy</h1>
          <nav className="flex gap-2">
            <Link href="/login">
              <Button variant="outline">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Join Now</Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="flex-1 max-w-4xl mx-auto w-full p-4">
        <div className="space-y-8">
          {/* Hero */}
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold">Command Your Kingdom. Conquer Your Enemies.</h2>
            <p className="text-muted-foreground">
              Build villages, train armies, form alliances, and dominate the medieval world in this classic strategy
              game.
            </p>
            <Link href="/register">
              <Button size="lg" className="mt-4">
                Get Started
              </Button>
            </Link>
          </div>

          {/* Features Table */}
          <section>
            <h2 className="text-xl font-bold mb-2">Features</h2>
            <table className="w-full border-collapse border border-border">
              <tbody>
                <tr>
                  <td className="border border-border p-2 font-bold">Build & Expand</td>
                  <td className="border border-border p-2">
                    Construct buildings, produce resources, and expand your empire across the map.
                  </td>
                </tr>
                <tr>
                  <td className="border border-border p-2 font-bold">Train Troops</td>
                  <td className="border border-border p-2">
                    Recruit warriors, spearmen, cavalry, and siege weapons to build your military.
                  </td>
                </tr>
                <tr>
                  <td className="border border-border p-2 font-bold">Strategy</td>
                  <td className="border border-border p-2">
                    Master defense, timing, and diplomacy to become the most powerful player.
                  </td>
                </tr>
                <tr>
                  <td className="border border-border p-2 font-bold">Trade</td>
                  <td className="border border-border p-2">
                    Buy and sell resources on the global marketplace to profit and prosper.
                  </td>
                </tr>
                <tr>
                  <td className="border border-border p-2 font-bold">Tribes</td>
                  <td className="border border-border p-2">
                    Join or create tribes to collaborate with other players for mutual protection.
                  </td>
                </tr>
                <tr>
                  <td className="border border-border p-2 font-bold">Conquest</td>
                  <td className="border border-border p-2">
                    Attack enemies, raid villages, and claim dominion over the realm.
                  </td>
                </tr>
              </tbody>
            </table>
          </section>
        </div>
      </section>

      <footer className="border-t border-border p-4 bg-secondary">
        <div className="max-w-4xl mx-auto text-center text-sm text-muted-foreground">
          <p>Medieval Strategy Game • Built with Next.js</p>
        </div>
      </footer>
    </main>
  )
}

import type { Metadata } from "next"
import Link from "next/link"

type RuleSection = {
  title: string
  description: string
  bullets: string[]
}

const lastUpdated = "April 2, 2025"

const principles = [
  {
    title: "Fair competition",
    description: "One player, one account per world. Every advantage must be earned through gameplay, not shortcuts.",
  },
  {
    title: "Respect & safety",
    description: "Treat every player, tribe, and moderator with respect. Disagreement is fine—harassment is not.",
  },
  {
    title: "Transparency",
    description: "If you are unsure whether something is allowed, ask support before you act. Honesty counts.",
  },
]

const sections: RuleSection[] = [
  {
    title: "1. Accounts & identity",
    description: "Your account represents you in each world. Keep it secure and authentic.",
    bullets: [
      "Only one active account per player per world. Creating secondary accounts or “farms” for extra resources leads to removal.",
      "Account sharing is limited to in-game sitter or dual features. Do not give passwords or transfer ownership without staff approval.",
      "Buying, selling, or trading accounts, villages, or premium currency outside of the official store is prohibited.",
    ],
  },
  {
    title: "2. Automation, scripts & exploits",
    description: "Medieval Strategy is meant to be played by humans, not bots.",
    bullets: [
      "No macros, browser automation, packet manipulation, or third-party tools that send actions on your behalf.",
      "Do not modify the client, inject scripts, or intercept network traffic to reveal hidden information.",
      "If you encounter a bug or exploit, report it via the Support Center instead of abusing it for advantage.",
    ],
  },
  {
    title: "3. Combat etiquette & protection",
    description: "Aggression is part of the game, but basic protections keep worlds healthy.",
    bullets: [
      "Beginner protection, sitter shields, and ceasefires announced by staff are mandatory. Attacks sent in violation will be reverted and may trigger suspensions.",
      "Coordinated attacks are welcome, but spoofing reports or sharing false moderator messages is considered deception and will be punished.",
      "You may scout and raid barbarian villages freely, but farming weaker players with alternate accounts is treated as pushing.",
    ],
  },
  {
    title: "4. Economy, gifting & trades",
    description: "The marketplace should reflect honest supply and demand.",
    bullets: [
      "Resource transfers must be tied to genuine cooperation. Pushing resources to benefit another account without receiving comparable value is not permitted.",
      "Market ratios above 3:1 must be negotiated openly and cannot be used to funnel resources to alts.",
      "Only use in-game systems for gifting or prize payouts. External promises (cash, gift cards, etc.) are never enforceable and are grounds for bans.",
    ],
  },
  {
    title: "5. Communication & conduct",
    description: "Keep public chat, tribe forums, and DMs safe for everyone.",
    bullets: [
      "No hate speech, targeted harassment, sexual content involving minors, doxxing, or threats of real-world violence.",
      "Keep spam and advertising out of public channels. Automated propaganda messages are treated like botting.",
      "Moderator decisions should be discussed respectfully. Abusive appeals or impersonating staff escalates penalties.",
    ],
  },
  {
    title: "6. Tribes, sitters & collaboration",
    description: "Working together is powerful—use the provided tools responsibly.",
    bullets: [
      "Sitter slots are for trusted allies. A sitter must act in the account owner’s best interests and follow these rules exactly.",
      "Dual accounts must be registered with support so we can see a clear audit trail of who is responsible for actions.",
      "When a tribe merges or splits, leadership must inform support before transferring ownership of shared infrastructure or treasury resources.",
    ],
  },
]

const prohibited = [
  {
    title: "Account sharing (outside sitter/dual)",
    examples: [
      "Giving your password to a friend to run attacks overnight",
      "Maintaining two accounts on the same world to feed resources",
    ],
  },
  {
    title: "Bug exploitation",
    examples: [
      "Duplicating resources via desyncs or reload tricks",
      "Triggering unintended instant completions",
    ],
  },
  {
    title: "Scripting / automation",
    examples: [
      "Auto-raiding using external scripts or extensions",
      "Automated message spam or scouting bots",
    ],
  },
  {
    title: "Real money trading (RMT)",
    examples: [
      "Selling resources or villages for cash or gift cards",
      "Buying ranked accounts or alliance spots",
    ],
  },
  {
    title: "Harassment / bullying",
    examples: [
      "Threatening or targeted hate speech in DMs or tribe chat",
      "Doxxing or posting personal information",
    ],
  },
  {
    title: "Cheating tools",
    examples: [
      "Modified clients revealing map intel beyond fog of war",
      "Packet manipulation and map hacks",
    ],
  },
  {
    title: "Coordinated rule breaking",
    examples: [
      "Tribe-wide pushing rings funneling resources to a single account",
      "Organized bug abuse to manipulate leaderboards",
    ],
  },
]

const enforcementSteps = [
  {
    label: "Reminder",
    detail: "Minor or first-time infractions receive an in-game message outlining the issue and how to correct it.",
  },
  {
    label: "Restriction",
    detail: "Repeat or deliberate violations lead to temporary attack/market restrictions, sitter lockouts, or timed suspensions.",
  },
  {
    label: "Removal",
    detail: "Severe abuse, automation, or refusal to comply results in permanent bans, world resets, or account deletion across all shards.",
  },
]

export const metadata: Metadata = {
  title: "Game Rules | Medieval Strategy",
  description: "Review the fair-play policies that keep every Medieval Strategy world competitive and respectful.",
}

export default function RulesPage() {
  return (
    <main className="bg-gradient-to-b from-background via-background to-muted/20 text-foreground">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-12">
        <header className="text-center space-y-4">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Community Guidelines</p>
          <h1 className="text-4xl font-bold tracking-tight">Medieval Strategy Game Rules</h1>
          <p className="text-muted-foreground max-w-3xl mx-auto">
            These rules keep the realms fair, competitive, and welcoming. By playing you agree to follow them in addition to the
            Terms of Service and Privacy Policy.
          </p>
          <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {principles.map((principle) => (
            <article
              key={principle.title}
              className="rounded-2xl border border-border bg-card/60 p-6 shadow-sm backdrop-blur-sm"
            >
              <h2 className="text-lg font-semibold">{principle.title}</h2>
              <p className="text-sm text-muted-foreground mt-2">{principle.description}</p>
            </article>
          ))}
        </section>

        <div className="space-y-8">
          {sections.map((section) => (
            <section key={section.title} className="rounded-3xl border border-border bg-card/80 p-8 shadow-lg space-y-4">
              <div className="space-y-2">
                <h2 className="text-2xl font-semibold">{section.title}</h2>
                <p className="text-muted-foreground">{section.description}</p>
              </div>
              <ul className="space-y-3 text-muted-foreground">
                {section.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3">
                    <span className="mt-1 h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="rounded-3xl border border-border bg-card/80 p-8 shadow-lg space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Prohibited actions</h2>
            <p className="text-muted-foreground">These are never allowed. Violations may lead to suspensions or permanent bans.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {prohibited.map((item) => (
              <article key={item.title} className="rounded-2xl border border-border bg-background/60 p-4 space-y-2">
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                  {item.examples.map((ex) => (
                    <li key={ex}>{ex}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card/80 p-8 shadow-lg space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Enforcement ladder</h2>
            <p className="text-muted-foreground">
              Penalties scale with intent, history, and severity. Staff may skip steps when the integrity of the world is at risk.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {enforcementSteps.map((step) => (
              <article key={step.label} className="rounded-2xl border border-border bg-background/60 p-4 space-y-2">
                <h3 className="text-lg font-semibold">{step.label}</h3>
                <p className="text-sm text-muted-foreground">{step.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card/80 p-8 shadow-lg space-y-4">
          <h2 className="text-2xl font-semibold">Reporting & appeals</h2>
          <p className="text-muted-foreground">
            Use the in-game <Link href="/reports" className="text-primary underline">Reports</Link> tool to flag suspicious activity or harassment. Include
            timestamps, screenshots, and message links whenever possible so moderators can act quickly.
          </p>
          <p className="text-muted-foreground">
            If you believe a penalty was issued in error, reply to the enforcement ticket or email{" "}
            <a href="mailto:support@medievalstrategy.game" className="text-primary underline">
              support@medievalstrategy.game
            </a>{" "}
            within seven days. Appeals should explain what happened, who was involved, and what steps you have taken to prevent a
            repeat offense.
          </p>
        </section>
      </div>
    </main>
  )
}

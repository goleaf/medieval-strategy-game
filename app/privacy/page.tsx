import type { Metadata } from "next"

const lastUpdated = "March 10, 2025"

type Section = {
  title: string
  description: string
  items?: string[]
}

const sections: Section[] = [
  {
    title: "1. Data we collect",
    description:
      "We only gather the information required to operate Medieval Strategy Game, keep the world fair, and improve upcoming features.",
    items: [
      "Account data such as your player name, email address, linked tribes, sitter relationships, and hashed authentication credentials.",
      "Gameplay records including villages, construction queues, resource balances, market orders, battle logs, and in-game messages that enable moderation and dispute resolution.",
      "Device and log data (IP address, browser metadata, crash traces, and session identifiers) used to secure accounts, diagnose issues, and prevent automation.",
    ],
  },
  {
    title: "2. How we use your data",
    description: "Every data point has a purpose tied to delivering or supporting the game experience.",
    items: [
      "Provide and maintain gameplay systems such as login, hero progression, map state, leaderboards, and support tickets.",
      "Detect abuse, enforce community rules, and investigate fraud or harassment reports initiated by players or moderators.",
      "Analyze aggregated engagement and performance metrics to balance tribes, fine‑tune world settings, and plan content updates.",
      "Send transactional communications (account notices, downtime alerts, legal updates) and respond to questions you send us.",
    ],
  },
  {
    title: "3. When we share data",
    description: "We do not sell player data. Limited sharing occurs only with parties who help us run the service.",
    items: [
      "Infrastructure and analytics vendors that host the game servers, email delivery, or crash monitoring under confidentiality obligations.",
      "Other players, but only for information you intentionally publish in your profile, tribe listings, or global rankings.",
      "Law enforcement or regulators if a valid legal request requires it or when disclosure is necessary to protect players from harm.",
    ],
  },
  {
    title: "4. Player controls & rights",
    description: "Regardless of where you play from, we extend the following privacy controls.",
    items: [
      "Review or update core profile details in the in-game Settings page; changes take effect immediately across your account.",
      "Request a copy of your data or ask for deletion by emailing support@medievalstrategy.game from the address tied to the account.",
      "Adjust notification preferences and mute non-essential announcements inside the messaging center.",
      "Limit analytics cookies or block optional tracking through your browser — we honor Do Not Track signals where supported.",
    ],
  },
  {
    title: "5. Retention & security",
    description: "We keep information only as long as it is needed for the reasons listed above.",
    items: [
      "Active player data stays on record while your account exists; dormant accounts are purged after 18 months unless a dispute is open.",
      "Combat and trade logs needed for anti-cheat reviews are archived for up to 12 months, then anonymized for statistical use.",
      "Authentication secrets are encrypted, all traffic is served over TLS, and access to production tools is limited to audited staff.",
    ],
  },
  {
    title: "6. Children & sensitive information",
    description:
      "The game is intended for players who are at least 13 years old. We do not intentionally collect sensitive personal data. If we learn a younger child has created an account, the profile will be removed and guardians may contact us to ensure deletion.",
  },
]

export const metadata: Metadata = {
  title: "Privacy Policy | Medieval Strategy Game",
  description: "Learn how Medieval Strategy Game collects, stores, and protects player data.",
}

export default function PrivacyPage() {
  return (
    <main className="bg-background text-foreground min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">
        <header className="space-y-4 text-center">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Privacy Policy</p>
          <h1 className="text-3xl sm:text-4xl font-bold">Your realm, your data.</h1>
          <p className="text-muted-foreground">
            We are committed to keeping your account, villages, and conversations private. This page explains what we collect,
            why we need it, and how you stay in control.
          </p>
          <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
        </header>

        <section className="rounded-lg border border-border bg-card/30 p-6 space-y-3">
          <h2 className="text-xl font-semibold">Our privacy principles</h2>
          <p className="text-muted-foreground">
            We operate on four simple rules: collect the minimum data needed to run the world, never sell personal information,
            give players clear choices, and respond quickly when you need help. These principles guide every feature we ship.
          </p>
        </section>

        <div className="space-y-6">
          {sections.map((section) => (
            <section key={section.title} className="rounded-lg border border-border bg-card/30 p-6 space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{section.title}</h2>
                <p className="text-muted-foreground">{section.description}</p>
              </div>
              {section.items && (
                <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <section className="rounded-lg border border-border bg-card/30 p-6 space-y-4">
          <h2 className="text-xl font-semibold">Questions or requests</h2>
          <p className="text-muted-foreground">
            Contact us anytime at{" "}
            <a href="mailto:support@medievalstrategy.game" className="text-primary underline">
              support@medievalstrategy.game
            </a>{" "}
            if you want to access, correct, transfer, or delete your data. Please include your player name and the world you
            play on so we can respond quickly.
          </p>
          <p className="text-muted-foreground">
            We may update this policy as features evolve. When that happens we will post the new date above and announce the
            change in-game before it takes effect.
          </p>
        </section>
      </div>
    </main>
  )
}

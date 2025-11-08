import type { Metadata } from "next"

const lastUpdated = "March 15, 2025"

type SupportChannel = {
  title: string
  description: string
  details: string[]
}

const supportChannels: SupportChannel[] = [
  {
    title: "Player Support Inbox",
    description: "For account help, billing issues, sitter disputes, and world-specific questions.",
    details: [
      "Email support@medievalstrategy.game from the address linked to your account.",
      "Include player name, world, and a summary of what happened so we can authenticate faster.",
      "Typical reply time: under 6 business hours.",
    ],
  },
  {
    title: "In-game Reports",
    description: "Use the Reports → Support tab to flag harassment, cheating, or stuck queues.",
    details: [
      "Attach screenshots or combat logs so moderators can reproduce the issue.",
      "Urgent violations (botting, hate speech) are prioritized ahead of gameplay questions.",
    ],
  },
  {
    title: "Status Updates",
    description: "Downtime notices and maintenance schedules are posted here first.",
    details: [
      "Check the Dashboard banner or @MedievalStrategyGame on social for outage updates.",
      "If the servers are down, you do not need to open a ticket—we automatically credit lost uptime.",
    ],
  },
]

const quickFixes = [
  "Refresh your session: log out, clear cookies for medievalstrategy.game, then sign back in.",
  "Verify the game world is started in Settings → Game Worlds; closed worlds lock certain actions.",
  "Inspect your resource and construction queues—many “stuck building” reports are full queues.",
  "Confirm sitter permissions; limited roles cannot send troops or spend hero points.",
]

const escalationGuidelines = [
  {
    title: "Security incidents",
    copy:
      "If you suspect account compromise, change your password immediately and email us with the subject “Security” so we can suspend logins until you confirm ownership.",
  },
  {
    title: "Payment problems",
    copy:
      "Send the transaction ID, store, and timestamp. We only process refunds that comply with the store policy and the world economy rules.",
  },
  {
    title: "Abuse or harassment",
    copy:
      "Provide chat links or message IDs. Silence, bans, or report escalations are handled by a separate moderation queue with 24/7 coverage.",
  },
]

const faqs = [
  {
    question: "When will I hear back?",
    answer:
      "Most tickets receive a first response within 6 business hours. Complex investigations (bans, rollbacks, payment disputes) can take up to 48 hours while we review logs.",
  },
  {
    question: "What information should my ticket include?",
    answer:
      "Always list your player name, world, time of incident, and any steps that reproduce the bug. Screenshots, combat IDs, or JSON payloads accelerate engineering follow-up.",
  },
  {
    question: "Can I talk to someone live?",
    answer:
      "During wartime events we host staffed Discord office hours. Outside of those windows, email is the fastest channel because it keeps logs tied to your account history.",
  },
]

export const metadata: Metadata = {
  title: "Support | Medieval Strategy Game",
  description: "Get help with account issues, bug reports, or gameplay questions.",
}

export default function SupportPage() {
  return (
    <main className="bg-background text-foreground min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">
        <header className="space-y-4 text-center">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Support Center</p>
          <h1 className="text-3xl sm:text-4xl font-bold">We are here for your realm.</h1>
          <p className="text-muted-foreground">
            Whether you are dealing with a missing village, suspicious activity, or a simple question about crop balance, our
            team responds quickly so you can get back to conquering.
          </p>
          <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
        </header>

        <section className="rounded-lg border border-border bg-card/30 p-6 space-y-4">
          <h2 className="text-xl font-semibold">Before you reach out</h2>
          <p className="text-muted-foreground">
            These steps resolve the majority of reports without waiting for a ticket reply. Feel free to skip them if your
            issue is urgent or involves account security.
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            {quickFixes.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        </section>

        <div className="space-y-6">
          {supportChannels.map((channel) => (
            <section key={channel.title} className="rounded-lg border border-border bg-card/30 p-6 space-y-4">
              <div>
                <h2 className="text-xl font-semibold">{channel.title}</h2>
                <p className="text-muted-foreground">{channel.description}</p>
              </div>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                {channel.details.map((detail) => (
                  <li key={detail}>{detail}</li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <section className="rounded-lg border border-border bg-card/30 p-6 space-y-4">
          <h2 className="text-xl font-semibold">Escalation guidelines</h2>
          <p className="text-muted-foreground">
            Some issues jump the queue so we can protect the wider community. Flag them clearly in your subject line.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {escalationGuidelines.map((item) => (
              <article key={item.title} className="rounded-md border border-border bg-background/60 p-4 space-y-2">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.copy}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card/30 p-6 space-y-4">
          <h2 className="text-xl font-semibold">Submit a ticket</h2>
          <p className="text-muted-foreground">
            Email{" "}
            <a href="mailto:support@medievalstrategy.game" className="text-primary underline">
              support@medievalstrategy.game
            </a>{" "}
            with the subject line that best matches your request:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            <li>
              <span className="font-medium">[Security]</span> Account access, suspected hijacking, or password resets.
            </li>
            <li>
              <span className="font-medium">[Gameplay]</span> Bugs, troop discrepancies, map issues, or quest blockers.
            </li>
            <li>
              <span className="font-medium">[Payments]</span> Purchase validation, missing currency, or refund requests.
            </li>
            <li>
              <span className="font-medium">[Moderation]</span> Report harassment, cheating, or appeal an action.
            </li>
          </ul>
          <p className="text-muted-foreground">
            We will confirm receipt automatically and follow up if we need logs or permission to access your account.
          </p>
        </section>

        <section className="rounded-lg border border-border bg-card/30 p-6 space-y-4">
          <h2 className="text-xl font-semibold">Frequently asked questions</h2>
          <div className="space-y-4">
            {faqs.map((item) => (
              <article key={item.question} className="space-y-1">
                <h3 className="font-semibold">{item.question}</h3>
                <p className="text-muted-foreground">{item.answer}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

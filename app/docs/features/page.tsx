import type { Metadata } from "next"
import type { LucideIcon } from "lucide-react"
import { BookOpen, FileText, Layers, ListChecks } from "lucide-react"

import { getFeatureDocs } from "@/lib/docs/features"
import { MarkdownRenderer } from "@/components/docs/markdown-renderer"

const formatter = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "numeric",
})

export const metadata: Metadata = {
  title: "Game Features Documentation | Medieval Strategy Game",
  description: "Authoritative documentation for every major gameplay system, including protection, combat, tasks, tribes, and more.",
}

export default async function FeaturesDocsPage() {
  const docs = await getFeatureDocs()

  if (!docs.length) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <h1 className="text-3xl font-semibold text-foreground">Features documentation missing</h1>
        <p className="mt-4 text-muted-foreground">
          No markdown files were found in <code className="rounded bg-muted px-2 py-1">/docs/features</code>. Add feature guides to make this page useful.
        </p>
      </div>
    )
  }

  const totalWords = docs.reduce((sum, doc) => sum + doc.wordCount, 0)
  const totalSections = docs.reduce((sum, doc) => sum + doc.headings.length, 0)
  const lastUpdated = docs.reduce((latest, doc) => (doc.lastUpdated > latest ? doc.lastUpdated : latest), docs[0]?.lastUpdated)

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-12">
      <header className="space-y-6 rounded-2xl border border-border bg-card/80 p-8 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-sm uppercase tracking-[0.3em] text-primary">Documentation</p>
            <h1 className="text-4xl font-serif text-foreground">Game Features Knowledge Base</h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Everything players, moderators, and designers need to know about how the Medieval Strategy Game works under the hood.
              Each section below mirrors its markdown source and stays in sync automatically.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-5 py-3 text-primary">
            <BookOpen className="h-6 w-6" aria-hidden="true" />
            <div>
              <p className="text-sm uppercase tracking-wide">Features covered</p>
              <p className="text-2xl font-semibold text-foreground">{docs.length}</p>
            </div>
          </div>
        </div>

        <dl className="grid gap-4 rounded-xl border border-border/80 bg-muted/30 p-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatBlock label="Word count" value={totalWords.toLocaleString()} Icon={FileText} />
          <StatBlock label="Deep-dive sections" value={totalSections.toString()} Icon={Layers} />
          <StatBlock label="Latest update" value={formatter.format(new Date(lastUpdated))} Icon={ListChecks} />
          <StatBlock label="Source directory" value="/docs/features" Icon={BookOpen} />
        </dl>
      </header>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Feature index</h2>
          <p className="text-muted-foreground">Jump to any system spec. Each entry links directly to the rendered markdown further below.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {docs.map(doc => (
            <a
              key={doc.slug}
              href={`#${doc.slug}`}
              className="group rounded-xl border border-border bg-card/70 p-4 transition hover:border-primary hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-lg font-semibold text-foreground">{doc.title}</p>
                <span className="text-xs uppercase tracking-wide text-primary/80">{doc.headings.length} sections</span>
              </div>
              <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{doc.summary}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>{doc.wordCount.toLocaleString()} words</span>
                <span>Updated {formatter.format(new Date(doc.lastUpdated))}</span>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="space-y-10">
        {docs.map(doc => (
          <article
            key={doc.slug}
            id={doc.slug}
            className="scroll-mt-24 rounded-2xl border border-border bg-card p-8 shadow-sm"
          >
            <header className="space-y-4 border-b border-border/70 pb-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-baseline lg:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-primary">Feature</p>
                  <h2 className="text-3xl font-serif text-foreground">{doc.title}</h2>
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span>Last updated {formatter.format(new Date(doc.lastUpdated))}</span>
                  <span>Approx. {doc.wordCount.toLocaleString()} words</span>
                  <span>{doc.headings.length} subsections</span>
                  <a
                    href={`/docs/features/${doc.slug}`}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Open dedicated page →
                  </a>
                </div>
              </div>

              {doc.headings.length > 0 && (
                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">Coverage</p>
                  <ul className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
                    {doc.headings.map(heading => (
                      <li key={heading} className="rounded-full border border-border px-3 py-1">
                        {heading}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </header>

            <div className="mt-6">
              <MarkdownRenderer content={doc.content} />
            </div>
          </article>
        ))}
      </section>
    </div>
  )
}

interface StatBlockProps {
  label: string
  value: string
  Icon: LucideIcon
}

function StatBlock({ label, value, Icon }: StatBlockProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border/60 bg-card/40 p-4">
      <div className="rounded-full bg-primary/10 p-3 text-primary">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold text-foreground">{value}</p>
      </div>
    </div>
  )
}

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { MarkdownRenderer } from "@/components/docs/markdown-renderer"
import { getFeatureDoc, getFeatureDocSlugs } from "@/lib/docs/features"

const formatter = new Intl.DateTimeFormat("en", {
  year: "numeric",
  month: "short",
  day: "numeric",
})

export async function generateStaticParams() {
  const slugs = await getFeatureDocSlugs()
  return slugs.map(slug => ({ slug }))
}

interface FeatureDocPageProps {
  params: {
    slug: string
  }
}

export async function generateMetadata({ params }: FeatureDocPageProps): Promise<Metadata> {
  const { slug } = params
  const doc = await getFeatureDoc(slug)

  if (!doc) {
    return {
      title: "Feature not found | Medieval Strategy Game",
    }
  }

  return {
    title: `${doc.title} | Game Features Documentation`,
    description: doc.summary,
  }
}

export default async function FeatureDocPage({ params }: FeatureDocPageProps) {
  const { slug } = params
  const doc = await getFeatureDoc(slug)

  if (!doc) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-12">
      <div className="flex flex-col gap-4">
        <Link
          href={`/docs/features#${doc.slug}`}
          className="flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All features
        </Link>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.4em] text-primary">Feature documentation</p>
          <h1 className="text-4xl font-serif text-foreground">{doc.title}</h1>
          <p className="text-muted-foreground">{doc.summary}</p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>Updated {formatter.format(new Date(doc.lastUpdated))}</span>
          <span>{doc.wordCount.toLocaleString()} words</span>
          <span>{doc.headings.length} sections</span>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <MarkdownRenderer content={doc.content} />
      </div>
    </div>
  )
}

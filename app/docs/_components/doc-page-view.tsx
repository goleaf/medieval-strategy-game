import Link from "next/link"
import { notFound } from "next/navigation"
import { FileText, Folder, ExternalLink } from "lucide-react"

import { getDocPageData } from "@/lib/docs"
import { MarkdownContent } from "@/components/markdown-content"

type DocPageViewProps = {
  slug: string[]
}

export async function DocPageView({ slug }: DocPageViewProps) {
  const doc = getDocPageData(slug)

  if (!doc) {
    notFound()
  }

  const currentHref = doc.slug.length ? `/docs/${doc.slug.join("/")}` : "/docs"

  return (
    <div className="space-y-10">
      <header className="space-y-3 border-b border-dashed border-border/70 pb-6">
        <nav className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {doc.breadcrumbs.map((crumb, index) => (
            <span key={crumb.href} className="flex items-center gap-2">
              {index > 0 && <span className="text-border">/</span>}
              {index === doc.breadcrumbs.length - 1 ? (
                <span className="font-medium text-foreground">{crumb.label}</span>
              ) : (
                <Link href={crumb.href} className="hover:text-foreground">
                  {crumb.label}
                </Link>
              )}
            </span>
          ))}
        </nav>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Medieval Strategy Docs</p>
          <h1 className="text-3xl font-serif font-semibold tracking-tight">{doc.title}</h1>
          {doc.description && <p className="mt-2 text-muted-foreground">{doc.description}</p>}
        </div>
      </header>

      {doc.content ? (
        <MarkdownContent content={doc.content} />
      ) : (
        <div className="rounded-xl border border-dashed border-border/70 bg-muted/40 p-6 text-sm text-muted-foreground">
          Documentation for this section is being written. Check back soon or contribute by updating the markdown file in
          the <code className="mx-1 rounded bg-muted px-1.5 py-0.5">/docs</code> folder.
        </div>
      )}

      {doc.siblings.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">In This Section</h2>
            <p className="text-sm text-muted-foreground">
              Explore related topics and sub-guides within the {doc.title} section.
            </p>
          </div>
          <div className="grid gap-3">
            {doc.siblings.map((item) => {
              const isActive = item.href === currentHref
              const Icon = item.type === "directory" ? Folder : FileText

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center justify-between rounded-xl border px-4 py-3 transition ${
                    isActive
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border/70 bg-card hover:border-primary/40 hover:bg-muted/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-full p-2 ${
                        isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}

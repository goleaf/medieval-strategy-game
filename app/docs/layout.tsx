import type { ReactNode } from "react"
import Link from "next/link"

import { getDocsSidebarSections } from "@/lib/docs"

export default async function DocsLayout({ children }: { children: ReactNode }) {
  const sections = getDocsSidebarSections()

  return (
    <div className="w-full bg-muted/30">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-10 lg:flex-row">
        <aside className="lg:w-72">
          <div className="rounded-xl border border-border bg-card/80 p-4 shadow-sm">
            <div className="mb-6">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Guides</p>
              <h2 className="text-xl font-semibold">Documentation</h2>
              <p className="text-sm text-muted-foreground">
                Browse admin guides, API references, and feature documentation.
              </p>
            </div>

            <nav className="space-y-6">
              {sections.map((section) => (
                <div key={section.title}>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{section.title}</p>
                  <ul className="mt-3 space-y-2">
                    {section.items.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
                        >
                          <span className="h-2 w-2 rounded-full bg-primary/50" />
                          <span>{item.title}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
        </aside>

        <section className="flex-1 rounded-2xl border border-border bg-card/90 p-6 shadow-sm lg:p-10">
          {children}
        </section>
      </div>
    </div>
  )
}

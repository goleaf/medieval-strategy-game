import fs from "fs"
import path from "path"

const DOCS_ROOT = path.join(process.cwd(), "docs")
const INDEX_FILES = ["readme.md", "README.md", "index.md", "Index.md"]

export type DocEntryType = "file" | "directory"

export interface DocsSidebarSection {
  title: string
  href: string
  items: DocsSidebarItem[]
}

export interface DocsSidebarItem {
  title: string
  href: string
  type: DocEntryType
}

export interface DocPageData {
  type: DocEntryType
  title: string
  slug: string[]
  content?: string
  breadcrumbs: Array<{ label: string; href: string }>
  siblings: DirectoryItem[]
  description?: string
}

export interface DirectoryItem {
  title: string
  href: string
  type: DocEntryType
  description?: string
}

const isValidDocsPath = (targetPath: string) => path.normalize(targetPath).startsWith(DOCS_ROOT)

const formatTitle = (value: string) => {
  const cleaned = value
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

  if (!cleaned) {
    return "Documentation"
  }

  return cleaned
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || value.toLowerCase()

const sanitizeSegments = (segments: string[]) =>
  (segments || [])
    .map((segment) => segment.replace(/[^a-zA-Z0-9-]+/g, "-").toLowerCase())
    .filter(Boolean)

const findIndexFile = (directoryPath: string) => {
  for (const fileName of INDEX_FILES) {
    const candidate = path.join(directoryPath, fileName)
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate
    }
  }
  return null
}

const listDirectoryItems = (directoryPath: string, parentSlug: string[]): DirectoryItem[] => {
  if (!isValidDocsPath(directoryPath) || !fs.existsSync(directoryPath)) {
    return []
  }

  const entries = fs
    .readdirSync(directoryPath, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith("."))

  const items: DirectoryItem[] = []

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const segment = slugify(entry.name)
      const slug = [...parentSlug, segment]

      items.push({
        title: formatTitle(entry.name),
        href: `/docs/${slug.join("/")}`,
        type: "directory",
      })
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      if (INDEX_FILES.includes(entry.name)) {
        continue
      }
      const segment = slugify(entry.name)
      const slug = [...parentSlug, segment]

      items.push({
        title: formatTitle(entry.name),
        href: `/docs/${slug.join("/")}`,
        type: "file",
      })
    }
  }

  return items.sort((a, b) => a.title.localeCompare(b.title))
}

const resolveSlugToPath = (slug: string[]): { type: DocEntryType; absolutePath: string } | null => {
  const normalizedSlug = sanitizeSegments(slug)

  if (normalizedSlug.length === 0) {
    return { type: "directory", absolutePath: DOCS_ROOT }
  }

  let currentDir = DOCS_ROOT

  for (let index = 0; index < normalizedSlug.length; index++) {
    const targetSegment = normalizedSlug[index]
    const entries = fs
      .readdirSync(currentDir, { withFileTypes: true })
      .filter((entry) => !entry.name.startsWith("."))

    const match = entries.find((entry) => {
      if (entry.isDirectory()) {
        return slugify(entry.name) === targetSegment
      }
      if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
        return slugify(entry.name) === targetSegment
      }
      return false
    })

    if (!match) {
      return null
    }

    const nextPath = path.join(currentDir, match.name)

    if (!isValidDocsPath(nextPath)) {
      return null
    }

    const isLast = index === normalizedSlug.length - 1

    if (match.isDirectory()) {
      if (isLast) {
        return { type: "directory", absolutePath: nextPath }
      }
      currentDir = nextPath
      continue
    }

    if (match.isFile() && match.name.toLowerCase().endsWith(".md") && isLast) {
      return { type: "file", absolutePath: nextPath }
    }

    return null
  }

  return null
}

const extractTitleFromContent = (content: string | undefined, fallback: string) => {
  if (!content) {
    return fallback
  }

  const headingMatch = content.match(/^#\s+(.+)$/m)
  if (headingMatch) {
    return headingMatch[1].trim()
  }

  return fallback
}

const buildBreadcrumbs = (slug: string[]) => {
  const breadcrumbs: Array<{ label: string; href: string }> = [{ label: "Documentation", href: "/docs" }]
  const segments: string[] = []

  slug.forEach((segment) => {
    segments.push(segment)
    breadcrumbs.push({
      label: formatTitle(segment),
      href: `/docs/${segments.join("/")}`,
    })
  })

  return breadcrumbs
}

export const getDocPageData = (rawSlug: string[]): DocPageData | null => {
  const slug = sanitizeSegments(rawSlug)
  const resolved = resolveSlugToPath(slug)

  if (!resolved) {
    return null
  }

  if (resolved.type === "file") {
    const content = fs.readFileSync(resolved.absolutePath, "utf8")
    const title = extractTitleFromContent(
      content,
      formatTitle(path.basename(resolved.absolutePath, path.extname(resolved.absolutePath))),
    )

    const parentDir = path.dirname(resolved.absolutePath)
    const parentSlug = slug.slice(0, -1)
    const siblings = listDirectoryItems(parentDir, parentSlug)

    return {
      type: "file",
      title,
      slug,
      content,
      breadcrumbs: buildBreadcrumbs(slug),
      siblings,
    }
  }

  const directoryContent = findIndexFile(resolved.absolutePath)
  const content = directoryContent ? fs.readFileSync(directoryContent, "utf8") : undefined

  const title =
    slug.length === 0
      ? "Documentation"
      : extractTitleFromContent(content, `${formatTitle(slug[slug.length - 1])}`)

  const siblings = listDirectoryItems(resolved.absolutePath, slug)

  return {
    type: "directory",
    title,
    slug,
    content,
    breadcrumbs: buildBreadcrumbs(slug),
    siblings,
    description: content ? undefined : "This section is still being documented.",
  }
}

export const getDocsSidebarSections = (): DocsSidebarSection[] => {
  const sections: DocsSidebarSection[] = []

  if (!fs.existsSync(DOCS_ROOT)) {
    return sections
  }

  const entries = fs
    .readdirSync(DOCS_ROOT, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith("."))
    .sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1
      if (!a.isDirectory() && b.isDirectory()) return 1
      return a.name.localeCompare(b.name)
    })

  const generalItems: DocsSidebarItem[] = []
  let hasRootOverview = false

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const segment = slugify(entry.name)
      const slug = segment ? [segment] : []
      const title = formatTitle(entry.name)
      const dirPath = path.join(DOCS_ROOT, entry.name)
      const hasIndex = !!findIndexFile(dirPath)
      const children = listDirectoryItems(dirPath, slug)

      sections.push({
        title,
        href: `/docs/${slug.join("/")}`,
        items: [
          {
            title: hasIndex ? "Overview" : "Browse",
            href: `/docs/${slug.join("/")}`,
            type: "directory",
          },
          ...children,
        ],
      })
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      if (INDEX_FILES.includes(entry.name)) {
        hasRootOverview = true
        continue
      }
      const segment = slugify(entry.name)
      generalItems.push({
        title: formatTitle(entry.name),
        href: `/docs/${segment}`,
        type: "file",
      })
    }
  }

  if (hasRootOverview || generalItems.length > 0) {
    sections.unshift({
      title: "General",
      href: "/docs",
      items: [
        ...(hasRootOverview
          ? [
              {
                title: "Welcome",
                href: "/docs",
                type: "directory",
              } as DocsSidebarItem,
            ]
          : []),
        ...generalItems,
      ],
    })
  }

  return sections
}

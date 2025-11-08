import fs from "fs"
import path from "path"

export type DocsEntry = DocsFileEntry | DocsDirectoryEntry

export interface DocsFileEntry {
  kind: "file"
  slug: string[]
  title: string
  content: string
  lastUpdated: string
}

export interface DocsDirectoryEntry {
  kind: "directory"
  slug: string[]
  title: string
  entries: DocsDirectoryItem[]
}

export interface DocsDirectoryItem {
  kind: "file" | "directory"
  slug: string[]
  title: string
  summary?: string
  lastUpdated?: string
}

const DOCS_ROOT = path.resolve(process.cwd(), "docs")

export function getDocsEntry(slug: string[] = []): DocsEntry | null {
  const safeSlug = sanitizeSlug(slug)

  const fileEntry = readDocFile(safeSlug)
  if (fileEntry) {
    return fileEntry
  }

  const dirEntry = readDocDirectory(safeSlug)
  if (dirEntry) {
    return dirEntry
  }

  return null
}

function readDocFile(slug: string[]): DocsFileEntry | null {
  const fileSegments =
    slug.length === 0
      ? ["README.md"]
      : [...slug.slice(0, -1), `${slug[slug.length - 1]}.md`]

  const filePath = resolveWithinDocs(...fileSegments)
  const stats = getStats(filePath)

  if (!stats?.isFile()) {
    return null
  }

  const content = fs.readFileSync(filePath, "utf8")
  const title = slug.length === 0
    ? "Documentation"
    : extractTitle(content, slug[slug.length - 1])

  return {
    kind: "file",
    slug,
    title,
    content,
    lastUpdated: stats.mtime.toISOString(),
  }
}

function readDocDirectory(slug: string[]): DocsDirectoryEntry | null {
  const dirPath = resolveWithinDocs(...slug)
  const stats = getStats(dirPath)

  if (!stats?.isDirectory()) {
    return null
  }

  const entries = buildDirectoryEntries(dirPath, slug)
  const title = slug.length === 0 ? "Documentation" : formatSegmentTitle(slug[slug.length - 1])

  return {
    kind: "directory",
    slug,
    title,
    entries,
  }
}

function buildDirectoryEntries(dirPath: string, slug: string[]): DocsDirectoryItem[] {
  const dirents = fs.readdirSync(dirPath, { withFileTypes: true })
  const items: DocsDirectoryItem[] = []

  for (const dirent of dirents) {
    if (dirent.name.startsWith(".")) {
      continue
    }

    if (dirent.isDirectory()) {
      items.push({
        kind: "directory",
        slug: [...slug, dirent.name],
        title: formatSegmentTitle(dirent.name),
      })
      continue
    }

    if (dirent.isFile() && dirent.name.endsWith(".md")) {
      const entrySlug = dirent.name.replace(/\.md$/, "")
      const filePath = path.join(dirPath, dirent.name)
      const stats = getStats(filePath)
      const content = fs.readFileSync(filePath, "utf8")

      items.push({
        kind: "file",
        slug: [...slug, entrySlug],
        title: extractTitle(content, entrySlug),
        summary: extractSummary(content),
        lastUpdated: stats?.mtime.toISOString(),
      })
    }
  }

  return items.sort((a, b) => {
    if (a.kind === b.kind) {
      return a.title.localeCompare(b.title)
    }
    return a.kind === "directory" ? -1 : 1
  })
}

function sanitizeSlug(slug: string[]): string[] {
  return slug
    .filter(Boolean)
    .map(segment => segment.trim())
    .filter(segment => segment.length > 0)
    .filter(segment => !segment.includes("..") && !segment.includes("/") && !segment.includes("\\"))
    .map(segment => segment.replace(/\s+/g, "-"))
}

function resolveWithinDocs(...segments: string[]): string {
  const targetPath = path.resolve(DOCS_ROOT, ...segments)
  if (!targetPath.startsWith(DOCS_ROOT)) {
    throw new Error("Invalid docs path")
  }
  return targetPath
}

function getStats(targetPath: string): fs.Stats | null {
  try {
    return fs.statSync(targetPath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null
    }
    throw error
  }
}

function extractTitle(markdown: string, fallback: string): string {
  const match = markdown.match(/^#\s+(.*)/m)
  if (match?.[1]) {
    return match[1].trim()
  }

  return formatSegmentTitle(fallback)
}

function extractSummary(markdown: string): string | undefined {
  const lines = markdown.split(/\r?\n/)
  const summaryLines: string[] = []

  for (const line of lines) {
    if (!line.trim()) {
      if (summaryLines.length > 0) {
        break
      }
      continue
    }

    if (line.startsWith("#")) {
      continue
    }

    summaryLines.push(line.trim())
    if (summaryLines.join(" ").length > 200) {
      break
    }
  }

  return summaryLines.length > 0 ? summaryLines.join(" ") : undefined
}

function formatSegmentTitle(segment: string): string {
  return segment
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, letter => letter.toUpperCase())
}

export function formatDocsSegment(segment: string): string {
  return formatSegmentTitle(segment)
}

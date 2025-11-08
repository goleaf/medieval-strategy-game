import fs from "fs/promises"
import path from "path"

export interface FeatureDoc {
  slug: string
  title: string
  summary: string
  headings: string[]
  content: string
  wordCount: number
  lastUpdated: string
}

const FEATURES_DIR = path.join(process.cwd(), "docs", "features")

export async function getFeatureDocSlugs(): Promise<string[]> {
  const entries = await fs.readdir(FEATURES_DIR, { withFileTypes: true })
  return entries
    .filter(entry => entry.isFile() && entry.name.endsWith(".md"))
    .map(entry => entry.name.replace(/\.md$/, ""))
    .sort((a, b) => a.localeCompare(b))
}

export async function getFeatureDoc(slug: string): Promise<FeatureDoc | null> {
  try {
    const filePath = path.join(FEATURES_DIR, `${slug}.md`)
    const [content, stats] = await Promise.all([
      fs.readFile(filePath, "utf-8"),
      fs.stat(filePath),
    ])

    const title = extractTitle(content, slug)
    const summary = extractSummary(content) || "Detailed specification available below."
    const headings = extractHeadings(content)
    const wordCount = countWords(content)

    return {
      slug,
      title,
      summary,
      headings,
      content,
      wordCount,
      lastUpdated: stats.mtime.toISOString(),
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.warn(`[docs] Feature doc missing`, { slug, filePath: path.join(FEATURES_DIR, `${slug}.md`) })
      return null
    }
    throw error
  }
}

export async function getFeatureDocs(): Promise<FeatureDoc[]> {
  const slugs = await getFeatureDocSlugs()
  const docs = await Promise.all(slugs.map(slug => getFeatureDoc(slug)))
  return docs.filter((doc): doc is FeatureDoc => doc !== null)
}

function extractTitle(markdown: string, fallback: string): string {
  const match = markdown.match(/^#\s+(.*)/m)
  if (match?.[1]) {
    return match[1].trim()
  }
  return fallback
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, letter => letter.toUpperCase())
}

function extractSummary(markdown: string): string {
  const lines = markdown.split(/\r?\n/)
  const summaryLines: string[] = []
  let collecting = false

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!collecting) {
      if (!line || line.startsWith("#")) {
        continue
      }
      collecting = true
      summaryLines.push(line)
      continue
    }

    if (!line) {
      break
    }

    summaryLines.push(line)
  }

  return summaryLines.join(" ")
}

function extractHeadings(markdown: string): string[] {
  const matches = markdown.matchAll(/^##\s+(.*)/gm)
  const headings: string[] = []

  for (const match of matches) {
    if (match[1]) {
      headings.push(match[1].trim())
    }
  }

  return headings
}

function countWords(markdown: string): number {
  const plain = markdown
    .replace(/```[\s\S]*?```/g, " ") // remove fenced code blocks
    .replace(/`[^`]*`/g, " ") // remove inline code ticks
    .replace(/[#>*_~\-]/g, " ") // remove markdown syntax tokens

  const words = plain
    .split(/\s+/)
    .map(word => word.trim())
    .filter(Boolean)

  return words.length
}

/*
  Update root CHANGELOG.md with a new entry.
  Usage:
    npm run changelog:update -- \
      --type <feat|fix|chore|docs|refactor|perf|test|build|ci> \
      --summary "short summary" \
      [--scope scope] \
      [--description "multi-line ok"] \
      [--files path/one.ts,path/two.ts]

  Notes:
  - If --files is omitted, changed files are inferred via `git status --porcelain`.
  - Creates CHANGELOG.md if it doesn’t exist, and ensures an `## Unreleased` section.
*/

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type EntryType =
  | "feat"
  | "fix"
  | "chore"
  | "docs"
  | "refactor"
  | "perf"
  | "test"
  | "build"
  | "ci";

interface Args {
  type?: EntryType;
  scope?: string;
  summary?: string;
  description?: string;
  files?: string[];
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--type") args.type = argv[++i] as EntryType;
    else if (a === "--scope") args.scope = argv[++i];
    else if (a === "--summary") args.summary = argv[++i];
    else if (a === "--description") args.description = argv[++i];
    else if (a === "--files") args.files = argv[++i]?.split(",").map((s) => s.trim());
  }
  return args;
}

function inferChangedFiles(): string[] {
  try {
    const out = execSync("git status --porcelain", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const files = out
      .map((line) => line.replace(/^\S+\s+/, ""))
      .filter((p) => p && !p.startsWith(".."));
    // De-duplicate and sort for stability
    return Array.from(new Set(files)).sort();
  } catch {
    return [];
  }
}

function ensureFile(content?: string): string {
  const base = `# Changelog\n\nAll notable changes to this project are documented here.\n\nThis file follows a lightweight Keep a Changelog style and conventional commit types.\n\n## Unreleased\n`;
  if (!content || content.trim().length === 0) return base + "\n";
  if (!content.includes("## Unreleased")) return content.trimEnd() + "\n\n## Unreleased\n\n";
  return content;
}

function insertUnderUnreleased(original: string, entry: string): string {
  const marker = "## Unreleased";
  const idx = original.indexOf(marker);
  if (idx === -1) return ensureFile(original) + entry;
  const head = original.slice(0, idx + marker.length);
  const tail = original.slice(idx + marker.length);
  // Insert a blank line after the header if not present
  const normalized = tail.startsWith("\n\n") ? tail : tail.startsWith("\n") ? tail : "\n" + tail;
  return head + "\n\n" + entry + normalized;
}

function buildEntry(args: Required<Pick<Args, "type" | "summary">> & Args): string {
  const scope = args.scope ? `(${args.scope})` : "";
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const header = `- ${args.type}${scope}: ${args.summary}`;
  const lines: string[] = [header];

  const files = (args.files && args.files.length ? args.files : inferChangedFiles()).filter(Boolean);
  if (files.length) lines.push(`  - files: ${files.join(", ")}`);

  if (args.description && args.description.trim().length) {
    const descLines = args.description.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const dl of descLines) lines.push(`  - details: ${dl}`);
  }

  lines.push(`  - date: ${date}`);
  return lines.join("\n") + "\n";
}

function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  if (!args.type) {
    console.error("--type is required (feat, fix, chore, docs, refactor, perf, test, build, ci)");
    process.exit(1);
  }
  if (!args.summary) {
    console.error("--summary is required (short one-line)");
    process.exit(1);
  }

  const changelogPath = join(process.cwd(), "CHANGELOG.md");
  const existing = existsSync(changelogPath) ? readFileSync(changelogPath, "utf8") : "";
  const prepared = ensureFile(existing);
  const entry = buildEntry({ type: args.type, summary: args.summary, scope: args.scope, description: args.description, files: args.files });
  const updated = insertUnderUnreleased(prepared, entry);
  writeFileSync(changelogPath, updated, "utf8");
  console.log("CHANGELOG.md updated");
}

main();


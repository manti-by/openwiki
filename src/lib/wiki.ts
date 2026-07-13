import { promises as fs } from "node:fs"
import path from "node:path"

export const WIKI_DIRNAME = "wiki"
export const PAGES_DIRNAME = "pages"

export function wikiRoot(projectDir: string): string {
  return path.join(projectDir, WIKI_DIRNAME)
}

export function pagesRoot(projectDir: string): string {
  return path.join(wikiRoot(projectDir), PAGES_DIRNAME)
}

export async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

export async function isInitialized(projectDir: string): Promise<boolean> {
  return exists(wikiRoot(projectDir))
}

export interface FrontmatterResult {
  frontmatter: Record<string, string>
  body: string
}

export function splitFrontmatter(markdown: string): FrontmatterResult {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(markdown)
  if (!match) return { frontmatter: {}, body: markdown }
  const raw = match[1]
  const body = markdown.slice(match[0].length)
  const frontmatter: Record<string, string> = {}
  for (const line of raw.split("\n")) {
    const m = /^([A-Za-z_]+):\s*(.*)$/.exec(line)
    if (!m) continue
    const [, key, value] = m
    frontmatter[key] = value.trim()
  }
  return { frontmatter, body }
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

export function pageFilename(date: string, title: string): string {
  return `${date}-${slugify(title)}.md`
}

function lineDate(line: string): string {
  return /\((\d{4}-\d{2}-\d{2})\)\s*$/.exec(line)?.[1] ?? ""
}

export function upsertIndexEntry(indexMarkdown: string, filename: string, entryLine: string): string {
  const lines = indexMarkdown.split("\n")
  const pagesHeading = lines.findIndex((l) => l.trim() === "## Pages")
  if (pagesHeading === -1) {
    return indexMarkdown.trimEnd() + `\n\n## Pages\n\n${entryLine}\n`
  }
  let sectionEnd = lines.length
  for (let i = pagesHeading + 1; i < lines.length; i++) {
    if (lines[i].startsWith("## ")) {
      sectionEnd = i
      break
    }
  }
  const before = lines.slice(0, pagesHeading + 1)
  const section = lines
    .slice(pagesHeading + 1, sectionEnd)
    .filter((l) => l.trim().length > 0 && !l.includes(filename))
  const after = lines.slice(sectionEnd)

  section.push(entryLine)
  section.sort((a, b) => lineDate(b).localeCompare(lineDate(a)))

  return [...before, "", ...section, "", ...after].join("\n").replace(/\n{3,}/g, "\n\n")
}

export async function readIfExists(p: string): Promise<string | null> {
  return (await exists(p)) ? fs.readFile(p, "utf8") : null
}

export interface ExistingPage {
  filename: string
  content: string
}

export async function findExistingPageForSession(projectDir: string, sessionId: string): Promise<ExistingPage | null> {
  const dir = pagesRoot(projectDir)
  if (!(await exists(dir))) return null
  for (const name of await fs.readdir(dir)) {
    if (!name.endsWith(".md")) continue
    const full = path.join(dir, name)
    const content = await fs.readFile(full, "utf8")
    const { frontmatter } = splitFrontmatter(content)
    if (frontmatter.session_id === sessionId) return { filename: name, content }
  }
  return null
}

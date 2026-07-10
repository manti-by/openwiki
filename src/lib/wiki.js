import { promises as fs } from "node:fs"
import path from "node:path"

export const WIKI_DIRNAME = "wiki"
export const PAGES_DIRNAME = "pages"

export function wikiRoot(projectDir) {
  return path.join(projectDir, WIKI_DIRNAME)
}

export function pagesRoot(projectDir) {
  return path.join(wikiRoot(projectDir), PAGES_DIRNAME)
}

export async function exists(p) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

export async function isInitialized(projectDir) {
  return exists(wikiRoot(projectDir))
}

/** Very small frontmatter splitter — the wiki format is controlled, so this
 *  avoids pulling in a YAML dependency for four flat scalar/array fields. */
export function splitFrontmatter(markdown) {
  const match = /^---\n([\s\S]*?)\n---\n?/.exec(markdown)
  if (!match) return { frontmatter: {}, body: markdown }
  const raw = match[1]
  const body = markdown.slice(match[0].length)
  const frontmatter = {}
  for (const line of raw.split("\n")) {
    const m = /^([A-Za-z_]+):\s*(.*)$/.exec(line)
    if (!m) continue
    const [, key, value] = m
    frontmatter[key] = value.trim()
  }
  return { frontmatter, body }
}

export function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
}

export function pageFilename(date, title) {
  return `${date}-${slugify(title)}.md`
}

/** Extracts the trailing `(YYYY-MM-DD)` date from an index line, falling back
 *  to the empty string (sorts last) if the line doesn't end with one. */
function lineDate(line) {
  return /\((\d{4}-\d{2}-\d{2})\)\s*$/.exec(line)?.[1] ?? ""
}

/** Insert or move the given index line under `## Pages`, keeping newest-first
 *  order by the leading YYYY-MM-DD in each line. Replaces any existing line
 *  for the same filename so re-runs on the same session update in place. */
export function upsertIndexEntry(indexMarkdown, filename, entryLine) {
  const lines = indexMarkdown.split("\n")
  const pagesHeading = lines.findIndex((l) => l.trim() === "## Pages")
  if (pagesHeading === -1) {
    // No recognizable index structure — append defensively rather than lose the entry.
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
  section.sort((a, b) => lineDate(b).localeCompare(lineDate(a))) // newest date first

  return [...before, "", ...section, "", ...after].join("\n").replace(/\n{3,}/g, "\n\n")
}

export async function readIfExists(p) {
  return (await exists(p)) ? fs.readFile(p, "utf8") : null
}

/** Finds a page already linked to this session (by frontmatter session_id)
 *  so a session that goes idle multiple times updates one page in place
 *  instead of spawning a new one each time. */
export async function findExistingPageForSession(projectDir, sessionId) {
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

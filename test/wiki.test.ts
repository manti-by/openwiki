import assert from "node:assert/strict"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { test } from "node:test"

import {
  findExistingPageForSession,
  isInitialized,
  pageFilename,
  slugify,
  splitFrontmatter,
  upsertIndexEntry,
} from "../src/lib/wiki.js"

test("slugify lowercases, hyphenates, and strips punctuation", () => {
  assert.equal(slugify("OTel SSL Cert Debug!"), "otel-ssl-cert-debug")
  assert.equal(slugify("  leading and trailing  "), "leading-and-trailing")
})

test("slugify caps length at 60 chars", () => {
  const long = "a".repeat(200)
  assert.ok(slugify(long).length <= 60)
})

test("pageFilename joins date and slug", () => {
  assert.equal(pageFilename("2026-07-10", "Multi Agent Plan Step"), "2026-07-10-multi-agent-plan-step.md")
})

test("splitFrontmatter parses flat scalar fields", () => {
  const md = `---\ntitle: Example\ndate: 2026-07-10\nstatus: open\n---\n# Example\n\nbody text\n`
  const { frontmatter, body } = splitFrontmatter(md)
  assert.equal(frontmatter.title, "Example")
  assert.equal(frontmatter.date, "2026-07-10")
  assert.equal(frontmatter.status, "open")
  assert.equal(body.trim(), "# Example\n\nbody text".trim())
})

test("splitFrontmatter returns empty frontmatter when there is none", () => {
  const md = "# Just a heading\n\nno frontmatter here\n"
  const { frontmatter, body } = splitFrontmatter(md)
  assert.deepEqual(frontmatter, {})
  assert.equal(body, md)
})

test("upsertIndexEntry inserts a new entry under ## Pages", () => {
  const index = "# Wiki\n\n## Pages\n\n## By topic\n"
  const line = "- [Example](pages/2026-07-10-example.md) — a summary (2026-07-10)"
  const result = upsertIndexEntry(index, "2026-07-10-example.md", line)
  assert.match(result, /## Pages\n\n- \[Example\]/)
  assert.ok(result.includes(line))
})

test("upsertIndexEntry replaces an existing entry for the same filename", () => {
  const index = [
    "# Wiki",
    "",
    "## Pages",
    "",
    "- [Old title](pages/2026-07-10-example.md) — stale summary (2026-07-10)",
    "",
    "## By topic",
    "",
  ].join("\n")
  const line = "- [New title](pages/2026-07-10-example.md) — fresh summary (2026-07-10)"
  const result = upsertIndexEntry(index, "2026-07-10-example.md", line)
  const occurrences = result.split("2026-07-10-example.md").length - 1
  assert.equal(occurrences, 1)
  assert.ok(result.includes(line))
  assert.ok(!result.includes("stale summary"))
})

test("upsertIndexEntry keeps entries newest-first by leading date", () => {
  const index = [
    "# Wiki",
    "",
    "## Pages",
    "",
    "- [Older](pages/2026-07-01-older.md) — old (2026-07-01)",
    "",
    "## By topic",
    "",
  ].join("\n")
  const newer = "- [Newer](pages/2026-07-10-newer.md) — new (2026-07-10)"
  const result = upsertIndexEntry(index, "2026-07-10-newer.md", newer)
  const pagesLines = result
    .split("## Pages")[1]
    .split("## By topic")[0]
    .split("\n")
    .filter((l) => l.startsWith("- "))
  assert.deepEqual(pagesLines, [newer, "- [Older](pages/2026-07-01-older.md) — old (2026-07-01)"])
})

test("isInitialized reflects whether wiki/ exists on disk", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "openwiki-test-"))
  try {
    assert.equal(await isInitialized(dir), false)
    await mkdir(path.join(dir, "wiki"))
    assert.equal(await isInitialized(dir), true)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test("findExistingPageForSession matches by frontmatter session_id", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "openwiki-test-"))
  try {
    const pages = path.join(dir, "wiki", "pages")
    await mkdir(pages, { recursive: true })
    const content = "---\ntitle: Example\nsession_id: abc123\n---\n# Example\n"
    await writeFile(path.join(pages, "2026-07-10-example.md"), content, "utf8")

    const found = await findExistingPageForSession(dir, "abc123")
    assert.ok(found)
    assert.equal(found.filename, "2026-07-10-example.md")

    const notFound = await findExistingPageForSession(dir, "does-not-exist")
    assert.equal(notFound, null)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

test("findExistingPageForSession returns null when wiki/pages doesn't exist", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "openwiki-test-"))
  try {
    assert.equal(await findExistingPageForSession(dir, "abc123"), null)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})

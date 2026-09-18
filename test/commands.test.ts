import assert from "node:assert/strict"
import { promises as fs } from "node:fs"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SKILLS_DIR = path.join(__dirname, "..", "skills")
const TEMPLATES_DIR = path.join(__dirname, "..", "templates")

test("skills directory contains exactly the expected skill subdirectories", async () => {
  const entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true })
  const dirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort()
  assert.deepEqual(dirs, ["wiki-agents-file", "wiki-archive", "wiki-consistency", "wiki-dedup", "wiki-sync"])
})

test("every skill subdirectory contains a SKILL.md", async () => {
  const entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true })
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name)
  for (const dir of dirs) {
    const skillFile = path.join(SKILLS_DIR, dir, "SKILL.md")
    const stat = await fs.stat(skillFile).catch(() => null)
    assert.ok(stat?.isFile(), `${dir}/SKILL.md must exist and be a file`)
    const content = await fs.readFile(skillFile, "utf8")
    assert.ok(content.trim().length > 0, `${dir}/SKILL.md must not be empty`)
  }
})

test("scaffold templates do not claim the plugin writes pages automatically", async () => {
  const index = await fs.readFile(path.join(TEMPLATES_DIR, "INDEX.md"), "utf8")
  assert.ok(!index.includes("automatically by the plugin"))
  assert.match(index, /\/wiki-update/)
})

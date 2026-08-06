import assert from "node:assert/strict"
import { promises as fs } from "node:fs"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const COMMANDS_DIR = path.join(__dirname, "..", "commands")
const TEMPLATES_DIR = path.join(__dirname, "..", "templates")

test("every command has valid frontmatter with a description and the build agent", async () => {
  const files = (await fs.readdir(COMMANDS_DIR)).filter((file) => file.endsWith(".md"))
  assert.deepEqual(files.sort(), ["wiki-consistency.md", "wiki-dedup.md", "wiki-update.md"])

  for (const file of files) {
    const content = await fs.readFile(path.join(COMMANDS_DIR, file), "utf8")
    const match = content.match(/^---\n([\s\S]*?)\n---\n/)
    assert.ok(match, `${file} must start with YAML frontmatter`)
    assert.match(match[1], /description:/, `${file} must declare a description`)
    assert.match(match[1], /^agent: build$/m, `${file} must run on the build agent`)
  }
})

test("scaffold templates do not claim the plugin writes pages automatically", async () => {
  const index = await fs.readFile(path.join(TEMPLATES_DIR, "INDEX.md"), "utf8")
  assert.ok(!index.includes("automatically by the plugin"))
  assert.match(index, /\/wiki-update/)
})

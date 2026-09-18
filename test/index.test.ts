import assert from "node:assert/strict"
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"

import OpenWikiDefault, { OpenWiki } from "../src/index.js"

async function makeDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "openwiki-test-"))
}

async function listInstalledSkills(dir: string): Promise<string[]> {
  try {
    const skillsDir = path.join(dir, ".opencode", "skills")
    const entries = await fs.readdir(skillsDir, { withFileTypes: true })
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort()
  } catch {
    return []
  }
}

test("plugin load installs every skill and writes every wiki scaffold file", async () => {
  const dir = await makeDir()
  await OpenWiki({ client: {} as never, directory: dir })

  const skills = await listInstalledSkills(dir)
  assert.deepEqual(skills, ["wiki-agents-file", "wiki-archive", "wiki-consistency", "wiki-dedup", "wiki-sync"])

  for (const skill of skills) {
    const content = await fs.readFile(path.join(dir, ".opencode", "skills", skill, "SKILL.md"), "utf8")
    assert.ok(content.length > 0, `${skill}/SKILL.md should be non-empty`)
  }

  for (const file of ["README.md", "TEMPLATE.md", "INDEX.md", "QUESTIONS.md"]) {
    const content = await fs.readFile(path.join(dir, "wiki", file), "utf8")
    assert.ok(content.length > 0, `${file} should be non-empty`)
  }
})

test("wiki scaffold substitutes <PROJECT_NAME> with the directory name", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openwiki-rename-"))
  const projectName = path.basename(dir)
  await OpenWiki({ client: {} as never, directory: dir })

  for (const file of ["README.md", "INDEX.md", "QUESTIONS.md"]) {
    const content = await fs.readFile(path.join(dir, "wiki", file), "utf8")
    assert.ok(content.includes(projectName), `${file} should have project name substituted`)
  }
})

test("plugin load does not overwrite a user-customised skill file", async () => {
  const dir = await makeDir()
  await fs.mkdir(path.join(dir, ".opencode", "skills", "wiki-sync"), { recursive: true })
  await fs.writeFile(path.join(dir, ".opencode", "skills", "wiki-sync", "SKILL.md"), "CUSTOM SYNC", "utf8")

  await OpenWiki({ client: {} as never, directory: dir })

  assert.equal(await fs.readFile(path.join(dir, ".opencode", "skills", "wiki-sync", "SKILL.md"), "utf8"), "CUSTOM SYNC")
})

test("plugin load does not overwrite a pre-existing wiki file", async () => {
  const dir = await makeDir()
  await fs.mkdir(path.join(dir, "wiki"), { recursive: true })
  await fs.writeFile(path.join(dir, "wiki", "README.md"), "CUSTOM README", "utf8")

  await OpenWiki({ client: {} as never, directory: dir })

  assert.equal(await fs.readFile(path.join(dir, "wiki", "README.md"), "utf8"), "CUSTOM README")
  for (const file of ["TEMPLATE.md", "INDEX.md", "QUESTIONS.md"]) {
    const content = await fs.readFile(path.join(dir, "wiki", file), "utf8")
    assert.ok(content.length > 0, `${file} should still be written even when README was pre-seeded`)
  }
})

test("plugin load is a no-op for files that already exist on a re-load", async () => {
  const dir = await makeDir()
  await OpenWiki({ client: {} as never, directory: dir })

  const skills = ["wiki-agents-file", "wiki-archive", "wiki-consistency", "wiki-dedup", "wiki-sync"]
  for (const skill of skills) {
    await fs.writeFile(path.join(dir, ".opencode", "skills", skill, "SKILL.md"), `SEED ${skill}`, "utf8")
  }
  for (const file of ["README.md", "TEMPLATE.md", "INDEX.md", "QUESTIONS.md"]) {
    await fs.writeFile(path.join(dir, "wiki", file), `SEED ${file}`, "utf8")
  }

  await OpenWiki({ client: {} as never, directory: dir })

  for (const skill of skills) {
    assert.equal(
      await fs.readFile(path.join(dir, ".opencode", "skills", skill, "SKILL.md"), "utf8"),
      `SEED ${skill}`,
      `${skill}/SKILL.md should be untouched on a re-load`,
    )
  }
  for (const file of ["README.md", "TEMPLATE.md", "INDEX.md", "QUESTIONS.md"]) {
    assert.equal(
      await fs.readFile(path.join(dir, "wiki", file), "utf8"),
      `SEED ${file}`,
      `wiki/${file} should be untouched on a re-load`,
    )
  }
})

test("OpenWiki is exported as the module's default export so OpenCode's plugin loader can call it", () => {
  assert.equal(typeof OpenWikiDefault, "function", "default export must be the factory function")
  assert.equal(OpenWikiDefault, OpenWiki, "default export must be the same function as the named export")
})

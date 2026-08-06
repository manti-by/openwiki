import assert from "node:assert/strict"
import { test } from "node:test"

import { exists, wikiRoot } from "../src/lib/wiki.js"

test("wikiRoot joins the project dir with the wiki dirname", () => {
  assert.equal(wikiRoot("/tmp/proj"), "/tmp/proj/wiki")
})

test("exists returns true for present paths and false for missing ones", async () => {
  const dir = await (await import("node:fs/promises")).mkdtemp("/tmp/openwiki-test-")
  try {
    const present = `${dir}/file.txt`
    await (await import("node:fs/promises")).writeFile(present, "x")
    assert.equal(await exists(present), true)
    assert.equal(await exists(`${dir}/missing.txt`), false)
  } finally {
    await (await import("node:fs/promises")).rm(dir, { recursive: true, force: true })
  }
})

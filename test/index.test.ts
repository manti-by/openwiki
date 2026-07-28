import assert from "node:assert/strict"
import { promises as fs } from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"

import { OpenWiki } from "../src/index.js"
import { writerSessionPath } from "../src/lib/wiki.js"

async function scaffoldWiki(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openwiki-test-"))
  const wiki = path.join(dir, "wiki")
  await fs.mkdir(path.join(wiki, "pages"), { recursive: true })
  await fs.writeFile(path.join(wiki, "README.md"), "README CONTENT", "utf8")
  await fs.writeFile(path.join(wiki, "TEMPLATE.md"), "TEMPLATE CONTENT", "utf8")
  await fs.writeFile(path.join(wiki, "INDEX.md"), "# Index\n\n## Pages\n", "utf8")
  return dir
}

const longTranscriptMessages = [{ info: { role: "user" }, parts: [{ type: "text", text: "x".repeat(120) }] }]

interface MockOptions {
  // parentID reported by session.get, keyed by session id
  sessionInfo?: Record<string, { parentID?: string }>
}

function makeClient(opts: MockOptions = {}) {
  const calls = {
    create: [] as Array<{ title: string; parentID?: string }>,
    prompt: [] as string[],
    get: [] as string[],
    messages: [] as string[],
  }
  const client = {
    session: {
      messages: async ({ path: p }: { path: { id: string } }) => {
        calls.messages.push(p.id)
        return { data: longTranscriptMessages }
      },
      get: async ({ path: p }: { path: { id: string } }) => {
        calls.get.push(p.id)
        return { data: opts.sessionInfo?.[p.id] ?? {} }
      },
      create: async ({ body }: { body: { title: string; parentID?: string } }) => {
        calls.create.push(body)
        return { data: { id: "ses_writer" } }
      },
      prompt: async ({ path: p }: { path: { id: string }; body: unknown }) => {
        calls.prompt.push(p.id)
        // Reply "skip" so no page is written — keeps the test filesystem-clean.
        return { data: { parts: [{ type: "text", text: '{"skip": true}' }] } }
      },
    },
    config: { get: async () => ({ data: {} }) },
  }
  return { client, calls }
}

function idleEvent(sessionID: string) {
  return { event: { type: "session.idle", properties: { sessionID } } }
}

test("session.idle creates the writer session as a child of the triggering session (parentID set)", async () => {
  const directory = await scaffoldWiki()
  const { client, calls } = makeClient()
  const plugin = await OpenWiki({ client: client as never, directory })

  await plugin.event(idleEvent("ses_main_parentid"))

  assert.equal(calls.create.length, 1)
  assert.equal(calls.create[0].parentID, "ses_main_parentid")
  assert.equal(calls.create[0].title, "openwiki writer")
})

test("session.idle skips child/subagent sessions (those with a parentID)", async () => {
  const directory = await scaffoldWiki()
  const { client, calls } = makeClient({
    sessionInfo: { ses_child_sub: { parentID: "ses_some_parent" } },
  })
  const plugin = await OpenWiki({ client: client as never, directory })

  await plugin.event(idleEvent("ses_child_sub"))

  assert.equal(calls.create.length, 0, "must not spawn a writer for a subagent session")
  assert.equal(calls.prompt.length, 0)
})

test("session.idle skips its own cached writer session without even fetching it", async () => {
  const directory = await scaffoldWiki()
  await fs.writeFile(writerSessionPath(directory), "ses_cached_writer", "utf8")
  const { client, calls } = makeClient()
  const plugin = await OpenWiki({ client: client as never, directory })

  await plugin.event(idleEvent("ses_cached_writer"))

  assert.equal(calls.create.length, 0)
  assert.equal(calls.get.length, 0, "cached-writer check short-circuits before session.get")
})

test("event handler ignores non-idle events", async () => {
  const directory = await scaffoldWiki()
  const { client, calls } = makeClient()
  const plugin = await OpenWiki({ client: client as never, directory })

  await plugin.event({ event: { type: "session.created", properties: { sessionID: "ses_x_created" } } })

  assert.equal(calls.messages.length, 0)
  assert.equal(calls.create.length, 0)
})

test("openwiki_init scaffolds wiki/ files and installs every command into .opencode/commands/", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openwiki-init-"))
  const { client } = makeClient()
  const plugin = await OpenWiki({ client: client as never, directory: dir })

  const result = await plugin.tool.openwiki_init.execute({ projectName: "TestProj" }, {
    sessionID: "s",
    messageID: "m",
    agent: "build",
    directory: dir,
    worktree: dir,
    abort: new AbortController().signal,
    metadata: () => {},
    ask: async () => {},
  } as never)

  for (const file of ["README.md", "TEMPLATE.md", "INDEX.md", "QUESTIONS.md"]) {
    const content = await fs.readFile(path.join(dir, "wiki", file), "utf8")
    assert.ok(content.length > 0, `${file} should be non-empty`)
  }
  for (const file of ["README.md", "INDEX.md", "QUESTIONS.md"]) {
    const content = await fs.readFile(path.join(dir, "wiki", file), "utf8")
    assert.ok(content.includes("TestProj"), `${file} should have project name substituted`)
  }

  const installed = await fs.readdir(path.join(dir, ".opencode", "commands"))
  assert.deepEqual(installed.sort(), ["wiki-consistency.md", "wiki-dedup.md", "wiki-init.md", "wiki-write.md"])
  assert.match(result, /initialized for "TestProj"/)
  assert.match(result, /4 command\(s\) installed/)
})

test("openwiki_init is idempotent — does not overwrite existing wiki files or commands", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "openwiki-init-"))
  const { client } = makeClient()
  const plugin = await OpenWiki({ client: client as never, directory: dir })

  // Pre-seed: a user-customised README and a custom command.
  await fs.mkdir(path.join(dir, ".opencode", "commands"), { recursive: true })
  await fs.mkdir(path.join(dir, "wiki"), { recursive: true })
  await fs.writeFile(path.join(dir, "wiki", "README.md"), "CUSTOM README", "utf8")
  await fs.writeFile(path.join(dir, ".opencode", "commands", "wiki-init.md"), "CUSTOM COMMAND", "utf8")

  const result = await plugin.tool.openwiki_init.execute({}, {
    sessionID: "s",
    messageID: "m",
    agent: "build",
    directory: dir,
    worktree: dir,
    abort: new AbortController().signal,
    metadata: () => {},
    ask: async () => {},
  } as never)

  assert.equal(await fs.readFile(path.join(dir, "wiki", "README.md"), "utf8"), "CUSTOM README")
  assert.equal(await fs.readFile(path.join(dir, ".opencode", "commands", "wiki-init.md"), "utf8"), "CUSTOM COMMAND")

  // The other three commands should still have been installed.
  const installed = await fs.readdir(path.join(dir, ".opencode", "commands"))
  assert.deepEqual(installed.sort(), ["wiki-consistency.md", "wiki-dedup.md", "wiki-init.md", "wiki-write.md"])

  assert.match(result, /3 command\(s\) installed/)
  assert.match(result, /1 already present/)
})

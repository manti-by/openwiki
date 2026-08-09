---
title: Install-Only Plugin Refactor
date: 2026-08-06
type: implementation
status: resolved
session_id: -
services: []
branch: master
tickets: []
tags: [openwiki, plugin, refactor, install-only, architecture]
related: [2026-07-15-openwiki-plugin-design-spec.md, 2026-07-28-slash-command-self-bootstrap.md, 2026-08-09-archive-and-agents-file-commands.md]
---

# Install-Only Plugin Refactor

## TL;DR

OpenWiki was stripped from a full agent plugin — two tools (`openwiki_init`, `openwiki_write`),
a `session.idle` event handler, a background Wiki Agent that spawned child writer sessions, and
a model-resolution chain — down to an **install-only** plugin. On load it now does exactly two
things: copy `commands/*.md` into `.opencode/commands/` and scaffold `wiki/` from the bundled
templates, both idempotent. The deleted agent logic was replaced by a single self-contained
slash command, `/wiki-update`, which does the page-writing work as an in-session agent prompt
instead of host-coupled code. `@opencode-ai/plugin` is gone from the dependency tree entirely;
`src/` is now two pure, directly unit-testable files. Version bumped to `0.4.0-a`.

---

## Overview

The previous architecture (built up in [[2026-07-15-openwiki-plugin-design-spec]]) coupled the
plugin to the OpenCode host: it imported `tool` from `@opencode-ai/plugin`, registered an event
handler, called `client.session.create`/`prompt`/`get`/`messages` and `client.config.get`, and
resolved a model from `openwiki.json` → first user message → host config. This session deleted
all of that (~1090 lines) and kept only the filesystem work that [[2026-07-28-slash-command-self-bootstrap]]
already proved works: self-installing commands on plugin load, now extended to scaffold `wiki/`
in the same pass.

Net effect: `src/` is 72 lines across two files, no host imports anywhere, tests exercise the
real plugin surface, and the wiki-writing intelligence moved from background agent code into
the `/wiki-update` command prompt where a human agent runs it on demand.

## Step 1 — Strip the host-coupled layer out of `src/index.ts`

**Before (~270 lines):** `OpenWiki({client, directory})` registered two tools and one event
handler, and implemented the whole Wiki Agent flow — `onSessionIdle` (fetch transcript,
pre-filter by length and maintenance patterns, find existing page, build prompt, resolve model,
spawn/reuse a writer child session, parse the JSON reply, write page + upsert index),
`getOrCreateWriterSession`, `isBackgroundSession`, `extractReplyText`, `resolveModel`,
`parseModelString`.

**After (55 lines):** the factory only takes `directory` (the `client` argument is accepted for
type compatibility with the host and typed `unknown`, never touched) and runs `install`:

```ts
export const OpenWiki = async ({ directory }: { client: unknown; directory: string }) => {
  await install(directory)
}

async function install(directory: string): Promise<void> {
  const name = path.basename(directory)
  await installCommands(directory)
  await scaffoldWiki(directory, name)
}
```

`installCommands` is the same copy-`commands/*.md`-into-`.opencode/commands/`-skipping-existing
helper extracted in the self-bootstrap session. `scaffoldWiki` is new: it writes the four
template files into `wiki/` with `<PROJECT_NAME>` substituted to the directory name, also
skipping anything that already exists. **File:** `src/index.ts:11-53`

## Step 2 — Trim `src/lib/wiki.ts` to two helpers

**Before (~120 lines):** `wikiRoot`, `pagesRoot`, `isInitialized`, `splitFrontmatter`, `slugify`,
`pageFilename`, `upsertIndexEntry`, `readIfExists`, `findExistingPageForSession`,
`writerSessionPath`/`loadWriterSession`/`saveWriterSession`.

**After (17 lines):** only what the install path needs — `wikiRoot` (path join) and `exists`
(`fs.access` wrapper). All frontmatter parsing, slugging, index upserting, and writer-session
caching moved out; the frontmatter-scan and index-update logic that is still needed now lives
in the `/wiki-update` command prompt instead. **File:** `src/lib/wiki.ts`

## Step 3 — Delete the agent machinery and the host dependency

- **Deleted:** `src/lib/summarize.ts` (`buildWikiAgentPrompt`, `transcriptFromMessages`,
  `parseAgentJson`), `src/lib/wiki-agent.txt` (the prompt template), `src/types.d.ts` (the
  hand-written `OpenCodeClient`/`OpenCodeEvent` types), `test/summarize.test.ts`.
- **`package.json`:** removed `@opencode-ai/plugin` from `devDependencies`; the build script
  dropped its `--external @opencode-ai/plugin` flag (`bun build src/index.ts --outdir dist
  --target node`); version `0.3.0-rc5` → `0.4.0-a`; description rewritten to "OpenCode plugin
  that scaffolds a per-project session wiki… Install-only — no background agent, no event hooks."
- **`bun.lock`:** `@opencode-ai/plugin` entry removed.

Result: zero runtime deps and zero host-coupled files in the tree, per the updated Key
constraints in `AGENTS.md`.

## Step 4 — Replace the tool-backed slash commands with a self-contained writer

- **Deleted `commands/wiki-init.md`** (called the removed `openwiki_init` tool) and
  **`commands/wiki-write.md`** (called `openwiki_write`). Scaffolding now happens automatically
  on plugin load, so no init command is needed.
- **Added `commands/wiki-update.md`** — the replacement page-writer. It is a plain markdown
  prompt (no tool call, no host API) that instructs the invoking agent to:
  1. Resolve this session's existing page — conversation memory first, then a `session_id`
     frontmatter scan of `wiki/pages/*.md`, then the `wiki/.openwiki-sessions.json` mapping file.
  2. Create `wiki/pages/YYYY-MM-DD-3-to-5-word-summary.md` (or update the existing file,
     preserving `session_id`/`date` and appending a dated section).
  3. Update the `wiki/.openwiki-sessions.json` session→file mapping.
  4. Append an `INDEX.md` entry — new pages only.
- **Kept:** `wiki-consistency.md` and `wiki-dedup.md` (also plain prompts).

The package now ships exactly three commands: `/wiki-consistency`, `/wiki-dedup`,
`/wiki-update`.

## Step 5 — Update templates and docs

- `templates/INDEX.md`: "By topic" section header reworded to `_Optional: cluster pages by
  subject matter here, largest cluster first._` (dropped the Consistency-Agent reference).
- `templates/QUESTIONS.md`: reworded to remove the Consistency-Agent workflow ("a human answers
  inline… the Consistency Agent applies the answer" → "move the entry from Open to Resolved").
- `templates/README.md`: `QUESTIONS.md` line de-coupled from the Consistency Agent.
- `README.md`: rewritten — scope is now "copies the bundled `/wiki-*` slash commands and writes
  the `wiki/` scaffold… no background agent, no event hooks, no automatic page creation";
  Configuration section is now "None."
- `AGENTS.md` / `CLAUDE.md`: rewritten for the install-only scope (see the new "Scope" section
  and the updated Architecture/Key constraints).

## Step 6 — Rewrite the test suite

`test/index.test.ts` went from 9 host-mocking tests (mock clients, `session.idle` events,
writer-session assertions, tool execution with fake `ToolContext`) to 6 filesystem tests that
call the real factory:

| Test | What it covers |
|------|---------------|
| `plugin load installs every command and writes every wiki scaffold file` | Fresh dir: all 3 commands in `.opencode/commands/`, all 4 files in `wiki/` |
| `wiki scaffold substitutes <PROJECT_NAME> with the directory name` | README/INDEX/QUESTIONS contain `path.basename(dir)` |
| `plugin load does not overwrite a user-customised command` | Pre-seeded `wiki-update.md` survives untouched |
| `plugin load does not overwrite a pre-existing wiki file` | Pre-seeded `wiki/README.md` survives; other templates still written |
| `plugin load is a no-op for files that already exist on a re-load` | All commands + wiki files pre-seeded → untouched |
| `OpenWiki is exported as the module's default export…` | Regression pin from the rc5 fix: default export === named export |

`test/wiki.test.ts` went from 13 helper tests to 2 (`wikiRoot` path join, `exists` probe);
`test/summarize.test.ts` was deleted with its subject.

## Test Results

```
$ bun run lint && bun run typecheck && bun test
   lint clean, typecheck clean, 8 pass / 0 fail
```

## Follow-ups

- The wiki page-writer logic now lives in `commands/wiki-update.md` as prose instructions
  instead of code. If the mapping-file or frontmatter-scan logic grows, consider re-implementing
  the helpers it relies on as a pure library the command prompt can reference.
- `package.json` version `0.4.0-a` is an interim prerelease tag — confirm the final version
  before running `make publish`.
- The design-spec page [[2026-07-15-openwiki-plugin-design-spec]] describes the old
  agent architecture; it is now historical and could be marked as superseded.
- `AGENTS.md` still notes the known `Makefile` `check` target inconsistency (runs only
  `typecheck`); the manual triple (`lint && typecheck && test`) remains the source of truth.

## References

- Related: [[2026-07-15-openwiki-plugin-design-spec]], [[2026-07-28-slash-command-self-bootstrap]], [[2026-08-09-archive-and-agents-file-commands]]
- External: [OpenCode Plugins](https://opencode.ai/docs/plugins/)

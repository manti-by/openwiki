---
title: Self-Installing Slash Commands on Plugin Load
date: 2026-07-28
type: implementation
status: resolved
session_id: -
services: []
branch: master
tickets: []
tags: [openwiki, plugin, commands, bootstrap, opencode]
related: [2026-07-28-warp-notification-flicker-fix.md, 2026-08-06-install-only-plugin-refactor.md]
---

# Self-Installing Slash Commands on Plugin Load

## TL;DR

The four `/wiki-*` slash commands had a chicken-and-egg problem: `initWiki` installed them, but you couldn't run `/wiki-init` because the commands weren't on disk. The OpenWiki factory now runs `installCommandsIfMissing` on plugin load, writing `commands/*.md` into `.opencode/commands/` before OpenCode finishes its startup scan. The `wiki/` scaffold remains gated behind `/wiki-init`.

Two releases were needed. **rc4** introduced the self-bootstrap on plugin load, but shipped with a missing `export default`, so OpenCode's plugin loader never invoked the factory and `/wiki-*` still did not appear. **rc5** adds the default export so the factory is actually called, and ships a regression test that pins the default export to the named one.

---

## Overview

Two commits, both on 2026-07-28, that fix the slash command installation pipeline:

1. **`19a7b26`** — `initWiki` gained command installation (was only scaffolding wiki/ templates)
2. **`0131082`** — The real fix: self-bootstrap on plugin load, extract shared helper, update docs

## Step 1 — initWiki installs commands (but still has the egg problem)

`initWiki` already scaffolded `wiki/` templates (`README.md`, `TEMPLATE.md`, `INDEX.md`, `QUESTIONS.md`) but never copied `commands/*.md` into `.opencode/commands/`. The `/wiki-init`, `/wiki-write`, `/wiki-consistency`, and `/wiki-dedup` commands existed in the package but were never registered on disk.

**Before:** `initWiki` returned after writing wiki templates — no command installation.

**After:** `initWiki` iterates over `COMMANDS_DIR` (resolved to `<package_root>/commands/`), copies each `*.md` to `.opencode/commands/`, skipping files that already exist. The return message now reports both wiki files written and commands installed/skipped.

**File:** `src/index.ts:107-132` (before the refactor)

```ts
const commandsDest = path.join(directory, ".opencode", "commands")
await fs.mkdir(commandsDest, { recursive: true })
let commandsInstalled = 0
let commandsSkipped = 0
for (const file of await fs.readdir(COMMANDS_DIR)) {
  if (!file.endsWith(".md")) continue
  const dest = path.join(commandsDest, file)
  if (await exists(dest)) { commandsSkipped++; continue }
  const src = await fs.readFile(path.join(COMMANDS_DIR, file), "utf8")
  await fs.writeFile(dest, src, "utf8")
  commandsInstalled++
}
```

But this still required `/wiki-init` to be run first — and the only way to invoke it was via a slash command that didn't yet exist.

## Step 2 — Self-bootstrap on plugin load (the real fix)

OpenCode's SDK exposes tool, event, and hooks, but **no command registration API**. Slash commands are discovered from disk before plugins finish loading, so the files must already exist before the host scans the directory.

The `OpenWiki` factory now calls `installCommandsIfMissing` before returning:

**File:** `src/index.ts:50-56`

```ts
// Self-bootstrap: ensure the four /wiki-* slash commands exist in the
// project's .opencode/commands/ before OpenCode finishes its startup
// command scan. Plugins cannot register slash commands through the SDK,
// and commands are discovered from disk, so the files must be written
// here. Idempotent — never overwrites a file the user has customised.
await installCommandsIfMissing(directory)
```

A shared `installCommandsIfMissing` helper was extracted from the inline code in `initWiki`:

**File:** `src/index.ts:98-115`

```ts
async function installCommandsIfMissing(directory: string): Promise<{ installed: number; skipped: number }> {
  const commandsDest = path.join(directory, ".opencode", "commands")
  await fs.mkdir(commandsDest, { recursive: true })
  let installed = 0
  let skipped = 0
  for (const file of await fs.readdir(COMMANDS_DIR)) {
    if (!file.endsWith(".md")) continue
    const dest = path.join(commandsDest, file)
    if (await exists(dest)) { skipped++; continue }
    const src = await fs.readFile(path.join(COMMANDS_DIR, file), "utf8")
    await fs.writeFile(dest, src, "utf8")
    installed++
  }
  return { installed, skipped }
}
```

`initWiki` now delegates to it:

```ts
const { installed, skipped } = await installCommandsIfMissing(directory)
```

## Step 3 — Docs and version update

- `AGENTS.md`: Updated the "Wiki is opt-in" constraint to "Wiki is opt-in but commands self-install", and fixed the "All checks" command from `make check` (which only does typecheck) to the correct manual triple (`bun run lint && bun run typecheck && bun test`).
- `README.md`: Restructured the usage section to reflect the two-step flow (1. restart after adding plugin → commands appear, 2. run `/wiki-init` for wiki scaffold). Added `/wiki-dedup` to the command list.
- `package.json`: Bumped `version` from `0.3.0-rc3` to `0.3.0-rc4`.

## Step 4 — rc5: the default export that rc4 forgot

After publishing rc4 the slash commands still did not appear in OpenCode's command palette. The package installed cleanly (no errors, no `Failed to load plugin` in the log), the auto-install ran at the npm-registry level (the global cache at `~/.cache/opencode/packages/@manti-by/openwiki@0.3.0-rc4/` was populated), and `dist/index.js` contained the `installCommandsIfMissing` logic. So why was `.opencode/commands/` still empty?

**Root cause.** The plugin only declared a named export:

```js
// dist/index.js (rc4)
export {
  OpenWiki
};
```

OpenCode's plugin loader requires the opposite. In `packages/opencode/src/plugin/shared.ts:readV1Plugin`:

```ts
const value = mod.default
if (!isRecord(value)) {
  if (mode === "detect") return
  throw new TypeError(`Plugin ${spec} must default export an object with ${kind}()`)
}
```

`mod.default` was `undefined`, so `applyPlugin` returned early without registering the `OpenWiki` factory as a hook. The factory — and therefore `installCommandsIfMissing(directory)` — was never called. Nothing was logged at `ERROR` level because `readV1Plugin` is invoked with `mode: "detect"` from `applyPlugin`, and the "detect" branch silently returns when the default export is missing (line 280 of `shared.ts`). The only externally visible effect was an empty `.opencode/commands/`.

**Why the local tests missed it.** The tests do `import { OpenWiki } from "../src/index.js"` and call the factory directly. They never exercised the host's dynamic-import path, so the missing default export was never observed in CI.

**Fix.** Add a single line at the bottom of `src/index.ts`:

```ts
export default OpenWiki
```

`bun build` rewrites it as `var src_default = OpenWiki;` and the bundled `dist/index.js` now exports both `default` and `OpenWiki`. The named import path stays intact for the existing tests.

**Regression test.** Added to `test/index.test.ts`:

```ts
test("OpenWiki is exported as the module's default export so OpenCode's plugin loader can call it", () => {
  assert.equal(typeof OpenWikiDefault, "function", "default export must be the factory function")
  assert.equal(OpenWikiDefault, OpenWiki, "default export must be the same function as the named export")
})
```

**Bumped to `0.3.0-rc5`.** Users on rc4: bump to rc5 in `package.json` and re-run `bun install` (or just reinstall the plugin) — no other action needed. The factory is idempotent, so the bootstrap is a no-op on projects that already have the four commands.

## Test Results

Five new tests cover the bootstrap paths (added/modified across the rc4 + rc5 commits):

| Test | What it covers |
|------|---------------|
| `openwiki_init scaffolds wiki/ files and re-runs idempotently for commands` | Fresh project: plugin load installs all 4 commands, initWiki reports 0 installed (4 already present) |
| `openwiki_init is idempotent — does not overwrite existing wiki files or commands` | Pre-seeded custom README + custom command: bootstrap leaves command alone, initWiki leaves README alone |
| `loading the plugin auto-installs the four /wiki-* commands into .opencode/commands/` | Empty project: plugin load alone creates all 4 command files |
| `plugin bootstrap does not overwrite a user-customised command` | Pre-seeded custom wiki-init.md: bootstrap leaves it alone and installs the other 3 |
| `plugin bootstrap is a no-op when all commands are already present` | All 4 pre-seeded: bootstrap touches nothing |
| `OpenWiki is exported as the module's default export so OpenCode's plugin loader can call it` | Pins the rc5 regression: `import OpenWikiDefault from "../src/index.js"` must equal the named `OpenWiki` |

```
$ bun run lint && bun run typecheck && bun test
  29 pass / 0 fail   (lint clean, typecheck clean)
```

---

## Follow-ups

- A future plugin project should default-export the factory from day one. The Biome `useImportExport` rule would have flagged the redundant second `import` in `test/index.test.ts` (rc4 shipped a default-import test that imported nothing). Add a `package.json` `exports` field with `"import": "./dist/index.js"` and `"default": "./dist/index.js"` so consumers can also import the named factory via `import("...").OpenWiki` (the host only uses the default, but tests benefit from the named form).
- Worth adding an `applyPlugin` smoke test against the real OpenCode plugin loader: build the dist, dynamically `import()` it from a Node process, and assert the result has `.tool` and `.event` keys. The current test surface mocks the `client` and never crosses the import boundary that the host uses.

## References

- Related: [[2026-07-28-warp-notification-flicker-fix]]
- Related: [[2026-08-06-install-only-plugin-refactor]]
- Source: `packages/opencode/src/plugin/shared.ts:readV1Plugin` (default export is mandatory)
- Source: `packages/opencode/src/plugin/index.ts:applyPlugin` (calls `readV1Plugin` in `detect` mode, silently returns when the default is missing)
- External: [OpenCode Plugins](https://opencode.ai/docs/plugins/)

---
title: Skills Directory Migration
date: 2026-09-17
type: implementation
status: resolved
session_id: -
services: []
branch: -
tickets: []
tags: [skills, install, refactor, tests]
related: [2026-08-06-install-only-plugin-refactor, 2026-07-28-slash-command-self-bootstrap]
---

# Skills Directory Migration

## TL;DR

Replaced the flat `commands/*.md` install approach with a recursive `skills/` tree copy. Each skill is now a subdirectory (e.g. `skills/wiki-sync/`) containing a `SKILL.md`, mirroring the OpenCode skills convention. `installCommands` in `src/index.ts` was rewritten to walk the tree depth-first, and both test files were updated to match the new layout. All 9 tests pass.

---

## Overview

Previously the plugin shipped skills as flat `.md` files under `commands/` and installed them as individual files into `.opencode/commands/`. OpenCode has since adopted a subdirectory-per-skill convention where each skill lives in `<name>/SKILL.md`. The `commands/` source directory was removed and replaced with `skills/`, containing five subdirectories.

**Skills after migration:**
- `wiki-agents-file/SKILL.md`
- `wiki-archive/SKILL.md`
- `wiki-consistency/SKILL.md`
- `wiki-dedup/SKILL.md`
- `wiki-sync/SKILL.md` (replaces the old `wiki-update.md`)

## Step 1 — Rewrite `installCommands` in `src/index.ts`

The old implementation used `fs.readdir` on a flat directory and filtered for `.md` files, then wrote each file individually.

**File:** `src/index.ts`

Before — flat copy loop:
```ts
for (const file of await fs.readdir(COMMANDS_DIR)) {
  if (!file.endsWith(".md")) continue
  const dest = path.join(commandsDest, file)
  if (await exists(dest)) { skipped++; continue }
  await fs.writeFile(dest, await fs.readFile(...), "utf8")
  installed++
}
```

After — recursive `copyDir` helper:
```ts
async function copyDir(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true })
  for (const entry of await fs.readdir(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath)
    } else {
      if (await exists(destPath)) { skipped++ } else {
        await fs.copyFile(srcPath, destPath)
        installed++
      }
    }
  }
}
await copyDir(COMMANDS_DIR, skillsDest)
```

The destination root is still `.opencode/skills/` (unchanged from the variable rename done in the prior refactor). Idempotency is preserved: any file that already exists at the destination is skipped.

## Step 2 — Update `test/commands.test.ts`

The old test asserted an exact list of `commands/*.md` filenames and checked YAML frontmatter. The new test:

- Points `SKILLS_DIR` at `skills/` instead of `commands/`
- Asserts the exact list of subdirectory names
- Checks that each subdirectory contains a non-empty `SKILL.md`
- Retains the scaffold template assertion (unchanged)

## Step 3 — Update `test/index.test.ts`

All references to `.opencode/commands` and flat `wiki-*.md` filenames were replaced with `.opencode/skills/<name>/SKILL.md` paths. Specific changes:

- `listCommands` helper renamed to `listInstalledSkills`; reads subdirectory names instead of filenames
- "does not overwrite" test now pre-seeds `wiki-sync/SKILL.md` (replacing `wiki-update.md`)
- Re-load idempotency test seeds all five current skill files and verifies none are overwritten
- `wiki-update` removed from all skill lists; `wiki-sync` added

## Test Results

```
bun test v1.3.14

test/index.test.ts:
✓ plugin load installs every skill and writes every wiki scaffold file [13.57ms]
✓ wiki scaffold substitutes <PROJECT_NAME> with the directory name [4.41ms]
✓ plugin load does not overwrite a user-customised skill file [3.85ms]
✓ plugin load does not overwrite a pre-existing wiki file [4.08ms]
✓ plugin load is a no-op for files that already exist on a re-load [6.27ms]
✓ OpenWiki is exported as the module's default export [0.03ms]

test/commands.test.ts:
✓ skills directory contains exactly the expected skill subdirectories [0.11ms]
✓ every skill subdirectory contains a SKILL.md [0.35ms]
✓ scaffold templates do not claim the plugin writes pages automatically [0.13ms]

 9 pass
 0 fail
```

---

## Follow-ups

- `AGENTS.md` still references `commands/*.md` in the scope section — update if a consistency check flags it.
- `INDEX.md` template still references `/wiki-update`; if that command no longer exists it should be updated to `/wiki-sync`.

## References

- Related: [[2026-08-06-install-only-plugin-refactor]]
- Related: [[2026-07-28-slash-command-self-bootstrap]]

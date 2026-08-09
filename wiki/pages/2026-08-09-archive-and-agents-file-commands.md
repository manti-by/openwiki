---
title: Archive and AGENTS-File Commands
date: 2026-08-09
type: implementation
status: resolved
session_id: -
services: []
branch: master
tickets: []
tags: [openwiki, commands, archive, agents-file, maintenance]
related: [2026-08-06-install-only-plugin-refactor.md]
---

# Archive and AGENTS-File Commands

## TL;DR

Added two new slash commands to the install-only plugin: `/wiki-archive` (retires old
wiki pages by distilling still-useful content into current pages and moving the originals to
`wiki/archive/`) and `/wiki-agents-file` (revalidates `AGENTS.md` against the codebase, wiki,
and git log, auto-applying fixes and printing a drift summary). Also line-wrapped the frontmatter
`description` fields of the three existing commands to multi-line YAML, and bumped the package
version to `0.4.1-a`. No `src/` changes were needed — the plugin auto-installs everything under
`commands/*.md`, so the new commands ship by themselves. Tests updated to expect 5 commands;
lint, typecheck, and all 8 tests pass.

---

## Overview

The [[2026-08-06-install-only-plugin-refactor]] session established the plugin's shape: on load
it copies every `commands/*.md` into `.opencode/commands/` and scaffolds `wiki/`, both idempotent.
That means the command set is the plugin's entire feature surface — adding a maintenance command is
a pure file addition, no code. This session added two: one to keep the wiki from growing stale
(`/wiki-archive`) and one to keep the repo's agent-guide map honest (`/wiki-agents-file`).

## Step 1 — Add `/wiki-archive`

New file `commands/wiki-archive.md` (185 lines). It is a plain prompt — no tool calls, no host
API, consistent with the other commands. The flow:

1. **Discover candidates** — parse every page's frontmatter; a candidate is older than the age
   threshold (default **3 months**, overridable via `/wiki-archive 6mo` etc.), `status` not
   `open`/`in-progress`, and with no non-trivial `## Follow-ups`. The three skip categories
   (bad date / live status / open follow-ups) are reported separately.
2. **Plan the merge** — read each candidate in full, distil only *durable* content (decisions,
   conventions, external refs, resolved follow-ups) — never debug narrative, session breadcrumbs,
   or superseded snippets. Pick the most recent page owning the same topic as target.
3. **Merge into the target** — insert a `## Source — [[<candidate>]]` section before the target's
   `## Follow-ups`, union the candidate's frontmatter lists, rewrite any dangling `related:` /
   `[[...]]` links to point at the target, and stamp an "Archived on YYYY-MM-DD" note on the
   candidate (only when a merge happened).
4. **Per-candidate isolation** — never chain candidates: every merge must land on a page that
   stays in `wiki/pages/`.
5. **Move the originals** — `git mv` each candidate to `wiki/archive/` (suffix `-2`, `-3`, … on
   collision), redirect the `.openwiki-sessions.json` mapping, and reconcile `wiki/INDEX.md`
   (remove archived entries from `## Pages` and `## By topic`; deliberately no `## Archive`
   section — the consistency agent owns the archive catalog).

The command ends with a one-line verdict: `N archived, M skipped, K needs-human-review`.

## Step 2 — Add `/wiki-agents-file`

New file `commands/wiki-agents-file.md` (69 lines). An `AGENTS.md` Maintenance Agent prompt that
re-validates the repo map against three sources of truth in priority order
(**source code > wiki pages > git log**):

1. Read `AGENTS.md` end-to-end and index every concrete claim (paths, tools, conventions, "do
   not" rules).
2. Scan the wiki (`INDEX.md` + `pages/`) for documented facts and deviations.
3. Verify each claim against the actual repo (`Glob`/`ls` for paths, read tool configs, sample
   files per layer, grep the forbidden-pattern list).
4. Scan `git log --oneline -100` plus targeted `--stat` per path for un-folded renames/bumps.
5. Classify drift into **stale / missing / wrong**, each with a source-of-truth citation.
6. Apply every fix in place, preserving section order, heading style, and voice.
7. Print a grouped diff summary with citations, ending `N stale, M missing, K wrong → AGENTS.md
   updated` (or `no drift detected`).

Unresolvable discrepancies are surfaced as `needs human decision` rather than guessed. The command
is scoped to touch **only** `AGENTS.md` — never wiki pages, code, or configs.

## Step 3 — Line-wrap the existing command descriptions

`wiki-consistency.md`, `wiki-dedup.md`, and `wiki-update.md` all had single-line frontmatter
descriptions over ~80 chars; each `description:` is now folded across multiple YAML lines with a
trailing period. In `wiki-consistency.md` the fix-the-page sub-bullet was also re-indented so the
markdown list nesting reads correctly. Purely cosmetic — the prompts' behavior is unchanged.

## Step 4 — Update tests and bump the version

- `test/commands.test.ts` and `test/index.test.ts`: the expected command list grows from
  `["wiki-consistency", "wiki-dedup", "wiki-update"]` to include `wiki-agents-file.md` and
  `wiki-archive.md` in three places (fresh-install check, no-overwrite seed, no-op re-load check).
- `package.json`: `0.4.0-b` → `0.4.1-a` (interim prerelease tag, as before).

No `src/` change: the factory already globs `commands/*.md` ([[2026-08-06-install-only-plugin-refactor]]),
so the two new prompts install automatically.

## Test Results

```
$ bun run lint && bun run typecheck && bun test
   lint clean, typecheck clean, 8 pass / 0 fail
```

## Follow-ups

- `/wiki-archive`'s "no target — archive without merge" path drops `[[...]]` links and `related:`
  entries; a future run should exercise that branch against a real page to confirm the link
  cleanup is complete.
- `/wiki-agents-file` is untested against a real repo drift; first real run will show whether the
  source-of-truth priority needs refinement (e.g. when code and wiki contradict with no git
  history).
- `package.json` version `0.4.1-a` is an interim prerelease tag — confirm the final version before
  `make publish`.

## References

- Related: [[2026-08-06-install-only-plugin-refactor]]
- External: [OpenCode Commands](https://opencode.ai/docs/commands/)

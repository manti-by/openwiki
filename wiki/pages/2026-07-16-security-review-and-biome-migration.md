---
title: Security Review and Biome Migration
date: 2026-07-16
type: implementation
status: resolved
session_id: a2d4837d-2c5c-447b-9796-e8299c2c723c
services: []
branch: master
tickets: []
tags: [security, code-review, tooling, biome, eslint, hygiene]
related: [2026-07-16-npm-first-publish-fixes.md]
---

# Security Review and Biome Migration

## TL;DR

Ran a whole-repo review (not a diff review) for industry-standard practices and found/fixed a
path-traversal vulnerability in the Wiki Agent's file-write logic, a dead runtime dependency, and
a stale unscoped package name across the docs. Then replaced ESLint with Biome as the project's
single linter + formatter and reformatted the codebase to match.

---

## Overview

Two-part session: first an ad hoc security/hygiene review of the whole repository (source,
`package.json`, CI workflows, docs — everything, not just the working-tree diff), then a tooling
migration swapping the ESLint-only, no-formatter setup for Biome.

## Step 1 — Security & hygiene review

### Findings

1. **Path traversal / arbitrary file write (high).**
   **File:** `src/index.ts` (`onSessionIdle`)
   The filename for a newly-written wiki page came straight from the child session's parsed JSON
   reply (`decision.filename`) with zero validation, then went into
   `path.join(pagesRoot(directory), filename)` → `fs.writeFile`. Since transcripts routinely carry
   untrusted external content (pasted issues, fetched pages, tool output), a crafted transcript
   could steer the model into replying with a `../../.ssh/authorized_keys`-style filename and
   write attacker content outside `wiki/pages/`. `wiki.ts` already had a safe filename builder
   (`pageFilename()`, backed by `slugify()`) that `index.ts` simply wasn't using.
   **Fix:** derive the filename from `pageFilename(today, decision.title)` instead of trusting
   `decision.filename` — `slugify()` strips everything except `[a-z0-9-]`, so the result can never
   escape `wiki/pages/`.

2. **Dead runtime dependency (low).**
   **File:** `package.json`
   `@opencode-ai/sdk` was listed under `dependencies` but never imported anywhere in `src/` —
   `grep -rn "opencode-ai/sdk" src/` returned nothing. Contradicts the project's own documented
   "no runtime deps" constraint (only `@opencode-ai/plugin`, a devDependency, should be needed).
   **Fix:** removed it from `dependencies`.

3. **Stale unscoped package name across docs (low).**
   **File:** `opencode.json`, `README.md`, `AGENTS.md`, `CLAUDE.md`
   `package.json`'s `name` is the scoped `@manti-by/openwiki` (renamed earlier the same day, see
   [[2026-07-16-npm-first-publish-fixes]], to dodge an npm name collision with an unrelated
   package), but every doc and `opencode.json`'s `"plugin": [...]` example still referenced the
   unscoped `openwiki`. Confirmed via `npm view openwiki` that the unscoped name belongs to an
   unrelated DeepAgents/LangChain CLI, so the scoped name is the one to keep.
   **Fix:** updated all doc/config references to `@manti-by/openwiki` instead of reverting the
   rename.

### Summary table

| # | Severity | File | Description |
|---|----------|------|--------------|
| 1 | High | `src/index.ts` | LLM-controlled filename written to disk unsanitized (path traversal) |
| 2 | Low | `package.json` | Unused `@opencode-ai/sdk` runtime dependency |
| 3 | Low | `opencode.json`, `README.md`, `AGENTS.md`, `CLAUDE.md` | Docs referenced the pre-rename unscoped package name |

## Step 2 — ESLint → Biome migration

- Removed `eslint`, `@eslint/js`, `typescript-eslint`, `globals`, and `eslint.config.js`.
- Added `@biomejs/biome` (2.5.4) and `biome.json`: 2-space indent, double quotes, semicolons
  `"asNeeded"`, 120-char line width, `noExplicitAny` off (mirrors the old ESLint override),
  `organizeImports` on. Excludes `dist/`, `bun.lock`, and `.zed/` (editor config is not project
  code the formatter should touch).
- `package.json` scripts: `lint` now runs `biome check .` (lint + format-check + import order in
  one pass); added `format` → `biome check --write .`.
- `Makefile`: added a `format` target.
- Reformatted `src/` and `test/` with Biome — mostly import-sort fixes, plus one manual
  template-literal cleanup in `wiki.ts`'s `upsertIndexEntry`.
- No GitHub Actions changes needed — both workflows just call `make check` / `make install`,
  which already route through the Biome-backed `lint` script.
- Updated `CLAUDE.md`, `AGENTS.md`, `README.md`, `DOCS.md` to describe Biome instead of ESLint.

## Test Results

- `npm run check` (lint → typecheck → test) passed after each change: Biome clean, `tsc --noEmit`
  clean, 19/19 tests passing.
- `bun run build` + `bun run build:types` succeeded (`dist/index.js`, 11.74 KB).
- `npm view openwiki` confirmed the unscoped name belongs to an unrelated package, grounding the
  docs fix instead of guessing.

---

## Follow-ups

- None blocking. Changes were verified locally but not committed during this session.

## References

- Related: [[2026-07-16-npm-first-publish-fixes]]
- External: —

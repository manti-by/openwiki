---
title: OpenWiki Plugin Design Spec
date: 2026-07-15
type: investigation
status: reference
session_id: 02964221-6c57-43d6-9377-e59e331b65e0
services: []
branch: master
tickets: []
tags: [architecture, design-spec, wiki-agent, consistency-agent, dedup-agent, reference]
related: [2026-07-14-systematic-codebase-exploration-and-architecture.md]
---

# OpenWiki Plugin Design Spec

## TL;DR

Converted from the repo-root `DOCS.md` (created 2026-07-15, renamed from the original
`DESCRIPTION.md`), this is the canonical design spec for the OpenWiki plugin: what the `wiki/`
directory contains, and how the Wiki Agent, Consistency Agent, and Dedup Agent each work. Kept as
a living reference page rather than a session recap — update it in place as the design evolves,
the way `DOCS.md` used to be edited directly.

---

## Net effect

OpenWiki is an OpenCode plugin (Claude Code support planned) that maintains a local wiki for the
current project. The wiki is a directory `wiki/` in the project root containing:

- **INDEX.md** — a catalog of links to all wiki pages with a one-line summary, newest first, plus
  a "By topic" section grouping pages by topic clusters.
- **README.md** — conventions and a description of how the wiki works (the "schema").
- **TEMPLATE.md** — the unified page template every page starts from.
- **QUESTIONS.md** — open questions from the Consistency Agent about wiki discrepancies, awaiting
  a human answer.
- **pages/** — the wiki pages themselves: plain Markdown files named `YYYY-MM-DD-page-title.md`.

The wiki structure is **not** created automatically — an explicit init command (`/wiki-init`)
creates `wiki/` from the bundled templates (filling in the project name). Until the user runs it,
the plugin does nothing.

## Wiki Agent

After every assistant response (when the agent finishes work and answers a user prompt), a
background subagent — the **Wiki Agent** — creates or updates the wiki page linked to the current
session. The page is a living summary of that session; subsequent responses in the same session
update the same page (matched by `session_id` in the frontmatter).

The Wiki Agent decides whether a session is page-worthy: trivial sessions (quick Q&A, one-liners)
and sessions that are primarily wiki bookkeeping (dedup, consistency runs) are skipped. A page is
only written when the session matches one of the page types: `debug`, `investigation`,
`code-review`, or `implementation`.

Whenever a page is created or its summary changes, the Wiki Agent keeps INDEX.md current. It can
also be force-invoked immediately via `/wiki-write`, useful for capturing a session before it goes
idle.

## Consistency Agent

`/wiki-consistency` runs the **Consistency Agent**, which:

1. Reads INDEX.md and the page summaries.
2. Clusters pages by semantic similarity of their subject matter (frontmatter tags/services are
   hints, not the grouping key).
3. Cross-checks the pages within each cluster for contradictory claims.
4. Tries to resolve each discrepancy against the current codebase, connected MCPs, and other
   available data sources, updating the outdated page(s).
5. If a discrepancy cannot be resolved with confidence, writes a question for a human into
   **QUESTIONS.md**, linking the conflicting pages and the evidence checked.
6. Rebuilds the "By topic" section of INDEX.md from the clusters — topics with the most pages
   first.

On a later run, the Consistency Agent picks up human answers written in QUESTIONS.md, applies them
to the affected pages, and moves the entry to the Resolved section.

## Dedup Agent

`/wiki-dedup` runs the **Dedup Agent**, which finds near-duplicate pages (~85-90% similar — same
session or topic covered from the same angle) and merges each pair: the more recent page survives,
frontmatter (`tags`, `related`) is unioned, unique body sections are combined, the duplicate file
is deleted, and every cross-reference to it (in `INDEX.md` and other pages' `related`/`[[...]]`
links) is repointed or removed. Repeats until no more near-duplicates remain.

## Configuration

Create `openwiki.json` in the project root to set the Wiki Agent's model:

```json
{
  "model": "opencode/deepseek-v4-flash-free"
}
```

If the file is absent or has no `model` property, the Wiki Agent uses the same model as the
current session's first user message, then falls back to the default from `opencode.json`.

## Tech stack

- **TypeScript** — source in `src/` (`*.ts`), compiled to `dist/` via `bun build`.
- **Bun** — package manager, test runner, and bundler for development. No npm or Node.js required
  to develop the plugin (the plugin itself only needs Node >= 18 to run, per `engines` in
  `package.json`).
- **Biome** — linting and formatting in one tool (`biome.json`), see
  [[2026-07-16-security-review-and-biome-migration]].

### Working with Bun

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`.
- Use `bun test` instead of a separate test runner (`test/*.test.ts` use `node:test`/`node:assert`
  style APIs, which Bun's runner executes directly).
- Use `bun install` / `bun run <script>` / `bunx <package>` instead of the npm/yarn/pnpm
  equivalents.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile in new code, where it doesn't complicate
  testability.

## Open questions

- Claude Code support is noted as "planned" in the original doc — no tracking ticket or milestone
  exists for it yet.

---

## Follow-ups

- `DOCS.md` at the repo root is superseded by this page and was deleted; `README.md`'s
  "See DOCS.md for the full design spec" link was repointed here.
- Keep this page current by editing it directly (it's a reference page, not a session log) —
  the Consistency Agent will otherwise flag it as stale against future architecture changes.

## References

- Related: [[2026-07-14-systematic-codebase-exploration-and-architecture]]
- Related: [[2026-07-16-security-review-and-biome-migration]]
- External: —

---
title: Systematic OpenWiki Codebase Exploration and Architecture Analysis
date: 2026-07-14
type: investigation
status: reference
session_id: ses_0a013aa80ffe5ZwBXMcOigXDD8
merged_sessions: [ses_0a0112267ffemILrD1H8Bv5x8d, ses_0a011e2bbffeJblXP7avdmH7gp, ses_0a01955d9ffens56OEB2iVkPgH, ses_0a0128eaaffe0oj1di3iGzXF7g]
services: [core]
branch: -
tickets: []
tags: [exploration, architecture, plugin-system, onboarding]
related: [2026-07-13-comprehensive-project-exploration.md, 2026-07-13-project-audit.md]
---

# Systematic OpenWiki Codebase Exploration and Architecture Analysis

## TL;DR

Read every source file, template, command definition, test, and config in the OpenWiki project and produced a complete architectural reference: full directory tree, plugin wiring (entry point to tools to event handler), Wiki Agent lifecycle (session.idle to child session to JSON parse to page write), Consistency Agent inline workflow, wiki page schema (frontmatter plus body per type), and command registration flow. The output serves as onboarding documentation and a system map for extension.

---

## Net effect

Produced the first complete end-to-end architectural reference for the OpenWiki codebase. All 20+ files were read and synthesized into a coherent description with directory tree, architecture diagram, and component interaction summary.

## Plugin Entry and Wiring

**File:** `src/index.ts` exports `OpenWiki({ client, directory })` returning:
- `tool`: `openwiki_init` (scaffolds wiki/), `openwiki_write` (forces wiki page write)
- `event`: handles `session.idle` at `src/index.ts:165`

The host injects `@opencode-ai/plugin` at runtime; `.opencode/plugins/openwiki.js` re-exports from `dist/index.js`. Registered via `opencode.json` with `"plugin": ["openwiki"]`.

## Command Registration Flow

Source-of-truth command definitions live in `commands/wiki-{init,write,consistency}.md`. On `/wiki-init`, they are copied to `.opencode/commands/` (idempotent). OpenCode reads these and registers them as slash-commands. All three use `agent: build` (inline). `wiki-init` and `wiki-write` delegate to tools; `wiki-consistency` runs its logic entirely via the inline agent prompt.

## Wiki Agent Lifecycle

**Trigger:** `session.idle` in `src/index.ts:onSessionIdle()`

1. Pre-filter — skip if `wiki/` uninitialized, sessionId missing, or transcript < 80 chars (`src/index.ts:169-177`)
2. Read conventions — load `wiki/README.md` + `wiki/TEMPLATE.md` (`src/index.ts:181-185`)
3. Check existing — `findExistingPageForSession()` in `src/lib/wiki.ts:69-85` scans `wiki/pages/*.md` frontmatter for matching `session_id`
4. Resolve model — `openwiki.json` to parent session model to `opencode.json` default (`src/index.ts:199-213`)
5. Spawn child session — `client.session.create()` + `client.session.prompt()` with `buildWikiAgentPrompt()` from `src/lib/summarize.ts:17-82`
6. Parse response — `parseAgentJson()` in `src/lib/summarize.ts:84-108` handles bare JSON, fenced JSON, and stray prose
7. Write page — save to `wiki/pages/<filename>`, update `wiki/INDEX.md` via `upsertIndexEntry()` at `src/lib/wiki.ts:37-56`

**File:** `src/lib/summarize.ts` — `buildWikiAgentPrompt()` builds prompt with README, TEMPLATE, full transcript, existing page info, and JSON-only reply instruction.

**File:** `src/lib/wiki.ts` — path helpers, regex frontmatter parser (`/---\n([\s\S]*?)---/`), `slugify()` (lowercase, hyphenate, max 60 chars), `upsertIndexEntry()` (sorts newest-first by date), `findExistingPageForSession()` (scans all pages).

## Consistency Agent Workflow

**Command:** `/wiki-consistency` — runs inline via `agent: build`. Full workflow in `commands/wiki-consistency.md`:

1. Answer sweep — read `QUESTIONS.md`, apply human answers, move resolved entries
2. Cluster — read all pages, group by semantic subject similarity
3. Cross-check — find conflicting claims within clusters
4. Resolve — check current codebase, update outdated pages with change trail
5. File unresolved — append to `## Open` in `QUESTIONS.md`
6. Rebuild topic index — regenerate `## By topic` in `INDEX.md` from clusters

## Wiki Page Schema

**Naming:** `wiki/pages/YYYY-MM-DD-kebab-case-topic.md`

**Frontmatter:** required: `title`, `date`, `type`, `status`, `session_id`. Optional: `services`, `branch`, `tickets`, `tags`, `related`. Parsed via simple regex (no YAML dep).

**Body sections:**
- `debug`: Symptom to Steps to Root cause to Resolution
- `investigation`: Net effect to Subsystem sections to Open questions
- `code-review`: Numbered findings to Summary table
- `implementation`: Overview to Steps with before/after to Test Results

**Cross-linking:** `[[filename-without-.md]]` in body, mirrored in `related:` frontmatter.

## Key Architectural Insights

- Child session for Wiki Agent — expensive prompt (full transcript plus conventions) runs in separate session to avoid bloating parent context
- Inline for Consistency Agent — cheaper, needs direct filesystem access
- No YAML library — frontmatter parsed via regex, keeping deps at zero
- Model override chain: `openwiki.json` to parent session model to `opencode.json` default — three tiers of control
- The `tool()` wrapper at `src/index.ts:89` binds tool parameters (schema, handler, etc.)

---

## Follow-ups

- None

## References

- Related: [[2026-07-13-comprehensive-project-exploration.md]], [[2026-07-13-project-audit.md]]
- External: https://opencode.ai — OpenCode plugin API
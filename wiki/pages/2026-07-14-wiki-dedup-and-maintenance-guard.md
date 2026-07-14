---
title: Wiki Dedup Command and Maintenance Guard
date: 2026-07-14
type: implementation
status: resolved
session_id: ses_0a00dc108ffejaDDjk8jixScDv
services: []
branch: -
tickets: []
tags: [wiki, tooling, maintenance, event-handler]
related: []
---

# Wiki Dedup Command and Maintenance Guard

## TL;DR

Added `/wiki-dedup` — a command that finds ~85-90% similar wiki pages and merges them, keeping the most recent date/session_id. Then added a two-layer guard (event handler regex + prompt instruction) to prevent the Wiki Agent from auto-creating pages when maintenance commands trigger `session.idle`.

---

## Overview

Two intertwined pieces of wiki tooling: the dedup command keeps the page corpus clean by merging near-duplicates, and the maintenance guard prevents the Wiki Agent from creating pages about its own maintenance work — which would create the very kind of duplication the dedup command is meant to clean up.

## Step 1 — `/wiki-dedup` command

**File:** `commands/wiki-dedup.md`

Reads all pages in `wiki/pages/`, compares every pair for ~85-90% semantic similarity (same `session_id` as strong signal), merges near-duplicates by keeping the more recent date/session_id as survivor, unions frontmatter and body, deletes the duplicate, updates `INDEX.md`, and fixes `[[...]]` cross-links in remaining pages. Repeats until no more duplicates found.

## Step 2 — Event handler guard

**File:** `src/index.ts:122-126`

Added a regex scan of the transcript for `/wiki-dedup` or `/wiki-consistency` slash commands. Returns early from `onSessionIdle` before spawning the Wiki Agent child session.

```ts
const maintenancePatterns = [/\\/wiki-dedup\\b/, /\\/wiki-consistency\\b/]
if (maintenancePatterns.some((p) => p.test(transcript))) return
```

## Step 3 — Prompt-level safety net

**File:** `src/lib/summarize.ts:48-51`

Added a paragraph telling the Wiki Agent to skip sessions about wiki bookkeeping (dedup, consistency, index repair). Catches edge cases the regex might miss — e.g., a session that mentions dedup in prose rather than as a slash command.

## Test Results

All checks pass on `bun run build`, `bun run lint`, `bun run typecheck`, `bun test`.

---

## Follow-ups

None

## References

- External: `/wiki-dedup` command at `commands/wiki-dedup.md`
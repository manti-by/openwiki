---
title: Wiki Agent Maintenance Guard
date: 2026-07-14
type: implementation
status: resolved
session_id: ses_0a0196c96ffelCT1RtN4n3NiyM
services: []
branch: -
tickets: []
tags: [wiki, tooling, maintenance, event-handler]
related:
  - 2026-07-14-wiki-dedup-command.md
---

# Wiki Agent Maintenance Guard

## TL;DR

Added a two-layer guard to prevent the Wiki Agent from auto-creating pages when maintenance commands (`/wiki-dedup`, `/wiki-consistency`) trigger the `session.idle` event. The guard catches these at the event handler level and at the agent prompt level.

## Overview

The Wiki Agent runs on every `session.idle` event, but maintenance commands like `/wiki-dedup` and `/wiki-consistency` produce internal sessions that look like legitimate project work. Without a guard, each dedup or consistency run would spawn a wiki page about itself — a useless meta loop.

**File:** `src/index.ts:122-126` — deterministic regex check on the transcript

**File:** `src/lib/summarize.ts:48-51` — prompt-level instruction as a safety net

## Step 1 — Event handler guard

Before: no check — every session.idle spawned a Wiki Agent child session.

After: added a regex scan of the combined transcript for `/wiki-dedup` or `/wiki-consistency` slash commands. Returns early before spawning any child session.

```ts
const maintenancePatterns = [/\\/wiki-dedup\\b/, /\\/wiki-consistency\\b/]
if (maintenancePatterns.some((p) => p.test(transcript))) return
```

## Step 2 — Prompt-level safety net

Before: the Wiki Agent prompt had no instruction about wiki bookkeeping sessions.

After: added a paragraph telling the agent to skip sessions about wiki maintenance (dedup, consistency, index repair). Catches edge cases where the transcript mentions dedup in prose rather than as a slash command.

```
Also skip sessions whose transcript is primarily about maintaining the wiki
itself — deduplicating pages, running consistency checks, repairing the index,
or other wiki bookkeeping. These sessions modify the wiki but are not project
work worth a page of their own.
```

## Test Results

- `bun run build` — passes
- `bun run lint` — passes
- `bun run typecheck` — passes
- `bun test` — passes

---

## Follow-ups

None

## References

- Related: [[2026-07-14-wiki-dedup-command]]
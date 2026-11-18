---
type: implementation
title: Writer Session Reuse for Wiki Agent
description: Cached child writer session ID in a dotfile to avoid creating a new session on every idle/wiki-write call
tags: [openwiki, plugin]
generated: { by: opencode/agent, at: 2026-07-22T12:00:00Z }
status: stable
resolution: resolved
date: 2026-07-22
session_id: ses_077418c7bffeUy7XEbVWJPr7sC
services: []
branch: "-"
tickets: []
related: [pages/2026-07-28-warp-notification-flicker-fix]
---

# Writer Session Reuse for Wiki Agent

## TL;DR

Each `session.idle` and `/wiki-write` call was creating a brand-new child session, wasting context on repeated model warm-up. Now the writer session ID is cached to `wiki/.openwiki-writer-session` and reused across invocations with a liveness check.

---

## Overview

The Wiki Agent spawns a child session via `client.session.create` to write pages. Previously every `session.idle` or `/wiki-write` tool invocation created a fresh session. This added unnecessary overhead. The fix caches the session ID in a dotfile and reuses it.

## Step 1 — Add session cache helpers to `src/lib/wiki.ts`

Added `WRITER_SESSION_FILE` constant, `getCachedWriterSession()`, and `saveCachedWriterSession()` functions that read/write a JSON file at `wiki/.openwiki-writer-session`.

**File:** `src/lib/wiki.ts`

## Step 2 — Update `src/index.ts` to reuse cached session

Changed both the `openwiki_write` tool handler and the idle handler to call `getCachedWriterSession()` first. If a cached session exists, verify it is still alive via `client.session.messages`; if that succeeds, reuse it. Otherwise create a fresh session and cache it.

## Test Results

```
$ bun run lint && bun run typecheck && bun test
$ bun run lint
$ bun run typecheck
$ bun test
PASS 19/19 tests passed
```

All 19 tests pass, lint clean, typecheck clean.

---

## Follow-ups

None

## References

- External: none
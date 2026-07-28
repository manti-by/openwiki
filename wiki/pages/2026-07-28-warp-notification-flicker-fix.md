---
title: Fix Warp Notification Flicker from the Background Writer Session
date: 2026-07-28
type: debug
status: resolved
session_id: -
services: []
branch: master
tickets: []
tags: [openwiki, plugin, notifications, warp, opencode]
related: [2026-07-22-writer-session-reuse.md]
---

# Fix Warp Notification Flicker from the Background Writer Session

## TL;DR

Running OpenWiki inside Warp (with the `@warp-dot-dev/opencode-warp` notification plugin)
caused flickering native notifications whenever the Wiki Agent worked in the background.
Root cause: OpenWiki created its writer session with **no `parentID`**, so Warp treated it as
a foreground user session and fired a notification for every lifecycle event it emitted. Fix:
create the writer as a child session (`parentID` set), which Warp already suppresses, and stop
OpenWiki's own idle handler from documenting background/child sessions.

---

## Symptom

With the Warp plugin installed, every background Wiki Agent run produced a burst of native
Warp notifications that flickered over (and clobbered) the real session's completion
notification.

## Step 1 — How Warp decides what to notify

The Warp plugin fires an OSC-777 native notification on `session.created`, `chat.message`,
`tool.execute.after`, `permission.*`, and `session.idle`. It already suppresses background
work — but keys entirely off `parentID`:

```js
// @warp-dot-dev/opencode-warp dist/index.js
async function isSubagentSession(sessionId) {
  const session = await client.session.get({ path: { id: sessionId } })
  return !!session.data?.parentID          // the only signal it uses
}
async function maybeWarpNotify(sessionId, body) {
  if (await isSubagentSession(sessionId)) return
  warpNotify(...)
}
// session.created also short-circuits: `if (info.parentID) return`
```

## Step 2 — OpenWiki's writer had no parent

**File:** `src/index.ts` (`getOrCreateWriterSession`, before the fix)

```ts
const childSession = await client.session.create({
  body: { title: "openwiki writer" },   // no parentID → looks like a real user session
})
```

So Warp saw the writer as top-level and notified on its `session.created` / `chat.message` /
`tool.execute.after` / `session.idle` — the flicker.

A second, related churn source: when the writer session went idle, OpenWiki's *own*
`session.idle` handler fired for it (a different id, not yet in `processedSessions`), spawning a
prompt to document the writer session about itself — extra host events and a bogus
self-referential page.

## Root cause

The writer session was indistinguishable from a foreground user session because it carried no
`parentID`, the exact field Warp (and OpenCode) use to mark subagents. Confirmed the SDK
supports the field: `SessionCreateData.body` accepts `{ parentID?: string; title?: string }`.

## Resolution / Fix

**File:** `src/index.ts`

1. Create the writer as a child of the triggering session:

```ts
const childSession = await client.session.create({
  body: { title: "openwiki writer", parentID: parentSessionId },
})
```

`parentID` is baked in at creation and persists across the cached-session reuse
(see [[2026-07-22-writer-session-reuse]]); if the parent is later deleted, the existing
liveness check recreates the writer, so it is self-healing.

2. Guard the `session.idle` handler with `isBackgroundSession`, which skips OpenWiki's own
cached writer (short-circuits before any `session.get`) and any session with a `parentID`:

```ts
if (await isBackgroundSession(client, directory, sessionId)) return
```

`session.get` is optional (`?.`) and wrapped in try/catch, so on hosts without it the guard
degrades to the cached-writer check and never throws.

## Test Results

Added `test/index.test.ts` (4 tests) driving the exported `OpenWiki` factory with a mock client:
writer is created with the triggering `parentID`; subagent sessions (with a `parentID`) are
skipped; the cached writer is skipped without a `session.get`; non-idle events are ignored.

```
$ make check
23 pass / 0 fail   (lint clean, typecheck clean)
```

---

## Follow-ups

- None. The fix requires no cooperation from the Warp plugin — it relies on Warp's existing
  `parentID` suppression.

## References

- Related: [[2026-07-22-writer-session-reuse]]
- External: [warpdotdev/opencode-warp](https://github.com/warpdotdev/opencode-warp), [OpenCode Plugins](https://opencode.ai/docs/plugins/)

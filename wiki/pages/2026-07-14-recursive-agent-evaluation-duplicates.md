---
title: Recursive Wiki Agent Evaluations Causing Duplicate Pages
date: 2026-07-14
type: investigation
status: resolved
session_id: ses_0a00da217ffeBq08LOqfGiyM9w
services: [core]
branch: -
tickets: []
tags: [wiki-agent, dedup, recursion, meta]
related: [2026-07-14-duplicate-page-cleanup.md]
---

# Recursive Wiki Agent Evaluations Causing Duplicate Pages

## TL;DR

Multiple independent Wiki Agent evaluations of the same codebase exploration transcript produced ~90% similar pages. The root cause: the Wiki Agent evaluates each session in isolation via its own child session, with no awareness of other pages created in the same timeframe. Once detected, a cleanup was performed using the dedup command plus manual steps.

---

## Net effect

The session exposed a structural gap in the Wiki Agent: it has no pre-check to skip evaluations when the current transcript closely matches a recently-evaluated session. This led to 3+ duplicate pages before the agent self-corrected by running the dedup workflow and manually merging the rest.

## Root cause

The Wiki Agent is triggered on `session.idle` for every session independently. When the same user prompt is evaluated across multiple sessions (e.g. from a broken retry loop or replayed evaluations), each one produces a separate page because the agent has no cross-session de-duplication logic and no awareness of what other pages were recently created.

## The chain of events

1. User sent the same codebase exploration prompt ~14 times across different sessions
2. Each session's `session.idle` event spawned a child Wiki Agent
3. Each child agent independently decided the session was worth a page (type: investigation, about architecture)
4. 4+ near-identical pages were created with different filenames but ~85-90% overlapping content
5. After detecting the pattern, ran `/wiki-dedup` which merged them
6. Manually removed leftover INDEX.md entries and restored one unrelated entry accidentally caught in the sweep

## Resolution

The dedup command (`commands/wiki-consistency.md`) handles ~85-90% similarity merges by clustering pages, keeping the newest date/session, and updating frontmatter with merged `session_id` values. Manual cleanup was needed for INDEX.md stale references.

## Open questions

- Should the Wiki Agent check if other pages in `wiki/pages/` share a high overlap before creating a new one?
- Should the session.idle handler keep a short window cache of recently-evaluated session transcripts to detect duplicates at the entry point?

---

## Follow-ups

- Consider adding a transcript similarity pre-check (maybe using a hash or embedding) at `src/index.ts:onSessionIdle()` before spawning the child session
- The dedup command should ideally also remove INDEX.md entries for deleted files automatically

## References

- Related: [[2026-07-14-duplicate-page-cleanup.md]]
---
title: Wiki Deduplication Command
date: 2026-07-14
type: implementation
status: resolved
session_id: ses_0a011b6a0ffeq1IktMNWZtdZyt
services: []
branch: -
tickets: []
tags: [wiki, dedup, tooling, commands]
related:
  - 2026-07-14-wiki-consistency-review.md
---

# Wiki Deduplication Command

## TL;DR

Created `commands/wiki-dedup.md` — an inline agent command that finds near-duplicate wiki pages (~85-90% semantic similarity), merges them keeping the most recent date and session_id, and updates INDEX.md and cross-references. Also repaired INDEX.md with missing entries and topic clusters.

## Overview

The wiki had no mechanism to detect or merge near-duplicate pages. The user requested a command that, given pages covering the same investigation or topic from slightly different angles, would merge them into one.

**File:** `commands/wiki-dedup.md` — the dedup command spec

**File:** `AGENTS.md` — added `/wiki-dedup` to the command table

**File:** `wiki/INDEX.md` — repaired missing entries, updated dates, added topic clusters

## Step 1 — Create the dedup command

Before: no dedup existed. After: a full 53-line agent command spec at `commands/wiki-dedup.md` with a 7-step pipeline:

1. **Read all pages** — parse frontmatter and body from every `.md` in `wiki/pages/`
2. **Pairwise comparison** — assess ~85-90% semantic similarity; same `session_id` is a strong signal
3. **Merge** — survivor picks the more recent date/session_id, unions frontmatter fields and body sections
4. **Clean up** — delete the duplicate file
5. **Update INDEX.md** — remove deleted entry, update survivor if needed
6. **Update cross-references** — rewrite `related:` and `[[...]]` links in remaining pages
7. **Repeat** — loop until no more duplicates found

## Step 2 — Update AGENTS.md

Added a one-line entry to the command table in `AGENTS.md:17`:

```
| Deduplicate pages | `/wiki-dedup` (finds ~85-90% similar pages, merges them keeping the newest date/session) |
```

## Step 3 — Repair INDEX.md

Restored three missing page entries (including the JS-to-TypeScript migration, project audit, consistency review), corrected a date (migration page was dated 2026-07-13 but belonged to 2026-07-14), and added topic clusters (### Project Audit & Documentation, ### Plugin System, ### Documentation & Tooling, ### Build & Migration).

## Test Results

No automated tests; the command is an inline agent spec (`agent: build`) that runs inside the OpenCode session. Verified by reading the command spec and confirming the INDEX changes rendered correctly.

---

## Follow-ups

- The dedup command has not been run yet — should be exercised on the current wiki to check for any existing near-duplicates

## References

- Related: [[2026-07-14-wiki-consistency-review]]

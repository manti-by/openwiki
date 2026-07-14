---
title: Project Structure and Documentation Audit
date: 2026-07-13
type: investigation
status: reference
session_id: ses_0a2bb4272ffe1YREYHGaXc54Pu
services: [core]
branch: master
tickets: []
tags: [audit, exploration, documentation]
related: []
---

# Project Structure and Documentation Audit

## TL;DR

Thoroughly explored every source file in the OpenWiki codebase and compared the actual implementation against `README.md` and `AGENTS.md`. Found three discrepancies: `/wiki-write` command is undocumented, plugin name in docs (`opencode-openwiki`) differs from actual config (`openwiki`), and the `.opencode/` deployment layering is not described.

---

## Net effect

The project's core functionality is verified and matches the documented architecture. Three documentation gaps were identified: the `/wiki-write` command is missing from `AGENTS.md`'s command table, the plugin name in `README.md` install docs (`opencode-openwiki`) differs from the actual `opencode.json` (`openwiki`), and the `.opencode/` deployment layering is not described anywhere.

### Documentation Match

The following aspects of the codebase match the documented architecture:

- **Entry Point**: `src/index.js` correctly exports `OpenWiki`.
- **Dependencies**: `@opencode-ai/plugin` is correctly identified as a dev dependency.
- **Runtime Type**: Project correctly configured for ESM and zero-build workflow.
- **Features**: Logic for init check, auto-summary on idle, and consistency checks are all confirmed present.

## Project Structure

Every non-`node_modules`, non-`.git` file was read. The project layout matches the documented structure:

- **`src/`** — `index.js` (entry point), `lib/summarize.js` (prompt building, transcript extraction, JSON parsing), `lib/wiki.js` (path helpers, frontmatter parsing, index management)
- **`templates/`** — README.md, TEMPLATE.md, INDEX.md, QUESTIONS.md (scaffolded into `wiki/` on init)
- **`commands/`** — `wiki-init.md`, `wiki-consistency.md`, `wiki-write.md`
- **`test/`** — `summarize.test.js` (7 tests), `wiki.test.js` (9 tests)
- **`wiki/`** — initialized with one existing page (`2026-07-13-plugin-load-and-crash.md`)
- **`.opencode/`** — `plugins/openwiki.js` (re-export shim), `commands/` (installed copies), `package.json`

## Documentation Consistency Audit

Comparing actual code against `README.md` and `AGENTS.md` revealed three discrepancies:

1. **Missing `/wiki-write` command** — `AGENTS.md`'s command table lists only `lint`, `test`, `check`; the `/wiki-write` command and `openwiki_write` tool exist in code but are undocumented.
2. **Plugin name mismatch** — `README.md` install docs say `"opencode-openwiki"` but actual `opencode.json` uses `"openwiki"`.
3. **`.opencode/` deployment layering** — The `.opencode/plugins/openwiki.js` re-export shim and `.opencode/commands/` installed copies are not described in either document.

### Summary Table

| Item | Status | Note |
| --- | --- | --- |
| Core Logic | Match | All core features verified. |
| Command List | Mismatch | `/wiki-write` missing from docs. |
| Plugin Identity | Mismatch | Names differ between doc (`opencode_openwiki`) and config (`openwiki`). |
| Infrastructure | Undocumented | `.opencode/` contents are more complex than documented. |

## Open questions

- Should `AGENTS.md` and `README.md` be updated to reflect the actual plugin name and command set?
- Should the `.opencode/` deployment structure be documented?

## Note — merged duplicate

This page was merged with the former `2026-07-13-audit-and-doc-verification.md` (same session `ses_0a2bb4272ffe1YREYHGaXc54Pu`). Both were produced from the same session as separate pages. The content has been consolidated here.

## Follow-ups

- Update documentation to match actual implementation if discrepancies are confirmed as actionable.

## References

- Related:
- External: N/A
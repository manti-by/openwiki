---
title: Project Audit and Documentation Verification
date: 2026-07-13
type: investigation
status: resolved
session_id: ses_0a2bb4272ffe1YREYHGaXc54Pu
services: [core]
branch: master
tickets: []
tags: [audit, documentation]
related: []
---

# Project Audit and Documentation Verification

## TL;DR
Performed a comprehensive audit of the codebase against `README.md` and `AGENTS.md`. Identified several discrepancies in commanded tools listing and plugin naming conventions that require alignment in the documentation.

---

## Net effect
The audit confirmed core functionality but highlighted missing references to the `/wiki-write` command and specific nuances in the `.opencode/` directory structure in the public-facing docs.

## Codebase vs_Documentation Audit

### Documentation Match
- **Entry Point**: `src/index.js` correctly exports `OpenWiki`.
- **Dependencies**: `@opencode-ai/plugin` is correctly identified as a dev dependency.
- **Runtime Type**: Project correctly configured for ESM and zero-build workflow.
- **Features**: Logic for initiative check, auto-summary on idle, and consistency checks are all confirmed present.

### Documentation Gaps
- **Missing Command**: The `/wiki-write` command exists in `commands/` and as a tool but is missing from the Tables in both `README.md` and `AGENTS.md`.
- **Plugin Naming**: Docs refer to `opencode-openwiki`, while the implementation uses `openwiki` in `.opencode/package.json`.
- **Internal Structure**: The multi-layered structure of `.opencode/plugins/` where a JS shim is used is not documented but is critical for deployment.

## Summary Table

| Item | Status | Note |
| --- | --- | --- |
| Core Logic | Match | All core features verified. |
| Command List | Mismatch | `/wiki-write` missing from docs. |
| Plugin Identity | Mismatch | Names differ between doc (`opencode_openwiki`) and config (`openwiki`). |
| Infrastructure | Undocumented | `.opencode/` contents are more complex than documented. |

## Follow-ups
- Update `README.md` to include `/wiki-write` in the commands list.
- Sync plugin naming convention in both `README.md` and `AGENTS.md`.
- Add a note about the `.opencode/` shim structure for internal team clarity.

## References
- Related: 
- External: 
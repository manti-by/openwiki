---
title: Troubleshooting Plugin Load and Crash Loop
date: 2026-07-13
type: debug
status: resolved
session_id: ses_0a2ddf374ffe5fzwJ9UKdcmCX0
services: [opencode, openwiki]
branch: -
tickets: []
tags: [plugin-fix]
related: []
---

# Troubleshooting Plugin Load and Crash Loop

## TL;DR

Resolved issues with plugin discovery, missing dependencies, and host crashes caused by `parseAgentJson` failing on non-JSON output from smaller models. Key fixes included moving the entry point to `.opencode/plugins/`, installing `@opencode-ai/plugin`, hardening `src/lib/summarize.js` against parsing failures, and updating the model in `openwiki.json`.

---

## Symptom

Plugins were not being discovered by host, commands were missing from the CLI, and the system entered a crash loop when processing non-JSON responses from local models.

## Step 1 — Plugin Discovery & Dependencies

The plugin was not loading because it wasn't in a valid search path. 

**File:** .opencode/plugins/openwiki.js
Moved the entry point to the project-level `.opencode/plugins/` directory and installed `@opencode-ai/plugin` as a devDependency.

## Step 2 — Command Availability

Commands were missing because corresponding definitions in `.opencode/commands/` did not exist prior to initialization.

**File:** .opencode/commands/wiki-init.md, wiki-consistency.md
Manually added the required command definition files to bootstrap the system.

## Root cause

1. **Host Limitation**: Reports indicate that host version 1.17+ has issues with global discovery and certain configuration arrays; project-local paths are the recommended workaround.
2. **Lack of Resilience**: `parseAgentJson` threw exceptions when encountering non-JSON content instead of returning a skip status, causing consecutive errors to overwhelm the host process.

## Resolution / Fix

1. Moved plugin entry point to `.opencode/plugins/openwiki.js`.
2. Installed `@opencode-ai/plugin` into `node_modules`.
3. Refactored `src/lib/summarize.js` to gracefully return `{skip: true}` on parsing failures.
4. Updated `openwiki.json` to use a more robust model (`gemma4:12b-opencode`).

## Known follow-up (not fixed this session)

None

## Follow-ups

- None

## References

- Related: 
- External: https://github.com/anomalyco/opencode/issues/33455
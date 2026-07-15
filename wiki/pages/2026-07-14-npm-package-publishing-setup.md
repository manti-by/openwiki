---
title: npm Package Publishing Setup
date: 2026-07-14
type: implementation
status: resolved
session_id: ses_09ebdf957ffeNbQ4X20fFQmw1r
services: []
branch: -
tickets: []
tags: [npm, publishing, ci, build]
related: []
---

# npm Package Publishing Setup

## TL;DR

Configured the OpenWiki repo to publish its plugin to npm. Added publish metadata to `package.json`, Makefile targets, a CI workflow with npm provenance, and cleaned up a dead constant import. Dry-run confirms 15 files (24 KB).

---

## Overview

Standardised package metadata, added declaration-file build step, and created a repeatable publish workflow via both `make` and GitHub release tags.

## Step 1 — package.json

Removed `"private": true`. Added `author`, `repository`, `homepage`, `bugs`, `engines`, and `publishConfig` fields. Added `build:types` script (`tsc --declaration --emitDeclarationOnly`). Updated `prepublishOnly` to run both `build` and `build:types`.

## Step 2 — Makefile

Added `buildtypes`, `prepublish`, `publish`, and `publish_dryrun` targets matching the existing make-based workflow.

## Step 3 — CI workflow

Created `.github/workflows/publish.yml` triggered on GitHub releases with `npm publish --provenance --access public`.

## Step 4 — Housekeeping

Updated `AGENTS.md` with dry-run and publish commands. Removed unused `COMMANDS_DIR` constant from `src/index.ts`.

## Test Results

- `make publish_dryrun` bundles 15 files (24 KB): `dist/`, `templates/`, `commands/`, package.json
- No lint regressions

---

## Follow-ups

- Tag a `v*` release on GitHub to trigger the publish workflow.

## References

- External:

---
title: First npm Publish — Name Collision, Version, and Auth Fixes
date: 2026-07-16
type: implementation
status: resolved
session_id: 6f5d8ee8-9516-4ba0-8a24-285b49fb1f91
services: []
branch: master
tickets: []
tags: [npm, publishing, ci, packaging, docs]
related: [2026-07-14-npm-package-publishing-setup.md]
---

# First npm Publish — Name Collision, Version, and Auth Fixes

## TL;DR

Follow-up to [[2026-07-14-npm-package-publishing-setup]]: walked through the project's actual
first publish attempt and fixed everything that broke along the way — an npm package-name
collision, an invalid semver version, a dead `workflow_dispatch` input, a local provenance
error, and a GitHub Actions auth failure. Also merged/revalidated `AGENTS.md`/`DESCRIPTION.md`/`DOCS.md`
and added `CLAUDE.md`. Package is renamed to `@manti-by/openwiki`; CI publish workflow should now
authenticate correctly.

---

## Overview

Continued the packaging work from the previous session by actually trying to ship a release.
Each attempt surfaced a new blocker; each was root-caused against the real registry/CLI/CI
behavior (not guessed) before fixing.

## Step 1 — Docs revalidation and merge

- Added `CLAUDE.md` (Claude Code guidance) describing the plugin's three-file `src/` architecture.
- Merged `DESCRIPTION.md` into `DOCS.md` (deleted `DESCRIPTION.md`), adding a Dedup Agent section
  that had never been documented, and updated `README.md`'s link accordingly.
- Revalidated `AGENTS.md`, which still described the pre-migration JS/Node setup (`src/index.js`,
  `npm test` via `node --test`, CI on Node 18/20). Corrected it to the current
  TypeScript/Bun/`bun test` setup and the real CI matrix (Bun 1.x via `.github/workflows/ci.yml`).

## Step 2 — Name collision and invalid version

**File:** `package.json`

`npm view openwiki` showed the name already registered to an unrelated project (a
DeepAgents/LangChain CLI by a different maintainer, published days earlier) — publishing under
`openwiki` would 403. Renamed to the scoped `@manti-by/openwiki`, which is always available under
the account's own scope.

Also found the version string (`0.2.1a`, later `0.3.0a`) isn't valid semver — confirmed with
node's bundled `semver.valid()` returning `null`. `npm publish` would reject it outright. Set to
`0.3.0-a` (valid prerelease syntax); later bumped to `0.3.0-b` outside this session.

## Step 3 — Dead workflow input

**File:** `.github/workflows/publish.yml`

`workflow_dispatch.inputs.tag` (npm dist-tag) was collected but never referenced in the publish
step — manual dispatches always published to `latest` regardless of the chosen tag. Fixed:

```yaml
run: npm publish --tag "${{ github.event.inputs.tag || 'latest' }}" --provenance --access public
```

## Step 4 — Local provenance error

Attempting `npm publish` locally hit:

```
npm error Automatic provenance generation not supported for provider: null
```

Cause: `package.json`'s `publishConfig.provenance: true` forces provenance generation on every
publish, even without `--provenance` on the CLI. Provenance needs a supported CI OIDC provider
(GitHub Actions, GitLab CI) — a local shell isn't one. Resolution: don't publish locally; use the
GitHub Actions workflow, which already has `permissions: id-token: write`. (A local `--no-provenance`
escape hatch exists if a no-attestation test publish is ever needed.)

## Step 5 — GitHub Actions ENEEDAUTH

**File:** `.github/workflows/publish.yml`

First real Actions run (with `NPM_TOKEN` set as a repo secret) failed:

```
npm error code ENEEDAUTH
npm error need auth This command requires you to be logged in to https://registry.npmjs.org/
```

Cause: the publish step set `NODE_AUTH_TOKEN` in `env`, but nothing ever wrote a `.npmrc` that
reads that variable. That wiring is normally generated automatically by `actions/setup-node`'s
`registry-url` input — this workflow only ran `oven-sh/setup-bun`, so the token was inert. Fix:
added a Node setup step ahead of the publish step, keeping Bun for install/build/test:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    registry-url: "https://registry.npmjs.org"
```

## Test Results

- `npm pack --dry-run` confirmed correct tarball name/contents (`manti-by-openwiki-0.3.0-a.tgz`;
  `dist/`, `templates/`, `commands/`, `README.md`, `LICENSE`, `package.json`) after the rename.
- `node`'s bundled `semver.valid()` used to confirm `0.2.1a`/`0.3.0a` are invalid and `0.3.0-a` is valid.
- `npm view openwiki` used to confirm the name collision before renaming (avoided guessing).
- ENEEDAUTH fix not yet verified end-to-end — next workflow run (release or manual dispatch)
  should confirm the `.npmrc` wiring resolves it.

---

## Follow-ups

- Confirm the next `publish.yml` run succeeds end-to-end and the published artifact carries a
  provenance attestation.
- `CLAUDE.md`'s "Slash commands" section still says `/wiki-init` installs commands into
  `.opencode/commands/` — `src/index.ts` no longer does this (command auto-install was dropped
  from `initWiki`). Needs a doc correction in a follow-up pass.
- Version is now on an alpha/beta suffix scheme (`0.3.0-a` → `0.3.0-b`); confirm this is the
  intended pre-release cadence going into the first `latest` release.

## References

- Related: [[2026-07-14-npm-package-publishing-setup]]
- External: —

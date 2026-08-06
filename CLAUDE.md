# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

OpenWiki is an **OpenCode plugin** (published to npm as `@manti-by/openwiki`) that scaffolds a per-project session wiki under `wiki/`. It is not a standalone app — `src/index.ts` exports a factory `OpenWiki({client, directory})` that OpenCode loads and calls with a host-provided client. The plugin is install-only: on load it copies slash commands into `.opencode/commands/` and writes the `wiki/` scaffold from `templates/`. It does not run any background agent, hook any events, or register any tools.

## Commands

- `bun install` — install dependencies
- `bun run build` — compile `src/` to `dist/` (`bun build`)
- `bun run build:types` — emit `.d.ts` only (`tsc --declaration --emitDeclarationOnly`)
- `bun test` — run all tests (Bun's runner executes the `node:test`-style specs in `test/`)
- `bun test test/wiki.test.ts` — run a single test file
- `bun run typecheck` — `tsc --noEmit`
- `bun run lint` — Biome lint + format check (`biome check .`, config in `biome.json`)
- `bun run format` — Biome auto-fix (`biome check --write .`)
- `npm run check` / `make check` — lint -> typecheck -> test (the CI gate)
- `make publish_dryrun` — check + build + `npm publish --dry-run`
- `make publish` — check + build + `npm publish`

CI (`.github/workflows/publish.yml`) publishes on GitHub release via `make install && make prepublish && npm publish --provenance`.

Tests import compiled-style paths (`../src/lib/wiki.js`, not `.ts`) even though the source is TypeScript — this is the standard ESM-with-TS convention (`moduleResolution: "bundler"` in `tsconfig.json`), not a build artifact reference.

## Architecture

Two-file source tree, all in `src/`:

- **`src/index.ts`** — the plugin entry point. Exports `OpenWiki({client, directory})` (the `client` argument is accepted for type compatibility with the host but is not used). On load it calls `install` which runs `installCommands` and `scaffoldWiki` back-to-back.
- **`src/lib/wiki.ts`** — pure filesystem helpers: `wikiRoot` resolves the project's `wiki/` directory, `exists` is a small `fs.access` wrapper. No string processing, no model calls, no host client.

`wiki.ts` has no host dependency and is directly unit-testable; `index.ts` is the thin orchestrator.

### Install flow

1. `installCommands` ensures `<project>/.opencode/commands/` exists, then copies every `commands/*.md` into it, skipping any file that already exists (never overwrites a user-customised command).
2. `scaffoldWiki` ensures `<project>/wiki/` exists, then writes each template (`README.md`, `TEMPLATE.md`, `INDEX.md`, `QUESTIONS.md`) with `<PROJECT_NAME>` substituted to the directory name, skipping any file that already exists.

Both steps are idempotent and safe to call repeatedly.

### Slash commands (`commands/*.md`)

Command definitions, installed into `.opencode/commands/` on plugin load: `/wiki-consistency`, `/wiki-dedup`, `/wiki-update`. They are plain markdown prompts for the user to invoke; the plugin does not implement or register any tool to call them programmatically.

### Templates vs. live wiki

`templates/` holds the bundled scaffold (`README.md`, `TEMPLATE.md`, `INDEX.md`, `QUESTIONS.md`) copied into a project's `wiki/` on init, with `<PROJECT_NAME>` substituted. `wiki/` in this repo is OpenWiki's own dogfooded wiki, not a template — don't confuse the two when editing.

## Key constraints

- **ESM + TypeScript, no runtime deps.** No import from `@opencode-ai/plugin`. The plugin only does filesystem work.
- **Install is idempotent.** Both `installCommands` and `scaffoldWiki` skip files that already exist. Re-running either is safe.
- **Biome is the sole linter and formatter** (`biome.json`) — covers both linting and formatting in one tool; don't introduce ESLint or Prettier alongside it.

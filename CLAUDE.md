# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

OpenWiki is an **OpenCode plugin** (published to npm as `@manti-by/openwiki`) that maintains a local, per-project session wiki under `wiki/`. It is not a standalone app — `src/index.ts` exports a factory `OpenWiki({client, directory})` that OpenCode loads and calls with a host-provided client.

## Commands

- `bun install` — install dependencies
- `bun run build` — compile `src/` to `dist/` (`bun build`, external `@opencode-ai/plugin`)
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

Three-file source tree, all in `src/`:

- **`src/index.ts`** — the plugin entry point. Registers two tools (`openwiki_init`, `openwiki_write`) and one event handler (`session.idle`). This is the only file that talks to the OpenCode host (`client.session.*`, `client.config.get`).
- **`src/lib/wiki.ts`** — pure filesystem/string helpers: path resolution (`wikiRoot`, `pagesRoot`), frontmatter parsing (a hand-rolled regex, no YAML dependency — see `splitFrontmatter`), slugify/filename generation, and `upsertIndexEntry` (keeps `wiki/INDEX.md`'s `## Pages` section deduplicated and newest-first).
- **`src/lib/summarize.ts`** — pure prompt-building and response-parsing: `buildWikiAgentPrompt` renders the prompt sent to the child session from `wiki-agent-prompt.txt` (a `{{token}}` template loaded via Bun's `type: "text"` import and inlined at build time — no runtime file I/O), `transcriptFromMessages` flattens OpenCode message objects into a role-tagged transcript, `parseAgentJson` tolerantly extracts a JSON object from a subagent reply (handles markdown fences and stray prose).

`wiki.ts` and `summarize.ts` have no dependency on `@opencode-ai/plugin` and are directly unit-testable; `index.ts` is the thin, host-coupled glue layer.

### Wiki Agent flow (the `session.idle` handler)

1. Skip if `wiki/` isn't initialized, or the session transcript is under `MIN_TRANSCRIPT_CHARS` (80).
2. Skip if the transcript matches wiki-maintenance-only patterns (`/wiki-dedup`, `/wiki-consistency`) — these sessions modify the wiki but aren't project work worth their own page.
3. Look up any existing page for this session via `session_id` in frontmatter (`findExistingPageForSession`) so repeated idle events update one page instead of creating duplicates.
4. Build a prompt from `wiki/README.md` + `wiki/TEMPLATE.md` + the transcript, resolve a model (`openwiki.json` -> first user message's model -> host config default), spawn an ephemeral child session (`client.session.create` + `client.session.prompt`), and parse its reply as strict JSON (`{"skip": true}` or full page content).
5. If not skipped, write/overwrite the page under `wiki/pages/` and upsert the `INDEX.md` entry.

The page-worthiness decision always belongs to the Wiki Agent (the LLM), never a hardcoded heuristic — `index.ts` only pre-filters near-empty/maintenance transcripts to avoid spawning a subagent for nothing.

### Slash commands (`commands/*.md`)

Four command definitions, installed into `.opencode/commands/` by `openwiki_init`: `/wiki-init` (calls the `openwiki_init` tool), `/wiki-write` (calls `openwiki_write` for the current session), `/wiki-consistency` (an inline agent that clusters pages, cross-checks for contradictions, resolves what it can, and files the rest in `QUESTIONS.md`), and `/wiki-dedup` (an inline agent that merges near-duplicate pages). The consistency/dedup commands run as prompts directly in the invoking session — they don't spawn a child session like the Wiki Agent does.

### Templates vs. live wiki

`templates/` holds the bundled scaffold (`README.md`, `TEMPLATE.md`, `INDEX.md`, `QUESTIONS.md`) copied into a project's `wiki/` on init, with `<PROJECT_NAME>` substituted. `wiki/` in this repo is OpenWiki's own dogfooded wiki, not a template — don't confuse the two when editing.

## Key constraints

- **ESM + TypeScript, no runtime deps.** `@opencode-ai/plugin` (the `tool` helper) is a devDependency, injected by the OpenCode host at runtime — it is not listed under `dependencies`.
- **Wiki is opt-in per project.** Nothing happens until `/wiki-init` runs; it is idempotent and never overwrites existing files.
- **Model config** lives in a project's `openwiki.json` (`{"model": "providerID/modelID"}`), read fresh on every `session.idle` — see `resolveModel` in `src/index.ts`.
- **Biome is the sole linter and formatter** (`biome.json`) — covers both linting and formatting in one tool; don't introduce ESLint or Prettier alongside it.

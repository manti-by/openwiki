# OpenWiki - agent guide

**This is an OpenCode plugin** (`openwiki`), not a standalone app.
Entry: `src/index.ts` exports `OpenWiki({client, directory})`.

## Commands

| Task | Command |
|------|---------|
| Install | `bun install` (or `make install`) |
| Build | `bun run build` (compiles `src/` to `dist/` via `bun build`, external `@opencode-ai/plugin`) |
| Lint | `bun run lint` (ESLint flat config, `eslint.config.js`) |
| Typecheck | `bun run typecheck` (`tsc --noEmit`) |
| Test | `bun test` (Bun's test runner; specs in `test/` use `node:test`/`node:assert` style) |
| All checks | `make check` (lint -> typecheck -> test) |
| Dry-run publish | `make publish_dryrun` (check + build + `npm publish --dry-run`) |
| Publish | `make publish` (check + build + `npm publish`) |
| CI publish | Publish a GitHub release — `.github/workflows/publish.yml` handles provenance |

CI (`.github/workflows/ci.yml`) runs `make install && make build && make check` on Bun 1.x for every push/PR.

## Key constraints

- **No runtime deps.** `@opencode-ai/plugin` (`tool`) is a devDependency, injected by the OpenCode host at runtime — not listed under `dependencies`. Code that imports it cannot be tested directly outside the host.
- **TypeScript + ESM**, built and tested with Bun (no Node/npm required for development). `src/index.ts` is the only file coupled to the host; `src/lib/wiki.ts` and `src/lib/summarize.ts` are pure and directly unit-testable.
- **Wiki is opt-in.** The plugin does nothing until `/wiki-init` is run (scaffolds `wiki/`, installs commands into `.opencode/commands/`). Idempotent — never overwrites existing files.
- **Wiki Agent** runs on `session.idle` (skips if wiki not initialized or transcript < 80 chars, or if the transcript is wiki-maintenance-only). Spawns a child session via `client.session.create` + `client.session.prompt`, expects pure JSON reply (`{skip:true}` or page content). Can also be force-invoked via the `openwiki_write` tool (`/wiki-write`).
- **Consistency Agent** (`/wiki-consistency`) and **Dedup Agent** (`/wiki-dedup`) run inline as prompts in the current session — no child session.
- **Frontmatter parsing** is a simple regex (`splitFrontmatter` in `src/lib/wiki.ts`) — no YAML library dependency.
- **Model config.** Create `openwiki.json` in the project root with `"model": "providerID/modelID"` (e.g. `"anthropic/claude-sonnet-4-20250514"`) to set the Wiki Agent's model. Falls back to the first user message's model, then to the default from `opencode.json`.
- **No formatter** beyond ESLint.

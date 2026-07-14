# OpenWiki — agent guide

**This is an OpenCode plugin** (`openwiki`), not a standalone app.
Entry: `src/index.ts` exports `OpenWiki({client, directory})`.

## Commands

| Task | Command |
|------|---------|
| Install | `bun install` |
| Build | `bun run build` (compiles `src/` -> `dist/` with `bun build`) |
| Lint | `bun run lint` (ESLint flat config, `eslint.config.js`) |
| Typecheck | `bun run typecheck` (`tsc --noEmit`) |
| Test | `bun test` (bun built-in runner) |
| Both | `make check` (lint -> typecheck -> test) |
| Force wiki write | `/wiki-write` (calls `openwiki_write` tool for current session) |
| Deduplicate pages | `/wiki-dedup` (finds ~85-90% similar pages, merges them keeping the newest date/session) |

CI runs `make install && make build && make check` on bun 1.x.

## Key constraints

- **No runtime deps.** `@opencode-ai/plugin` (`tool`) is injected by the OpenCode host at runtime, not listed in package.json. Code that imports it cannot be tested directly outside the host.
- **ESM only** (`"type": "module"`). Built with bun, no other build tool needed.
- **TypeScript.** Source is in `src/` (`*.ts`), compiled to `dist/` via `bun build`. The plugin entry at `.opencode/plugins/openwiki.js` imports from `dist/index.js`.
- **Wiki is opt-in.** The plugin does nothing until `/wiki-init` is run (scaffolds `wiki/`, installs commands into `.opencode/commands/`). Idempotent — never overwrites existing files.
- **Wiki Agent** runs on `session.idle` (skips if wiki not initialized or transcript < 80 chars). Spawns a child session via `client.session.create` + `client.session.prompt`, expects pure JSON reply (`{skip:true}` or page content). Can also be force-invoked via the `openwiki_write` tool (`/wiki-write`).
- **Consistency Agent** commands run inline, no child session.
- **Frontmatter parsing** is a simple regex in `src/lib/wiki.ts:31` — no YAML library dependency.
- **Model config.** Create `openwiki.json` in the project root with `"model": "providerID/modelID"` (e.g. `"anthropic/claude-sonnet-4-20250514"`) to set the Wiki Agent's model. Falls back to the parent session's model, then to the default from `opencode.json`.
- **No formatter** beyond ESLint.

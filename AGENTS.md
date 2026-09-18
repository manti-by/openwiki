# OpenWiki - agent guide

**This is an OpenCode plugin** (published to npm as `@manti-by/openwiki`), not a standalone app.
Entry: `src/index.ts` exports `OpenWiki({client, directory})`.

## Scope

OpenWiki is an **install-only** plugin. It does not run a background agent, hook
any OpenCode events, or register any tools. On plugin load it does two things:

1. Copies every `skill/*` into `<project>/.opencode/skills/`, skipping
   any that already exist (never overwrites a user-customised command).
2. Writes the `wiki/` scaffold (`README.md`, `TEMPLATE.md`, `INDEX.md`,
   `QUESTIONS.md`) from the bundled templates with `<PROJECT_NAME>` substituted
   to the directory name, skipping any file that already exists.

That's it.

## Commands

- **Install** — `bun install` (or `make install`)
- **Build** — `bun run build` (compiles `src/` to `dist/` via `bun build`)
- **Lint** — `bun run lint` (Biome check, `biome.json`)
- **Format** — `bun run format` (Biome auto-fix, `biome.json`)
- **Typecheck** — `bun run typecheck` (`tsc --noEmit`)
- **Test** — `bun test` (Bun's test runner; specs in `test/` use `node:test`/`node:assert` style)
- **All checks** — `bun run lint && bun run typecheck && bun test` (the `Makefile` `check` target is just `typecheck`; this is a known inconsistency, run all three manually before shipping)
- **Dry-run publish** — `make publish_dryrun` (check + build + `npm publish --dry-run`)
- **Publish** — `make publish` (check + build + `npm publish`)
- **CI publish** — Publish a GitHub release — `.github/workflows/publish.yml` handles provenance

CI (`.github/workflows/ci.yml`) runs `make install && make build && make check` on Bun 1.x for every push/PR.

## Key constraints

- **No runtime deps at all.** The plugin does not import from `@opencode-ai/plugin` (no `tool` helper, no event handler) — it is pure filesystem work driven from the `OpenWiki` factory. There are no host-coupled files in the source tree; even `src/index.ts` only takes the `directory` argument and never touches `client`.
- **TypeScript + ESM**, built and tested with Bun (no Node/npm required for development). `src/index.ts` and `src/lib/wiki.ts` are both pure and directly unit-testable.
- **Install is idempotent.** Both `installCommands` and `scaffoldWiki` skip files that already exist. Re-loading the plugin is safe.
- **Biome is the sole linter and formatter** (`biome.json`) — no ESLint, no Prettier.
- **No markdown tables in any markdown file.** GFM tables don't diff cleanly
  in git, are inaccessible to screen readers, and don't reflow on mobile.
  Render tabular data as a flat bullet list (`- **<key>** — <value>`) for
  quick-reference content, or as H3-headed "card" sections when each row
  has multiple sub-points. Code blocks, the wiki `INDEX.md` link lists,
  and YAML frontmatter are not tables. This rule applies to `AGENTS.md`,
  every file under `wiki/`, and every page rendered by `/wiki-update`.

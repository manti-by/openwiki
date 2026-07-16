# OpenWiki

An [OpenCode](https://opencode.ai) plugin that maintains a local, per-project session wiki.

- A **Wiki Agent** runs automatically in the background after each session goes idle. It
  decides whether the session is worth recording and, if so, writes or updates a page in
  `wiki/`, can be run manually with the command `/wiki-write`.
- A **Consistency Agent**, run on demand via `/wiki-consistency`, cross-checks pages for
  contradictions, resolves what it can against the current codebase, and files anything it
  can't resolve as a question in `wiki/QUESTIONS.md` for a human to answer.

See [wiki/pages/2026-07-15-openwiki-plugin-design-spec.md](wiki/pages/2026-07-15-openwiki-plugin-design-spec.md) for the full design spec.

## Install

Add the package to your project's `opencode.json`:

```json
{
  "plugin": ["@manti-by/openwiki"]
}
```

(Until published, point OpenCode at this directory directly - copy or symlink it into
`.opencode/plugins/openwiki`.)

## Usage

1. Run `/wiki-init` once per project. This scaffolds `wiki/` (`README.md`, `TEMPLATE.md`,
   `INDEX.md`, `QUESTIONS.md`, `pages/`) from the bundled templates, and installs the
   `/wiki-init`, `/wiki-write`, and `/wiki-consistency` commands into `.opencode/commands/`. Nothing happens
   automatically before this — the plugin does no scaffolding on its own.
2. Work normally. After each session goes idle, the Wiki Agent decides whether it earned a
   page (skipping quick Q&A and small talk) and, if so, writes or updates
   `wiki/pages/YYYY-MM-DD-topic.md` and keeps `wiki/INDEX.md` current.
3. Run `/wiki-write` at any time to force the Wiki Agent to evaluate the current session
   immediately (useful if you want to capture a session before it goes idle).
4. Run `/wiki-consistency` periodically (or whenever something looks stale) to cluster
   pages by topic, cross-check them, resolve discrepancies, rebuild the "By topic" section
   of the index, and file open questions.

## Running the consistency check

### 1. Manually, from inside OpenCode

Start (or resume) a session in the project and type:

```
/wiki-consistency
```

This runs the Consistency Agent inline: it clusters pages by topic, cross-checks them,
resolves what it can, rebuilds `## By topic` in `wiki/INDEX.md`, and files anything
unresolved in `wiki/QUESTIONS.md`. Read the summary it reports back, and check
`wiki/QUESTIONS.md` for anything that now needs your answer.

### 2. On a schedule, via cron

`opencode run` executes a command non-interactively from the shell, so it can be driven by
cron. Add a crontab entry that `cd`s into the project and runs the command — for example,
nightly at 2am:

```cron
0 2 * * * cd /path/to/your/project && opencode run /wiki-consistency >> /path/to/your/project/wiki/.consistency.log 2>&1
```

Notes:

- `wiki/` must already be initialized (`/wiki-init`) — the command has nothing to check
  against otherwise.
- Run `opencode run /wiki-consistency` by hand from the project directory first to confirm
  it authenticates and completes non-interactively in your environment before trusting it
  to cron.
- Point the log redirect somewhere you'll actually look, or wire cron's output to mail/a
  monitoring hook — a silently-failing cron job defeats the purpose.

## Configuration

Create `openwiki.json` in the project root to set the Wiki Agent's model:

```json
{
  "model": "opencode/deepseek-v4-flash-free"
}
```

If the file is absent or has no `model` property, the Wiki Agent uses the same model as the current session, then falls back to the default from `opencode.json`.

## Layout

```
src/            TypeScript plugin source (compiled to dist/ by bun build)
templates/      wiki/ scaffold: README.md, TEMPLATE.md, INDEX.md, QUESTIONS.md
commands/       /wiki-init, /wiki-write, and /wiki-consistency command definitions
dist/           Compiled plugin output (generated, not committed)
```

## How the Wiki Agent works

On `session.idle`, the plugin:

1. Skips silently if `wiki/` hasn't been initialized, or the session transcript is too short
   to be worth even asking about.
2. Reads `wiki/README.md` and `wiki/TEMPLATE.md` for conventions, and checks whether this
   session already has a page (matched by `session_id` in frontmatter) so repeated idle
   events update one page instead of creating duplicates.
3. Spawns an ephemeral child session, hands it the transcript and conventions, and asks it
   to reply with strict JSON: either `{"skip": true}` or the full page content plus an
   index line.
4. If the session earns a page, writes it under `wiki/pages/` and upserts the entry in
   `wiki/INDEX.md`'s `## Pages` section (newest first).

The page-worthiness call always belongs to the Wiki Agent, not a hardcoded heuristic —
the plugin only pre-filters near-empty transcripts to avoid spawning a subagent for nothing.

## Development

Built with [Bun](https://bun.sh) and [TypeScript](https://www.typescriptlang.org/).

```sh
bun install              # install dependencies
bun run build            # compile src/ to dist/
bun test                 # run tests
bun run typecheck        # type-check without emitting
bun run lint             # lint & format-check with Biome
bun run format           # auto-fix with Biome
```

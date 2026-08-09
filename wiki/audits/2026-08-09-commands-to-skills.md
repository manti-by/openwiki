## Implementation Plan

**Recommended approach: do not refactor.** The five `commands/*.md` files are user-invoked, `agent: build` slash commands that drive deterministic, multi-step filesystem workflows — that is exactly what OpenCode commands are for, and the current "install only, copy flat `.md` files" design is the minimum-friction implementation. Skills in OpenCode are aimed at a different shape (agent-discoverable workflows, often bundled with scripts/references), and switching would mostly trade a working UX for a heavier install path without changing the runtime behavior.

Below is the pros/cons analysis you asked for, followed by the concrete plan that follows from the recommendation.

### Pros of refactoring commands → skills

- **Agent discoverability.** The agent can pick the right wiki skill itself when the user says something natural like "save this to the wiki" — no need to remember `/wiki-update` vs `/wiki-archive`. Today the user must know the exact slash command.
- **Bundle non-prose assets.** Skills allow sidecar files (`references/`, `assets/`, scripts) next to `SKILL.md`. The current `commands/*.md` are pure prose; things like the session-mapping JSON format, the index entry format, and the `wiki/TEMPLATE.md` presets could live as references the skill loads on demand instead of being read from the consumer's `wiki/` tree every invocation.
- **Composability.** Skills can reference each other via the `skill` tool, so a future `wiki-update` could explicitly invoke a `wiki-frontmatter` helper skill to keep the YAML contract in one place rather than copy-pasted across 5 files.
- **Namespacing.** Per-skill directories scale better than the flat `commands/*.md` namespace as the wiki grows (e.g. `skills/wiki-update/SKILL.md` + `references/INDEX_FORMAT.md`).
- **Discoverable in the OpenCode UI** in a dedicated skills pane, separate from the slash-command list.

### Cons of refactoring commands → skills

- **Breaks the user-facing slash affordance.** `/wiki-update` is something a user types; a skill is something an agent calls. For a tool whose entire purpose is "user says 'go write the wiki page' right now," losing the explicit invocation is a UX regression unless the agent reliably self-selects the skill — which is not guaranteed.
- **Loses the `agent: build` frontmatter pin.** Today `wiki-update.md` and `wiki-archive.md` declare `agent: build` in frontmatter, so the host switches the active agent cleanly. Skills do not get that short-circuit; you have to write a prompt that tells the model to behave as the build agent, which is more prose and more drift risk.
- **Heavier plugin install path.** Today `installCommands` in `src/index.ts` (lines 26–47) is a single flat loop over `commands/*.md`. A skill install needs `mkdir` per skill, recursive copy of `references/` and `assets/`, and more nuanced "skip if already installed" logic (skip the whole directory, or per file?). Still pure filesystem work, but more code in a plugin whose selling point is being minimal.
- **More files on disk per item.** Five `commands/foo.md` become five `skills/foo/SKILL.md` directories. For a small set of procedures this is overhead, not leverage.
- **Test surface grows.** `test/` currently exercises a flat file copy; a skill refactor needs fixtures that include sidecar files, and the "skip if exists" assertion becomes per-directory.
- **Mismatched mental model.** These workflows are *deterministic recipes* (resolve session → write frontmatter → update index). They are not heuristic decisions where the model should weigh options. Skills bias toward the latter; commands bias toward the former.
- **The wiki content (`wiki/TEMPLATE.md`, `wiki/INDEX.md`) is a separate concern.** It is written by `installWiki` and consumed by the commands at runtime. A skill refactor would not collapse that — you'd still have a `wiki/` scaffold plus a `skills/` tree. Total surface area goes up, not down.

### Build steps (for the recommended path: no refactor)

1. **Do nothing in `src/` and `commands/`.** Leave `installCommands` and the five command files exactly as they are. The plugin already satisfies the "install-only, idempotent, no runtime deps" contract called out in `AGENTS.md`.
2. **If you ever want skills for a *different* reason** (e.g. an LLM should be able to *summarize* a wiki page on demand, which is a heuristic task), introduce them as additive, not as a replacement. Add a new `skills/` directory and a new `installSkills` function alongside `installCommands`; do not migrate existing commands until there is a concrete UX problem the migration solves.
3. **Optional micro-improvement (no refactor).** If any of the command bodies have grown to the point where they reference the same boilerplate (frontmatter shape, index entry format, session mapping JSON), extract that boilerplate into `wiki/TEMPLATE.md` sections the commands read at runtime — which is what `wiki-update.md` step 3 already does. Keep it as prose, not a skill.

### Verification

- `bun run lint && bun run typecheck && bun test` — all green today; no change means no regression.
- `bun run build` — `dist/` output unchanged.
- `make publish_dryrun` — no behavior change, dry-run pack list identical.

If you want me to act on this and produce a concrete migration plan instead, answer the gating question below and I will redesign `src/index.ts` plus the `commands/` → `skills/` tree accordingly.

### Open questions

1. Do you want these workflows to remain **user-invoked** (`/wiki-update` typed by the user, same UX as today) or **agent-invoked** (the model picks the right wiki skill when the conversation context fits) — and is the trade-off worth breaking the slash-command muscle memory for discoverability?
2. Is there a concrete pain point the refactor would solve (e.g. frontmatter drift across the 5 files, a need to bundle a helper script, multi-step user flows that today require chaining slash commands) that I should design the migration around?

Please check my questions above.

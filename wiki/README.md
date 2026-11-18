---
type: Wiki Guide
title: OpenWiki Wiki Conventions
description: Layout, frontmatter schema, and cross-linking rules for this project's wiki bundle.
tags: [meta, conventions]
---

# OpenWiki Wiki

A persistent, compounding knowledge base for this project. Each page captures **one session** -
a debugging chase, a code review, an investigation into how something works, or a set of changes
- so the reasoning survives after the terminal scrollback is gone.

Inspired by [Karpathy's LLM-maintained wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f):
the human curates and directs; the agent does the bookkeeping (writing pages, cross-linking,
keeping the index current). Pages are plain Markdown so they stay human-readable and diff cleanly in git.

This directory is an [Open Knowledge Format (OKF) v0.2](https://github.com/GoogleCloudPlatform/open-knowledge-format)
bundle: a directory of markdown files with YAML frontmatter, consumable by any OKF-aware agent
or tool without translation. Conformance is cheap — every non-reserved `.md` file carries a
non-empty `type` field, and `index.md` / `log.md` are the only reserved filenames.

## Layout

- `README.md` - This file - conventions (the "schema").
- `TEMPLATE.md` - The one unified page template. Copy it to start a page.
- `index.md` - OKF directory listing of every page with a one-line summary. Kept current on each write.
- `log.md` - OKF update history for the bundle: date-grouped entries, newest first.
- `QUESTIONS.md` - Open questions about wiki discrepancies, awaiting a human answer.
- `pages/YYYY-MM-DD-<topic>.md` - The pages themselves, created on demand by `/wiki-sync`.
- `archive/` - Retired pages moved out of `pages/` by `/wiki-archive` (they carry `status: deprecated`).
- `.sessions.json` - Internal cache mapping session id to page file (`{ "<session_id>": "<file>.md" }`),
  kept current by `/wiki-sync`; created on first use. Optional.

## Naming convention

```
pages/YYYY-MM-DD-kebab-case-topic.md
```

- Date-prefixed so pages sort chronologically and filenames stay unique.
- `topic` is a short kebab-case slug of the subject (e.g. `multi-agent-plan-step`, `composite-command`).
- Meta files (`README.md`, `TEMPLATE.md`, `index.md`, `log.md`, `QUESTIONS.md`) are **not** date-prefixed.

## Concept types

Every page declares a `type` in its frontmatter — OKF's only required field. The template lists
the recommended sections for each:

- `debug` - Chasing a symptom to a root cause. Symptom -> steps -> root cause -> fix.
- `investigation` - Understanding how a subsystem works / where a gap is. No single fix.
- `code-review` - Findings against a diff or branch. Numbered findings + summary cards.
- `implementation` - A set of changes that were made. Steps with before/after + test results.

## Frontmatter

Every page starts with YAML frontmatter (see `TEMPLATE.md`). This is what makes the wiki
machine-queryable — you can grep for a ticket, a service, or a tag across all pages.

- OKF core: `type` (REQUIRED, non-empty), plus the recommended `title`, `description`, `tags`.
- OKF trust and lifecycle: `generated: { by, at }` records how the content was produced
  (`by` uses the OKF actor convention — `<producer>/<model>` for agents, `human:<id>` for
  people, `process:<id>` for automation; `at` is ISO 8601 UTC) and `status` is
  `draft | stable | deprecated` (absent means `stable`; archived pages are `deprecated`).
- Project extensions: `resolution` (`resolved | open | in-progress | reference` — the session's
  own outcome, distinct from OKF `status`), `date`, `session_id`, `services`, `branch`,
  `tickets`, `related`.
- Write list fields (`services`, `tickets`, `tags`, `related`) as inline YAML flow lists on
  one line — `services: [api, react]`, empty as `[]` - never block style. Quote `branch`
  (`"-"`) and any numeric-looking tag (`'403'`).

## Cross-linking

Link related pages inline with standard markdown links, bundle-relative:

```
[Related page title](/pages/<filename>.md)
```

and mirror each link target in the `related:` frontmatter list as a concept ID
(`pages/<filename-without-.md>`). Keep the two representations in sync — one body link,
one `related` entry. Cross-links are what turn a folder of notes into a knowledge graph -
always link back to prior pages on the same subsystem. Links to retired pages point at
`/archive/<filename>.md`.

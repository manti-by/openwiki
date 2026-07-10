# OpenWiki plugin

## Summary

OpenWiki is an OpenCode plugin (Claude Code support planned) to maintain a local wiki for the current project.

The wiki is a directory `wiki/` in the project root containing:

- **INDEX.md** - a catalog of links to all wiki pages with a one-line summary, newest first, plus a "By topic" section grouping pages by topic clusters.
- **README.md** - conventions and a description of how the wiki works (the "schema").
- **TEMPLATE.md** - the unified page template every page starts from.
- **QUESTIONS.md** - open questions from the Consistency Agent about wiki discrepancies, awaiting a human answer.
- **pages/** - the wiki pages themselves: plain Markdown files named `YYYY-MM-DD-page-title.md`.

The wiki structure is **not** created automatically - an explicit init command creates `wiki/` from the bundled templates (filling in the project name). Until the user runs it, the plugin does nothing.

## How it works

### Wiki Agent

After every assistant response (when the agent finishes work and answers a user prompt), a background subagent - the **Wiki Agent** - creates or updates the wiki page linked to the current session. The page is a living summary of that session; subsequent responses in the same session update the same page (matched by `session_id` in the frontmatter).

The Wiki Agent decides whether a session is page-worthy: trivial sessions (quick Q&A, one-liners) are skipped. A page is only written when the session matches one of the page types: `debug`, `investigation`, `code-review`, or `implementation`.

Whenever a page is created or its summary changes, the Wiki Agent keeps INDEX.md current.

### Consistency Agent

There is also a command to maintain wiki consistency. It runs an agent — the **Consistency Agent** — which:

1. Reads INDEX.md and the page summaries.
2. Clusters pages by semantic similarity of their subject matter (frontmatter tags/services are hints, not the grouping key).
3. Cross-checks the pages within each cluster for contradictory claims.
4. Tries to resolve each discrepancy against the current codebase, connected MCPs, and other available data sources, updating the outdated page(s).
5. If a discrepancy cannot be resolved with confidence, writes a question for a human into **QUESTIONS.md**, linking the conflicting pages and the evidence checked.
6. Rebuilds the "By topic" section of INDEX.md from the clusters — topics with the most pages first.

On a later run, the Consistency Agent picks up human answers written in QUESTIONS.md, applies them to the affected pages, and moves the entry to the Resolved section.

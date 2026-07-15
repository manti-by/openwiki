# OpenWiki Wiki — Index

Session knowledge base for the OpenWiki project - one Markdown page per debugging
chase, investigation, code review, or set of changes. See [README.md](README.md) for conventions
and [TEMPLATE.md](TEMPLATE.md) for the page template. New pages are added and updated automatically
by the plugin.

## Pages

- [First /wiki-dedup Command Run — Audit Pair Merged](pages/2026-07-14-first-dedup-command-run.md) — Exercised the dedup command against the live wiki; merged the audit pair, confirmed architecture triplicate was already handled, deleted 3 files (2026-07-14)
- [Wiki Deduplication Command](pages/2026-07-14-wiki-dedup-command.md) — Created /wiki-dedup command to find and merge near-duplicate wiki pages; also repaired INDEX.md with missing entries and topic clusters (2026-07-14)
- [JavaScript-to-TypeScript Migration with Bun](pages/2026-07-14-js-to-typescript-migration.md) — Migrated project from JS to TypeScript, switched to bun, updated toolchain (2026-07-14)
- [Wiki Consistency Review and Index Repair](pages/2026-07-14-wiki-consistency-review.md) — Reviewed all 6 wiki pages for cross-page consistency; fixed INDEX.md link, missing entry, and duplicate session_id notes. (2026-07-14)
- [Systematic OpenWiki Codebase Exploration and Architecture Analysis](pages/2026-07-14-systematic-codebase-exploration-and-architecture.md) — Full architectural reference: plugin wiring, Wiki Agent lifecycle, Consistency Agent workflow, command registration, and wiki page schema (2026-07-14)
- [Duplicate Wiki Page Cleanup from Nested Agent Evaluations](pages/2026-07-14-duplicate-page-cleanup.md) — Identified and merged 3 near-duplicate wiki pages created by independent Wiki Agent evaluations of the same transcript (2026-07-14)
- [Wiki Agent Maintenance Guard](pages/2026-07-14-wiki-maintenance-guard.md) — Added two-layer guard (event handler regex + prompt instruction) to prevent Wiki Agent from self-documenting maintenance commands like /wiki-dedup and /wiki-consistency (2026-07-14)
- [Wiki Dedup Command and Maintenance Guard](pages/2026-07-14-wiki-dedup-and-maintenance-guard.md) — Added /wiki-dedup command for merging ~85-90% similar pages and a two-layer guard to prevent wiki agent from self-documenting during maintenance commands (2026-07-14)
- [Recursive Wiki Agent Evaluations Causing Duplicate Pages](pages/2026-07-14-recursive-agent-evaluation-duplicates.md) — Investigation into how independent Wiki Agent evaluations of the same transcript produced duplicate pages, with root cause and resolution via dedup (2026-07-14)
- [npm Package Publishing Setup](pages/2026-07-14-npm-package-publishing-setup.md) — Added npm publish metadata, Makefile targets, and CI workflow for provenance-tagged releases (2026-07-14)
- [Troubleshooting Plugin Load and Crash Loop](pages/2026-07-13-plugin-load-and-crash.md) — Resolved issues with plugin discovery, missing deps, and JSON parsing crashes. (2026-07-13)
- [Project Structure and Documentation Audit](pages/2026-07-13-project-audit.md) — Audit of project structure and docs; found three discrepancies in command listings and plugin naming. (2026-07-13)
- [Revalidate and Update Documentation, Verify openwiki_write Tool](pages/2026-07-13-update-wiki-write-docs.md) — Cross-referenced docs against codebase, fixed gaps, and verified /wiki-write tool end-to-end (2026-07-13)
- [Comprehensive Project Exploration and Audit](pages/2026-07-13-comprehensive-project-exploration.md) — Complete verbatim file-level inventory of all 37 project files (2026-07-13)
_Newest first._

## By topic

_Topic clusters maintained by the Consistency Agent; topics with the most pages first._

### Project Audit & Documentation
- [Project Structure and Documentation Audit](pages/2026-07-13-project-audit.md)
- [Comprehensive Project Exploration and Audit](pages/2026-07-13-comprehensive-project-exploration.md)
- [Systematic OpenWiki Codebase Exploration and Architecture Analysis](pages/2026-07-14-systematic-codebase-exploration-and-architecture.md)

### Plugin System
- [Troubleshooting Plugin Load and Crash Loop](pages/2026-07-13-plugin-load-and-crash.md)

### Documentation & Tooling
- [Revalidate and Update Documentation, Verify openwiki_write Tool](pages/2026-07-13-update-wiki-write-docs.md)
- [Wiki Deduplication Command](pages/2026-07-14-wiki-dedup-command.md)

### Build & Migration
- [JavaScript-to-TypeScript Migration with Bun](pages/2026-07-14-js-to-typescript-migration.md)

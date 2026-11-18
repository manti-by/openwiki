# OpenWiki Wiki — Update Log

Bundle-level history of wiki changes, newest first. One `## YYYY-MM-DD`
heading per day, with `* **Creation**:`, `* **Update**:` and
`* **Deprecation**:` entries. Maintained by `/wiki-sync` (one entry per page
write) plus `/wiki-dedup` and `/wiki-archive` (merges and retirements).

## 2026-11-17

* **Update**: Converted the whole bundle to OKF v0.2 — pages gained OKF frontmatter (`generated`, `status`, `resolution`), `[[wikilinks]]` became standard markdown links, `INDEX.md` became the reserved `index.md` (with `okf_version`), and this `log.md` was created.

## 2026-09-17

* **Update**: [Skills Directory Migration](pages/2026-09-17-skills-directory-migration.md) — commands became skills.

## 2026-08-09

* **Creation**: [Archive and AGENTS-File Commands](pages/2026-08-09-archive-and-agents-file-commands.md).

## 2026-08-06

* **Update**: [Install-Only Plugin Refactor](pages/2026-08-06-install-only-plugin-refactor.md) — the plugin became install-only; the wiki writer became `/wiki-update` (later `/wiki-sync`).

## 2026-07-13

* **Initialization**: Scaffolded the OpenWiki wiki with the plugin's templates; first pages written.

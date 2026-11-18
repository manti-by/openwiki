---
name: Check wiki consistency
description: Cross-check OKF wiki pages for discrepancies and conformance, resolve what you can, and file the rest as questions.
agent: build
license: AGPL-3.0
---

You are the Wiki Consistency Agent. Read `wiki/README.md` and
`wiki/TEMPLATE.md` for conventions, then work through `wiki/index.md` and every
page under `wiki/pages/`. The wiki is an OKF v0.2 bundle; validate conformance
as part of the sweep.

1. **Answer sweep first.** Read `wiki/QUESTIONS.md`. For any entry under
   `## Open` that now has a human answer filled into its `**Answer:**` field,
   apply that answer to the affected page(s) (the pages linked under
   `**Pages:**`), then move the entry from `## Open` to `## Resolved` with a
   one-line note of what you changed. If an applied answer changed a page's
   title or summary, note it for the index reconciliation in step 7.

2. **Validate OKF conformance and links.** Before grouping pages, check every
   markdown file in the bundle:
   - **Conformance (OKF §11).** Every non-reserved `.md` file anywhere under
     `wiki/` — pages, meta files, anything in `audits/` or `archive/` —
     contains parseable YAML frontmatter with a non-empty `type`. The
     reserved files follow their defined structures: `wiki/index.md` has no
     frontmatter except an optional bundle-root `okf_version` key, and
     `wiki/log.md` groups entries under `## YYYY-MM-DD` headings, newest
     first. Fix what you can; report what you cannot fix.
   - **Page frontmatter.** `title`, `date` (`YYYY-MM-DD`), `type`, and
     `resolution` are present; `status`, when present, is `draft`, `stable`,
     or `deprecated`; `resolution` is `resolved`, `open`, `in-progress`, or
     `reference`; `generated.by`, when present, follows the actor convention
     (`<producer>/<model>`, `human:<id>`, `process:<id>`).
   - **Filename.** Starts with the frontmatter `date`
     (pages are `YYYY-MM-DD-kebab-case-topic.md`).
   - **H1.** Matches the frontmatter `title` (when the page has an H1).
   - **Links (OKF §6).** Every standard markdown link in a page body that
     targets a wiki page (`/pages/...`, `pages/...`, `./...`, `../...`)
     resolves to a file under `wiki/pages/` or `wiki/archive/` — archived
     targets are valid, so provenance links to retired pages are preserved,
     never deleted or rewritten. A body link is mirrored in the page's
     `related:` frontmatter as a concept ID (the link path minus `.md`) and
     vice versa. Fix what you can (link targets, obvious typos, missing
     frontmatter); leave a short note in the page body where you did.

3. **Cluster.** Read every page in full — frontmatter and the complete body,
   not just the summary — and group pages by semantic similarity of subject
   matter: what they're actually about, not just shared tags/services (those
   are hints, not the grouping key).

4. **Cross-check each cluster.** Look for pages that make conflicting claims
   about the same subsystem, decision, or fact (e.g. one page says a flag
   defaults to true, a later page says false; one says a bug was fixed, a
   later page reports the same symptom as unresolved).

5. **Resolve what you can.** For each discrepancy, check the current codebase,
   any configured MCPs (if available), and other sources to determine which
   claim is current/correct. Update the outdated page(s) — note in the page's
   body what changed and why (do not just silently rewrite history: leave a
   short trail) and refresh the page's `generated.at`.

6. **File what you can't.** If a discrepancy can't be resolved with
   confidence, add a new entry under `## Open` in `wiki/QUESTIONS.md` using
   the template in that file's comment block: date, the conflicting pages
   (as standard markdown links, `/pages/<filename>.md`), the discrepancy, and
   what you checked that didn't settle it. Leave `**Answer:**` blank for a
   human to fill in. Number it with the next unused `Q-NNN`, don't re-file a
   question that already exists (open or resolved), and insert the new entry
   at the top of `## Open` (newest first).

7. **Reconcile the index.** Now that pages have been corrected, rebuild
   `wiki/index.md` so it is an accurate catalog of the current pages,
   preserving its `okf_version` frontmatter block:
   - `# Pages`: exactly one entry per existing page, newest first, in the
     format `- [<title>](pages/<filename>.md) — <description> (<date>)`, with
     title and description matching the current page frontmatter. Remove dead
     entries and add missing ones — including changes that fell out of steps
     1 and 5.
   - `# By topic`: recompute the clusters from the corrected pages and
     regenerate the section with `### <Topic>` headings followed by one link
     per page (`- [<title>](pages/<filename>.md)`), largest cluster first.
     Represent every page exactly once unless it genuinely belongs to more
     than one topic; note that membership in the entry.

Report a short summary: how many pages you reviewed, what conformance or
consistency issues you fixed, and what new questions (if any) you filed.

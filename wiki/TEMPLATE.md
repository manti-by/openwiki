---
type: Wiki Template
title: Wiki Page Template
description: The one unified template for session pages — copy the frontmatter block and section presets into a new page.
tags: [meta, template]
---

# Wiki Page Template

Copy the YAML block below into a new page under `wiki/pages/`, then follow the
section presets for the page's `type`. `type` is the only field OKF requires;
everything else is optional (see `README.md` for the field families).

```yaml
---
type:                # REQUIRED — debug | investigation | code-review | implementation
title:               # human-readable page title (must match the page's H1)
description:         # one-line summary — reused verbatim in index.md
tags: []             # free-form topic tags, e.g. [telemetry, agents]
generated:           # OKF trust — { by: <producer>/<model>, at: "2026-07-13T12:00:00Z" }
status: stable       # OKF lifecycle — draft | stable | deprecated
resolution:          # extension — resolved | open | in-progress | reference
date: YYYY-MM-DD     # extension — session date, `date +%F`
session_id:          # extension — agent session id (OpenCode / Claude Code)
services: []         # extension — e.g. [main, auth, cache]
branch:              # extension — feature/epic branch, or "-" if none
tickets: []          # extension — e.g. [MNT-123]
related: []          # extension — concept IDs linked in the body, e.g. [pages/2026-07-13-foo]
---
```

## Body

```markdown
# <Title>

## TL;DR

<2–4 sentences a teammate can read in 20 seconds: what this session was about and the
outcome / net effect. Lead with the conclusion, not the chronology.>
```

Conventions for every body:

- Anchor claims to code: put `**File:** path/to/file.py:123` above the relevant snippet.
- Prefer short, real code snippets and file:line refs over prose.
- Cross-link sibling pages with standard markdown links, bundle-relative:
  `[Title](/pages/<filename>.md)` — never `[[wikilinks]]` — and mirror each link
  target in `related` above as a concept ID (`pages/<filename-without-.md>`).
- Document root causes and *why*, not just symptoms. Include what was ruled out.
- On a meaningful edit, refresh `generated.at` (keep `generated.by`).

Keep, drop, and reorder the presets below to fit the page `type`:

- **type: debug** — `## Symptom`; `## Step 1 — <title>`, `## Step 2 — <title>`
  (each step: cause + evidence; number them); `## Root cause`; `## Resolution / Fix`;
  `## Known follow-up (not fixed this session)`.
- **type: investigation** — `## Net effect` (the practical takeaway / gap, stated up
  front); one `## <Subsystem / area>` section per area explored; `## Open questions`.
- **type: code-review** — `## Findings` (###-numbered; each: **File:**, **Severity:**,
  the problem, **Fix:**); then `## Summary` card sections per finding group. No
  markdown tables.
- **type: implementation** — `## Overview`; `## Step 1 — <title>`, `## Step 2 — <title>`
  (before/after snippets); `## Test Results`.

Every page ends with:

```markdown
## Follow-ups

- <anything left open / next actions, or "None">

## References

- Related: [<Related page title>](/pages/<related-page-filename>.md)
- External: <Linear / Notion / URL — or omit this line>
```

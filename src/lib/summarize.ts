import type { ExistingPage } from "./wiki.js"

export interface WikiAgentInput {
  readme: string
  template: string
  transcript: string
  sessionId: string
  today: string
  existingPage: ExistingPage | null
}

export function buildWikiAgentPrompt({ readme, template, transcript, sessionId, today, existingPage }: WikiAgentInput): string {
  const existingBlock = existingPage
    ? `This session already has a wiki page from an earlier point in the same
conversation. UPDATE it in place — reuse the exact same filename, and revise
title/content/status to reflect the session as a whole so far, not just the
newest turn.

--- existing page: ${existingPage.filename} ---
${existingPage.content}
`
    : `This session has no wiki page yet.`

  const filenameLine = existingPage
    ? `"filename": "${existingPage.filename}"`
    : `"filename": "${today}-<kebab-case-topic>.md"`

  return `You are the OpenWiki Wiki Agent. You maintain a per-project session wiki.

Read these wiki conventions carefully:

--- wiki/README.md ---
${readme}

--- wiki/TEMPLATE.md ---
${template}

Below is the transcript of a coding session (session id: ${sessionId}).
Today's date is ${today}.

${existingBlock}

Decide whether this session is worth a wiki page. Skip trivial sessions: quick
one-off questions, small talk, sessions with no real investigation, debugging,
review, or implementation work. Only write a page when the session matches one
of the page types in TEMPLATE.md: debug, investigation, code-review, implementation.

Also skip sessions whose transcript is primarily about maintaining the wiki
itself — deduplicating pages, running consistency checks, repairing the index,
or other wiki bookkeeping. These sessions modify the wiki but are not project
work worth a page of their own.

Reply with ONLY a single JSON object, no markdown fences, no prose outside it:

{
  "skip": true
}

or, if the session earns a page:

{
  "skip": false,
  "title": "<human-readable title>",
  ${filenameLine},
  "content": "<full page content, frontmatter + body, following TEMPLATE.md exactly, with session_id set to ${sessionId}>",
  "indexLine": "- [<title>](pages/${existingPage ? existingPage.filename : `${today}-<kebab-case-topic>.md`}) — <one-line summary> (${today})"
}

--- session transcript ---
${transcript}
`
}

export function transcriptFromMessages(messages: any[]): string {
  return messages
    .map((m: any) => {
      const role = m.info?.role ?? m.role ?? "unknown"
      const parts = m.parts ?? []
      const text = parts
        .filter((p: any) => p.type === "text" && typeof p.text === "string")
        .map((p: any) => p.text)
        .join("\n")
      return text ? `### ${role}\n${text}` : null
    })
    .filter(Boolean)
    .join("\n\n")
}

export function parseAgentJson(reply: string): Record<string, unknown> {
  if (!reply) return { skip: true }
  const fenced = /```(?:json)?\n([\s\S]*?)\n```/.exec(reply)
  const raw = fenced ? fenced[1] : reply
  const start = raw.indexOf("{")
  const end = raw.lastIndexOf("}")
  if (start === -1 || end === -1) return { skip: true }
  try {
    return JSON.parse(raw.slice(start, end + 1))
  } catch {
    return { skip: true }
  }
}

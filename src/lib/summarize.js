/** Builds the instruction sent to the ephemeral Wiki Agent session. The agent
 *  is asked to reply with a single strict-JSON object so the plugin never has
 *  to scrape prose out of a markdown reply. */
export function buildWikiAgentPrompt({ readme, template, transcript, sessionId, today, existingPage }) {
  const existingBlock = existingPage
    ? `This session already has a wiki page from an earlier point in the same
conversation. UPDATE it in place — reuse the exact same filename, and revise
title/content/status to reflect the session as a whole so far, not just the
newest turn.

--- existing page: ${existingPage.filename} ---
${existingPage.content}
`
    : `This session has no wiki page yet.`

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

Reply with ONLY a single JSON object, no markdown fences, no prose outside it:

{
  "skip": true
}

or, if the session earns a page:

{
  "skip": false,
  "title": "<human-readable title>",
  "filename": "${existingPage ? existingPage.filename : `${today}-<kebab-case-topic>.md`}",
  "content": "<full page content, frontmatter + body, following TEMPLATE.md exactly, with session_id set to ${sessionId}>",
  "indexLine": "- [<title>](pages/<filename>) — <one-line summary> (${today})"
}

--- session transcript ---
${transcript}
`
}

/** Extracts the transcript text opencode gives back from client.session.messages(). */
export function transcriptFromMessages(messages) {
  return messages
    .map((m) => {
      const role = m.info?.role ?? m.role ?? "unknown"
      const parts = m.parts ?? []
      const text = parts
        .filter((p) => p.type === "text" && typeof p.text === "string")
        .map((p) => p.text)
        .join("\n")
      return text ? `### ${role}\n${text}` : null
    })
    .filter(Boolean)
    .join("\n\n")
}

/** Pulls the JSON object out of a model reply that should be pure JSON but
 *  may come wrapped in fences or stray whitespace. */
export function parseAgentJson(reply) {
  const fenced = /```(?:json)?\n([\s\S]*?)\n```/.exec(reply)
  const raw = fenced ? fenced[1] : reply
  const start = raw.indexOf("{")
  const end = raw.lastIndexOf("}")
  if (start === -1 || end === -1) throw new Error("Wiki Agent reply did not contain a JSON object")
  return JSON.parse(raw.slice(start, end + 1))
}

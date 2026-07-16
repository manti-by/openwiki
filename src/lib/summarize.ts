import type { ExistingPage } from "./wiki.js"
import promptTemplate from "./wiki-agent.txt" with { type: "text" }

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "")
}

export interface WikiAgentInput {
  readme: string
  template: string
  transcript: string
  sessionId: string
  today: string
  existingPage: ExistingPage | null
}

export function buildWikiAgentPrompt({
  readme,
  template,
  transcript,
  sessionId,
  today,
  existingPage,
}: WikiAgentInput): string {
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

  const indexFilename = existingPage ? existingPage.filename : `${today}-<kebab-case-topic>.md`

  return renderTemplate(promptTemplate, {
    readme,
    template,
    sessionId,
    today,
    existingBlock,
    filenameLine,
    indexFilename,
    transcript,
  })
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

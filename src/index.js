import { promises as fs } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { tool } from "@opencode-ai/plugin"
import {
  wikiRoot,
  pagesRoot,
  isInitialized,
  exists,
  readIfExists,
  upsertIndexEntry,
  findExistingPageForSession,
} from "./lib/wiki.js"
import { buildWikiAgentPrompt, transcriptFromMessages, parseAgentJson } from "./lib/summarize.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PACKAGE_ROOT = path.dirname(__dirname)
const TEMPLATES_DIR = path.join(PACKAGE_ROOT, "templates")
const COMMANDS_DIR = path.join(PACKAGE_ROOT, "commands")

// Skip the Wiki Agent entirely for near-empty exchanges (e.g. an idle event
// firing right after a one-word reply) — a cheap guard, not the page-worthiness
// decision itself. That decision always belongs to the Wiki Agent.
const MIN_TRANSCRIPT_CHARS = 80

export const OpenWiki = async ({ client, directory }) => {
  return {
    tool: {
      openwiki_init: tool({
        description:
          "Scaffold the wiki/ directory for this project from the OpenWiki templates (README, TEMPLATE, INDEX, QUESTIONS), and install the /wiki-init and /wiki-consistency commands. Safe to call more than once — never overwrites existing wiki files.",
        args: {
          projectName: tool.schema.string().optional(),
        },
        async execute({ projectName }) {
          return initWiki(directory, projectName)
        },
      }),
      openwiki_write: tool({
        description:
          "Force the Wiki Agent to write a wiki page for the given session right now. The agent decides whether the session is worth documenting and creates/updates a page under wiki/pages/ and the INDEX.md entry. Safe to call on any session — if the session already has a page it updates it in place.",
        args: {
          sessionId: tool.schema.string(),
        },
        async execute({ sessionId }) {
          await onSessionIdle({ client, directory, sessionId })
          return `Wiki Agent finished processing session ${sessionId}. If the session was worth documenting, a page was written or updated in wiki/pages/.`
        },
      }),
    },
    event: async ({ event }) => {
      if (event.type !== "session.idle") return
      const sessionId = event.properties?.sessionID ?? event.properties?.sessionId
      if (!sessionId) return
      if (!(await isInitialized(directory))) return // no explicit /wiki-init yet — do nothing

      try {
        await onSessionIdle({ client, directory, sessionId })
      } catch (err) {
        console.error("[openwiki] failed to update wiki page:", err)
      }
    },
  }
}

async function initWiki(directory, projectName) {
  const root = wikiRoot(directory)
  const pages = pagesRoot(directory)
  await fs.mkdir(pages, { recursive: true })

  const name = projectName ?? path.basename(directory)
  let filesWritten = 0
  for (const file of ["README.md", "TEMPLATE.md", "INDEX.md", "QUESTIONS.md"]) {
    const dest = path.join(root, file)
    if (await exists(dest)) continue
    const src = await fs.readFile(path.join(TEMPLATES_DIR, file), "utf8")
    await fs.writeFile(dest, src.replaceAll("<PROJECT_NAME>", name), "utf8")
    filesWritten++
  }

  const commandsDest = path.join(directory, ".opencode", "commands")
  await fs.mkdir(commandsDest, { recursive: true })
  let commandsWritten = 0
  for (const file of await fs.readdir(COMMANDS_DIR)) {
    const dest = path.join(commandsDest, file)
    if (await exists(dest)) continue
    await fs.copyFile(path.join(COMMANDS_DIR, file), dest)
    commandsWritten++
  }

  return `OpenWiki initialized for "${name}": ${filesWritten} wiki file(s) written to wiki/, ${commandsWritten} command(s) installed to .opencode/commands/.`
}

async function onSessionIdle({ client, directory, sessionId }) {
  const messagesResp = await client.session.messages({ path: { id: sessionId } })
  const messages = messagesResp?.data ?? messagesResp ?? []
  const transcript = transcriptFromMessages(messages)
  if (transcript.length < MIN_TRANSCRIPT_CHARS) return

  const readme = await readIfExists(path.join(wikiRoot(directory), "README.md"))
  const template = await readIfExists(path.join(wikiRoot(directory), "TEMPLATE.md"))
  if (!readme || !template) return

  const existingPage = await findExistingPageForSession(directory, sessionId)
  const today = new Date().toISOString().slice(0, 10)

  const prompt = buildWikiAgentPrompt({ readme, template, transcript, sessionId, today, existingPage })
  const model = await resolveModel(directory, client, messages)

  const childSession = await client.session.create({ body: { title: `openwiki: ${sessionId}` } })
  const childId = childSession?.data?.id ?? childSession?.id
  const result = await client.session.prompt({
    path: { id: childId },
    body: {
      model: model ?? undefined,
      parts: [{ type: "text", text: prompt }],
    },
  })

  const replyText = extractReplyText(result)
  const decision = parseAgentJson(replyText)
  if (decision.skip) return

  const filename = existingPage ? existingPage.filename : decision.filename
  const pagePath = path.join(pagesRoot(directory), filename)
  await fs.mkdir(pagesRoot(directory), { recursive: true })
  await fs.writeFile(pagePath, decision.content, "utf8")

  const indexPath = path.join(wikiRoot(directory), "INDEX.md")
  const index = (await readIfExists(indexPath)) ?? ""
  await fs.writeFile(indexPath, upsertIndexEntry(index, filename, decision.indexLine), "utf8")
}

function extractReplyText(result) {
  const info = result?.data ?? result
  const parts = info?.parts ?? info?.message?.parts ?? []
  return parts
    .filter((p) => p.type === "text" && typeof p.text === "string")
    .map((p) => p.text)
    .join("\n")
}

function parseModelString(str) {
  const slash = str.indexOf("/")
  if (slash === -1) return null
  return {
    providerID: str.slice(0, slash),
    modelID: str.slice(slash + 1),
  }
}

async function resolveModel(directory, client, messages) {
  const configPath = path.join(directory, "openwiki.json")
  try {
    const content = await fs.readFile(configPath, "utf8")
    const parsed = JSON.parse(content)
    if (parsed.model && typeof parsed.model === "string") {
      const model = parseModelString(parsed.model)
      if (model) return model
    }
  } catch {
    // not found or invalid — continue to fallback
  }

  const firstUser = messages.find((m) => {
    const info = m.info ?? m
    return info.role === "user"
  })
  if (firstUser) {
    const info = firstUser.info ?? firstUser
    if (info.model?.providerID && info.model?.modelID) {
      return { providerID: info.model.providerID, modelID: info.model.modelID }
    }
  }

  try {
    const configResp = await client.config.get()
    const config = configResp?.data ?? configResp
    if (config?.model) return parseModelString(config.model)
  } catch {
    // give up
  }

  return null
}

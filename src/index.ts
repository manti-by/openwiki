import { promises as fs } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { exists, wikiRoot } from "./lib/wiki.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PACKAGE_ROOT = path.dirname(__dirname)
const TEMPLATES_DIR = path.join(PACKAGE_ROOT, "templates")
const COMMANDS_DIR = path.join(PACKAGE_ROOT, "commands")

export const OpenWiki = async ({ directory }: { client: unknown; directory: string }) => {
  await install(directory)
}

async function install(directory: string): Promise<void> {
  const name = path.basename(directory)
  await installCommands(directory)
  await scaffoldWiki(directory, name)
}

async function installCommands(directory: string): Promise<{ installed: number; skipped: number }> {
  const commandsDest = path.join(directory, ".opencode", "commands")
  await fs.mkdir(commandsDest, { recursive: true })
  let installed = 0
  let skipped = 0
  for (const file of await fs.readdir(COMMANDS_DIR)) {
    if (!file.endsWith(".md")) continue
    const dest = path.join(commandsDest, file)
    if (await exists(dest)) {
      skipped++
      continue
    }
    const src = await fs.readFile(path.join(COMMANDS_DIR, file), "utf8")
    await fs.writeFile(dest, src, "utf8")
    installed++
  }
  return { installed, skipped }
}

async function scaffoldWiki(directory: string, projectName: string): Promise<{ filesWritten: number }> {
  const root = wikiRoot(directory)
  await fs.mkdir(root, { recursive: true })

  let filesWritten = 0
  for (const file of ["README.md", "TEMPLATE.md", "INDEX.md", "QUESTIONS.md"]) {
    const dest = path.join(root, file)
    if (await exists(dest)) continue
    const src = await fs.readFile(path.join(TEMPLATES_DIR, file), "utf8")
    await fs.writeFile(dest, src.replaceAll("<PROJECT_NAME>", projectName), "utf8")
    filesWritten++
  }
  return { filesWritten }
}

export default OpenWiki

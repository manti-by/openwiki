import { promises as fs } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PACKAGE_ROOT = path.dirname(__dirname)
const TEMPLATES_DIR = path.join(PACKAGE_ROOT, "templates")
const SKILLS_DIR = path.join(PACKAGE_ROOT, "skills")

export async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

export const OpenWiki = async ({ directory }: { client: unknown; directory: string }) => {
  const name = path.basename(directory)

  await installCommands(directory)
  await installWiki(directory, name)
}

async function installCommands(directory: string): Promise<{ installed: number; skipped: number }> {
  const skillsDest = path.join(directory, ".opencode", "skills")
  await fs.mkdir(skillsDest, { recursive: true })

  let installed = 0
  let skipped = 0

  async function copyDir(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true })
    for (const entry of await fs.readdir(src, { withFileTypes: true })) {
      const srcPath = path.join(src, entry.name)
      const destPath = path.join(dest, entry.name)
      if (entry.isDirectory()) {
        await copyDir(srcPath, destPath)
      } else {
        if (await exists(destPath)) {
          skipped++
        } else {
          await fs.copyFile(srcPath, destPath)
          installed++
        }
      }
    }
  }

  await copyDir(SKILLS_DIR, skillsDest)
  return { installed, skipped }
}

async function installWiki(directory: string, projectName: string): Promise<{ filesWritten: number }> {
  const root = path.join(directory, "wiki")
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

import { promises as fs } from "node:fs"
import path from "node:path"

export const WIKI_DIRNAME = "wiki"

export function wikiRoot(projectDir: string): string {
  return path.join(projectDir, WIKI_DIRNAME)
}

export async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

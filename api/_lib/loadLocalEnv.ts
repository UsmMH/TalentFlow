import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

let loaded = false

function envFiles(): string[] {
  const cwd = process.cwd()
  return [
    resolve(cwd, ".env.local"),
    resolve(cwd, "..", ".env.local"), // if cwd is source/ or .vercel/
  ]
}

/**
 * vercel dev often omits Sensitive dashboard secrets from Development.
 * Fill only missing/empty keys from the repo-root `.env.local` so local API works.
 */
export function loadLocalEnv(): void {
  if (loaded) return
  loaded = true
  if (process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview") return
  for (const file of envFiles()) {
    if (!existsSync(file)) continue
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq <= 0) continue
      const key = trimmed.slice(0, eq).trim()
      let val = trimmed.slice(eq + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (key && !process.env[key]) process.env[key] = val
    }
    break
  }
}

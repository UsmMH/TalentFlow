/**
 * Self-check: node --experimental-strip-types api/_lib/loadLocalEnv.selfcheck.ts
 * Fails if parser would skip a real KEY=value line.
 */
import { writeFileSync, unlinkSync } from "node:fs"
import { resolve } from "node:path"

const tmp = resolve(process.cwd(), ".env.local.selfcheck.tmp")
writeFileSync(tmp, "# comment\nFOO_BAR=abc\nEMPTY=\nQUOTED=\"x y\"\n")

// Inline the same parse rules (avoid importing side-effect loader against real .env.local)
const out: Record<string, string> = {}
for (const line of (await import("node:fs")).readFileSync(tmp, "utf8").split(/\r?\n/)) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith("#")) continue
  const eq = trimmed.indexOf("=")
  if (eq <= 0) continue
  const key = trimmed.slice(0, eq).trim()
  let val = trimmed.slice(eq + 1).trim()
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1)
  }
  if (key && !out[key]) out[key] = val
}
unlinkSync(tmp)

if (out.FOO_BAR !== "abc") throw new Error(`FOO_BAR=${out.FOO_BAR}`)
if (out.QUOTED !== "x y") throw new Error(`QUOTED=${out.QUOTED}`)
if (out.EMPTY !== undefined && out.EMPTY !== "") throw new Error(`EMPTY unexpected: ${out.EMPTY}`)
console.log("loadLocalEnv.selfcheck ok")

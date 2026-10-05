import type { VercelRequest, VercelResponse } from "@vercel/node"

/** Minimal probe: no shared imports, no env. Used to diagnose FUNCTION_INVOCATION_FAILED. */
export default function handler(_req: VercelRequest, res: VercelResponse) {
  return res.status(200).json({ ok: true, data: { service: "talentflow-api" } })
}

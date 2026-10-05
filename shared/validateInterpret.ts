/** Validate LLM interpret proposals (PROJECT_SPEC §7.2). Pure, no I/O. */

import { BEHAVIOR_KEYS } from "./policy.ts"
import type { BehaviorKey } from "./types.ts"
import { extractOriginalQuote } from "./normalize.ts"

export type InterpretProposal = {
  behavior_key: string
  level: number
  quote: string
  rationale: string
}

export type DroppedProposal = InterpretProposal & { reason: string }

const LEVELS = new Set([25, 50, 75, 100])
const KEYS = new Set<string>(BEHAVIOR_KEYS)

export function validateProposals(
  freeText: string,
  proposals: InterpretProposal[],
): { valid: InterpretProposal[]; dropped: DroppedProposal[] } {
  const valid: InterpretProposal[] = []
  const dropped: DroppedProposal[] = []

  for (const p of proposals) {
    if (!p || typeof p !== "object") {
      dropped.push({
        behavior_key: "",
        level: 0,
        quote: "",
        rationale: "",
        reason: "not_an_object",
      })
      continue
    }
    const behavior_key = String(p.behavior_key ?? "")
    const level = Number(p.level)
    const quote = String(p.quote ?? "")
    const rationale = String(p.rationale ?? "")

    if (!KEYS.has(behavior_key)) {
      dropped.push({ behavior_key, level, quote, rationale, reason: "unknown_behavior" })
      continue
    }
    if (!LEVELS.has(level)) {
      dropped.push({ behavior_key, level, quote, rationale, reason: "bad_level" })
      continue
    }
    const original = extractOriginalQuote(freeText, quote)
    if (!original) {
      dropped.push({ behavior_key, level, quote, rationale, reason: "quote_not_in_text" })
      continue
    }
    // Save the ORIGINAL text span as ai_quote, not the model's string.
    valid.push({ behavior_key, level, quote: original, rationale })
  }

  return { valid, dropped }
}

export function isBehaviorKey(k: string): k is BehaviorKey {
  return KEYS.has(k)
}

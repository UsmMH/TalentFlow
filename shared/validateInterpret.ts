/** Validate LLM interpret proposals (PROJECT_SPEC §7.2). Pure, no I/O. */

import { BEHAVIOR_KEYS } from "./policy"
import type { BehaviorKey } from "./types"
import { extractOriginalQuote, normalizeForQuoteMatch } from "./normalize"

export type InterpretProposal = {
  behavior_key: string
  level: number
  quote: string
  rationale: string
}

export type DroppedProposal = InterpretProposal & { reason: string }

const LEVELS = new Set([25, 50, 75, 100])
const KEYS = new Set<string>(BEHAVIOR_KEYS)

/** Flash-lite (esp. AR) often returns display names instead of keys. */
const KEY_ALIASES: Record<string, BehaviorKey> = {
  "delegation and trust": "delegation",
  "delegation_and_trust": "delegation",
  "coaching and feedback": "coaching",
  "coaching_and_feedback": "coaching",
  "conflict handling": "conflict",
  "conflict_handling": "conflict",
  "التفويض والثقة": "delegation",
  التفويض: "delegation",
  "التوجيه والملاحظات": "coaching",
  التوجيه: "coaching",
  "تحمل المسؤولية": "accountability",
  "تحمّل المسؤولية": "accountability",
  العدالة: "fairness",
  "معالجة الخلافات": "conflict",
  الخلافات: "conflict",
  التواصل: "communication",
}

const FUZZY: { needle: string; key: BehaviorKey }[] = [
  { needle: "delegation", key: "delegation" },
  { needle: "تفويض", key: "delegation" },
  { needle: "coaching", key: "coaching" },
  { needle: "توجيه", key: "coaching" },
  { needle: "feedback", key: "coaching" },
  { needle: "ملاحظات", key: "coaching" },
  { needle: "accountability", key: "accountability" },
  { needle: "مسؤول", key: "accountability" },
  { needle: "fairness", key: "fairness" },
  { needle: "عدال", key: "fairness" },
  { needle: "conflict", key: "conflict" },
  { needle: "خلاف", key: "conflict" },
  { needle: "communication", key: "communication" },
  { needle: "تواصل", key: "communication" },
]

/** Pull key from common flash-lite field variants. */
export function pickBehaviorKeyField(p: Record<string, unknown>): string {
  const candidates = [p.behavior_key, p.behaviorKey, p.key, p.behavior]
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c
  }
  return ""
}

export function normalizeBehaviorKey(raw: string): string {
  const t = String(raw ?? "").trim()
  if (!t) return t
  if (KEYS.has(t)) return t
  const lower = t.toLowerCase()
  if (KEYS.has(lower)) return lower
  const alias = KEY_ALIASES[t] ?? KEY_ALIASES[lower] ?? KEY_ALIASES[normalizeForQuoteMatch(t)]
  if (alias) return alias

  const n = normalizeForQuoteMatch(t)
  for (const { needle, key } of FUZZY) {
    if (n.includes(normalizeForQuoteMatch(needle)) || lower.includes(needle.toLowerCase())) return key
  }
  return t
}

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
    const row = p as InterpretProposal & Record<string, unknown>
    const behavior_key = normalizeBehaviorKey(pickBehaviorKeyField(row) || String(row.behavior_key ?? ""))
    const level = Number(row.level)
    const quote = String(row.quote ?? "")
    const rationale = String(row.rationale ?? "")

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

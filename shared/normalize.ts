/** Text normalization for AI quote validation (PROJECT_SPEC Phase 3 note). Pure, no I/O. */

/** Strip Arabic diacritics, tatweel; unify alef/ya/ta marbuta; collapse whitespace; case-fold English. */
export function normalizeForQuoteMatch(input: string): string {
  let s = input.normalize("NFKC")

  // Arabic diacritics (tashkeel) + Quranic marks commonly used as diacritics
  s = s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")

  // Tatweel (kashida)
  s = s.replace(/\u0640/g, "")

  // Zero-width / directional marks
  s = s.replace(/[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/g, "")

  // Alef variants → ا
  s = s.replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627")

  // Alef wasla already covered; hamza seated on ya → ي
  s = s.replace(/\u0626/g, "\u064A")

  // Alif maqsura → ya
  s = s.replace(/\u0649/g, "\u064A")

  // Ta marbuta → ha (common matching unification)
  s = s.replace(/\u0629/g, "\u0647")

  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim()

  // Case-fold English (and any Latin)
  s = s.toLowerCase()

  return s
}

/** True if `quote` appears in `text` after normalizing both sides. */
export function isNormalizedSubstring(text: string, quote: string): boolean {
  if (!quote.trim()) return false
  return normalizeForQuoteMatch(text).includes(normalizeForQuoteMatch(quote))
}

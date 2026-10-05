/** Text normalization for AI quote validation (PROJECT_SPEC Phase 3 note). Pure, no I/O. */

const DIACRITICS = /[\u064B-\u065F\u0670\u06D6-\u06ED]/
const ZW = /[\u200B-\u200F\u202A-\u202E\u2060\uFEFF]/

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

function unifyChar(ch: string): string {
  let out = ch.normalize("NFKC")
  if (/[\u0622\u0623\u0625\u0671]/.test(out)) out = "\u0627"
  else if (out === "\u0626" || out === "\u0649") out = "\u064A"
  else if (out === "\u0629") out = "\u0647"
  return out.toLowerCase()
}

/**
 * Walk `text` applying the same transforms as normalizeForQuoteMatch,
 * recording original start/end indices for each normalized character.
 */
export function buildNormalizationMap(text: string): {
  normalized: string
  /** original start index for each normalized char */
  starts: number[]
  /** original exclusive end index for each normalized char */
  ends: number[]
} {
  const starts: number[] = []
  const ends: number[] = []
  let normalized = ""
  let i = 0

  while (i < text.length) {
    const cp = text.codePointAt(i)!
    const ch = String.fromCodePoint(cp)
    const adv = cp > 0xffff ? 2 : 1

    if (ch === "\u0640" || DIACRITICS.test(ch) || ZW.test(ch)) {
      if (ends.length) ends[ends.length - 1] = i + adv
      i += adv
      continue
    }

    if (/\s/.test(ch)) {
      let j = i + adv
      while (j < text.length) {
        const cp2 = text.codePointAt(j)!
        const c2 = String.fromCodePoint(cp2)
        if (!/\s/.test(c2)) break
        j += cp2 > 0xffff ? 2 : 1
      }
      if (!normalized || normalized.endsWith(" ")) {
        if (ends.length && normalized.endsWith(" ")) ends[ends.length - 1] = j
        i = j
        continue
      }
      starts.push(i)
      ends.push(j)
      normalized += " "
      i = j
      continue
    }

    let j = i + adv
    while (j < text.length) {
      const cp2 = text.codePointAt(j)!
      const c2 = String.fromCodePoint(cp2)
      if (c2 === "\u0640" || DIACRITICS.test(c2) || ZW.test(c2)) {
        j += cp2 > 0xffff ? 2 : 1
        continue
      }
      break
    }

    const out = unifyChar(ch)
    for (const _ of out) {
      starts.push(i)
      ends.push(j)
      normalized += _
    }
    i = j
  }

  if (normalized.endsWith(" ")) {
    normalized = normalized.slice(0, -1)
    starts.pop()
    ends.pop()
  }

  return { normalized, starts, ends }
}

/**
 * After a normalized substring match, return the ORIGINAL text span
 * (indices mapped back), not the model's quote string.
 */
export function extractOriginalQuote(text: string, quote: string): string | null {
  const qn = normalizeForQuoteMatch(quote)
  if (!qn) return null
  const { normalized, starts, ends } = buildNormalizationMap(text)
  const idx = normalized.indexOf(qn)
  if (idx < 0) return null
  const start = starts[idx]
  const end = ends[idx + qn.length - 1]
  if (start === undefined || end === undefined) return null
  return text.slice(start, end)
}

/** True if `quote` appears in `text` after normalizing both sides. */
export function isNormalizedSubstring(text: string, quote: string): boolean {
  if (!quote.trim()) return false
  return normalizeForQuoteMatch(text).includes(normalizeForQuoteMatch(quote))
}

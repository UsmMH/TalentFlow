import { describe, expect, it } from "vitest"
import { extractOriginalQuote, isNormalizedSubstring, normalizeForQuoteMatch } from "./normalize"
import { validateProposals } from "./validateInterpret"

describe("normalizeForQuoteMatch", () => {
  it("strips Arabic diacritics and tatweel", () => {
    expect(normalizeForQuoteMatch("مُحَمَّـد")).toBe(normalizeForQuoteMatch("محمد"))
  })

  it("unifies alef variants", () => {
    expect(normalizeForQuoteMatch("أحمد")).toBe(normalizeForQuoteMatch("احمد"))
    expect(normalizeForQuoteMatch("إعاد")).toBe(normalizeForQuoteMatch("اعاد"))
    expect(normalizeForQuoteMatch("آمن")).toBe(normalizeForQuoteMatch("امن"))
  })

  it("unifies ya / alif maqsura and ta marbuta", () => {
    expect(normalizeForQuoteMatch("على")).toBe(normalizeForQuoteMatch("علي"))
    expect(normalizeForQuoteMatch("مدرسة")).toBe(normalizeForQuoteMatch("مدرسه"))
  })

  it("collapses whitespace and case-folds English", () => {
    expect(normalizeForQuoteMatch("  Redoes   It  ")).toBe("redoes it")
  })
})

describe("isNormalizedSubstring", () => {
  const text = "When team members hand in their work, he often redoes it himself overnight instead of giving feedback."

  it("accepts an exact quote", () => {
    expect(isNormalizedSubstring(text, "redoes it himself overnight")).toBe(true)
  })

  it("accepts Arabic alef/diacritic variants as a match", () => {
    const ar = "غالباً ما يعيد إنجازه بنفسه طوال الليل بدل إعطاء ملاحظات."
    expect(isNormalizedSubstring(ar, "يعيد انجازه بنفسه طوال الليل")).toBe(true)
  })

  it("rejects a quote not in the text", () => {
    expect(isNormalizedSubstring(text, "invented phrase about email")).toBe(false)
  })
})

describe("validateProposals", () => {
  const free =
    "Ahmed delivers excellent analysis. He often redoes it himself overnight instead of giving feedback. He took ownership when the dashboard failed last quarter. In a disagreement he went quiet and the issue stayed unresolved for weeks."

  it("keeps a valid quote", () => {
    const { valid, dropped } = validateProposals(free, [
      {
        behavior_key: "delegation",
        level: 50,
        quote: "redoes it himself overnight",
        rationale: "He redoes work instead of coaching.",
      },
    ])
    expect(valid).toHaveLength(1)
    expect(dropped).toHaveLength(0)
  })

  it("drops quote not in the text", () => {
    const { valid, dropped } = validateProposals(free, [
      {
        behavior_key: "delegation",
        level: 50,
        quote: "never appears in the feedback at all",
        rationale: "x",
      },
    ])
    expect(valid).toHaveLength(0)
    expect(dropped[0]?.reason).toBe("quote_not_in_text")
  })

  it("drops unknown behavior", () => {
    const { dropped } = validateProposals(free, [
      { behavior_key: "charisma", level: 75, quote: "redoes it himself overnight", rationale: "x" },
    ])
    expect(dropped[0]?.reason).toBe("unknown_behavior")
  })

  it("drops bad level", () => {
    const { dropped } = validateProposals(free, [
      { behavior_key: "delegation", level: 60, quote: "redoes it himself overnight", rationale: "x" },
    ])
    expect(dropped[0]?.reason).toBe("bad_level")
  })

  it("accepts Arabic variant quotes against Arabic free text", () => {
    const ar =
      "عندما يسلّم أعضاء الفريق عملهم، غالباً ما يعيد إنجازه بنفسه طوال الليل بدل إعطاء ملاحظات. تحمّل المسؤولية عندما تعطّلت لوحة المعلومات."
    const { valid } = validateProposals(ar, [
      {
        behavior_key: "delegation",
        level: 50,
        quote: "يعيد انجازه بنفسه طوال الليل",
        rationale: "يعيد العمل بدل التفويض.",
      },
    ])
    expect(valid).toHaveLength(1)
  })

  it("saves the ORIGINAL span when the model quote has diacritics/spacing differences", () => {
    const ar =
      "عندما يسلّم أعضاء الفريق عملهم، غالباً ما يعيد إنجازه بنفسه طوال الليل بدل إعطاء ملاحظات."
    // Model-ish quote: different alef, spacing, no tatweel/diacritics matching original exactly
    const modelQuote = "غالبا  ما يعيد انجازه بنفسه طوال الليل"
    const { valid, dropped } = validateProposals(ar, [
      { behavior_key: "delegation", level: 50, quote: modelQuote, rationale: "يعيد العمل." },
    ])
    expect(dropped).toHaveLength(0)
    expect(valid).toHaveLength(1)
    expect(valid[0]!.quote).not.toBe(modelQuote)
    expect(ar.includes(valid[0]!.quote)).toBe(true)
    expect(normalizeForQuoteMatch(valid[0]!.quote)).toBe(normalizeForQuoteMatch(modelQuote))
  })
})

describe("extractOriginalQuote", () => {
  it("maps Arabic diacritic/spacing match back to the original span", () => {
    const original =
      "غالباً ما يعيد إنجازه بنفسه طوال الليل بدل إعطاء ملاحظات."
    const modelish = "غالبا ما يعيد انجازه بنفسه طوال الليل"
    const span = extractOriginalQuote(original, modelish)
    expect(span).toBeTruthy()
    expect(original.includes(span!)).toBe(true)
    expect(normalizeForQuoteMatch(span!)).toBe(normalizeForQuoteMatch(modelish))
  })
})

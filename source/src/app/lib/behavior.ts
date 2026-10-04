// Behavioral readiness. Scores come only from confirmed ratings via §6 rules — never hard-coded in the UI.
import { b, type B } from "./demo-data.ts"
import { PROMOTION_COST as P } from "./assumptions.ts"
import type { Explain } from "./explain.ts"

export type BId = "delegation" | "coaching" | "accountability" | "fairness" | "conflict" | "communication"
export const BEHAVIOR_IDS: BId[] = ["delegation", "coaching", "accountability", "fairness", "conflict", "communication"]

export type RubricLevel = { en: string; ar: string }
export type Rubric = Record<"25" | "50" | "75" | "100", RubricLevel>

export const BEHAVIORS: Record<BId, { name: B; anchor: B; rubric: Rubric }> = {
  delegation: {
    name: b("التفويض والثقة", "Delegation and trust"),
    anchor: b("يسلّم مهام ذات قيمة ويترك الآخرين يملكون النتيجة بدل إعادة عملهم", "Hands over meaningful tasks and lets others own outcomes, instead of redoing their work"),
    rubric: {
      "25": { en: "Keeps most tasks; rarely assigns meaningful work.", ar: "يبقي معظم المهام لنفسه ونادراً ما يفوّض عملاً ذا قيمة." },
      "50": { en: "Delegates some tasks but often redoes or closely controls the work.", ar: "يفوّض بعض المهام لكنه غالباً يعيد العمل أو يسيطر عليه عن قرب." },
      "75": { en: "Hands over meaningful tasks and lets others own outcomes, instead of redoing their work.", ar: "يسلّم مهام ذات قيمة ويترك الآخرين يملكون النتيجة بدل إعادة عملهم." },
      "100": { en: "Builds capacity by delegating stretch work with clear ownership and support.", ar: "يبني قدرات الفريق بتفويض مهام تطويرية بملكية واضحة ودعم." },
    },
  },
  coaching: {
    name: b("التوجيه والملاحظات", "Coaching and feedback"),
    anchor: b("يعطي ملاحظات محددة في وقتها ويساعد الآخرين على التحسن", "Gives specific, timely feedback and helps others improve"),
    rubric: {
      "25": { en: "Gives little feedback; others do not know how to improve.", ar: "يقدّم ملاحظات قليلة ولا يعرف الآخرون كيف يتحسنون." },
      "50": { en: "Gives occasional feedback, often vague or late.", ar: "يقدّم ملاحظات أحياناً وتكون عامة أو متأخرة." },
      "75": { en: "Gives specific, timely feedback and helps others improve.", ar: "يعطي ملاحظات محددة في وقتها ويساعد الآخرين على التحسن." },
      "100": { en: "Coaches consistently; others grow visibly under their guidance.", ar: "يوجّه باستمرار وينمو الآخرون بوضوح تحت إرشاده." },
    },
  },
  accountability: {
    name: b("تحمّل المسؤولية", "Accountability"),
    anchor: b("يتحمل النتائج والأخطاء ويفي بالتزاماته", "Owns results and mistakes; follows through on commitments"),
    rubric: {
      "25": { en: "Avoids ownership when things go wrong.", ar: "يتجنب تحمل المسؤولية عند حدوث مشاكل." },
      "50": { en: "Owns some outcomes; follow-through is uneven.", ar: "يتحمل بعض النتائج والمتابعة غير منتظمة." },
      "75": { en: "Owns results and mistakes; follows through on commitments.", ar: "يتحمل النتائج والأخطاء ويفي بالتزاماته." },
      "100": { en: "Sets a standard of ownership others rely on under pressure.", ar: "يضع معياراً لتحمل المسؤولية يعتمد عليه الآخرون تحت الضغط." },
    },
  },
  fairness: {
    name: b("العدالة", "Fairness"),
    anchor: b("يطبق القرارات والتقدير بالتساوي على الفريق", "Applies decisions and recognition consistently across the team"),
    rubric: {
      "25": { en: "Decisions and recognition feel uneven across the team.", ar: "القرارات والتقدير غير متساويين عبر الفريق." },
      "50": { en: "Usually fair, with occasional inconsistencies.", ar: "عادة عادل مع بعض التفاوت أحياناً." },
      "75": { en: "Applies decisions and recognition consistently across the team.", ar: "يطبق القرارات والتقدير بالتساوي على الفريق." },
      "100": { en: "Team trusts process and treatment even in hard trade-offs.", ar: "يثق الفريق بالعملية والمعاملة حتى في المفاضلات الصعبة." },
    },
  },
  conflict: {
    name: b("معالجة الخلافات", "Conflict handling"),
    anchor: b("يعالج التوتر مبكراً وبشكل بنّاء", "Addresses tension early and constructively"),
    rubric: {
      "25": { en: "Avoids or postpones conflict until it harms the work.", ar: "يتجنب الخلاف أو يؤجله حتى يضر بالعمل." },
      "50": { en: "Addresses some conflicts; others linger.", ar: "يعالج بعض الخلافات وتبقى أخرى معلّقة." },
      "75": { en: "Addresses tension early and constructively.", ar: "يعالج التوتر مبكراً وبشكل بنّاء." },
      "100": { en: "Turns conflict into clearer decisions and stronger working relationships.", ar: "يحوّل الخلاف إلى قرارات أوضح وعلاقات عمل أقوى." },
    },
  },
  communication: {
    name: b("التواصل", "Communication"),
    anchor: b("يشرح الأولويات والسياق بوضوح وينصت", "Explains priorities and context clearly and listens"),
    rubric: {
      "25": { en: "Priorities and context are often unclear to others.", ar: "الأولويات والسياق غالباً غير واضحين للآخرين." },
      "50": { en: "Communicates adequately on request; listening is uneven.", ar: "يتواصل بشكل مقبول عند الطلب والاستماع غير منتظم." },
      "75": { en: "Explains priorities and context clearly and listens.", ar: "يشرح الأولويات والسياق بوضوح وينصت." },
      "100": { en: "Keeps the team aligned under ambiguity; others feel heard.", ar: "يبقي الفريق متوافقاً وسط الغموض ويشعر الآخرون بأنهم مسموعون." },
    },
  },
}

export const ROLE = b("مدير فريق", "Team Manager")
/** §6.7 Team Manager requirements — weights sum to 100 */
export const ROLE_REQ: { id: BId; required: number; weight: number; critical: boolean }[] = [
  { id: "delegation", required: 75, weight: 20, critical: true },
  { id: "coaching", required: 75, weight: 20, critical: false },
  { id: "accountability", required: 75, weight: 15, critical: false },
  { id: "fairness", required: 75, weight: 15, critical: false },
  { id: "conflict", required: 50, weight: 15, critical: false },
  { id: "communication", required: 75, weight: 15, critical: false },
]

/** Scored sources only (§6.2). Self is never included in the score. */
export type ScoreSource = "manager" | "peer" | "document"
export type Rater = ScoreSource | "self"
export const RATER_NAME: Record<Rater, B> = {
  manager: b("المدير", "Manager"),
  peer: b("الزملاء", "Peers"),
  document: b("مستند", "Document"),
  self: b("الموظف نفسه", "Self"),
}
export const RATER_W: Record<ScoreSource, number> = { manager: 0.45, peer: 0.35, document: 0.2 }

export type Rating = Record<Rater, number | null>
export type Ratings = Record<BId, Rating>
export type EvidenceQuote = { text: B; source: Rater | "retro"; confirmed: boolean }

export type Employee = {
  id: string
  slug: string
  name: B
  role: B
  department?: B
  ratings: Ratings
  evidence?: Partial<Record<BId, EvidenceQuote[]>>
  /** ISO dates of confirmed ratings (for staleness) */
  ratingDates?: string[]
}

const emptyRating = (): Rating => ({ manager: null, peer: null, document: null, self: null })
export const emptyRatings = (): Ratings =>
  Object.fromEntries(BEHAVIOR_IDS.map((id) => [id, emptyRating()])) as Ratings

const r = (m: number | null, p: number | null, d: number | null, s: number | null): Rating =>
  ({ manager: m, peer: p, document: d, self: s })

/** Local fallback matching seed §6.7 (used when Supabase env is missing). */
export const EMPLOYEES: Employee[] = [
  {
    id: "ahmad", slug: "ahmad",
    name: b("أحمد العتيبي", "Ahmed Al-Otaibi"),
    role: b("محلل بيانات أول", "Senior Data Analyst"),
    department: b("قسم التحليلات", "Analytics"),
    ratings: {
      delegation: r(50, 50, null, 100),
      coaching: r(50, 50, null, 75),
      accountability: r(100, 100, 100, 75),
      fairness: r(75, 75, null, 75),
      conflict: r(25, 25, null, 50),
      communication: r(75, 75, null, 75),
    },
    evidence: {
      delegation: [
        { text: b("«يعيد كتابة التقارير بنفسه بدل أن يتركها لزميله»", "\"Rewrites the reports himself instead of leaving them to a colleague\""), source: "manager", confirmed: true },
        { text: b("«نادراً ما أعرف ما يمكنني أخذه من مهامه»", "\"I rarely know which of his tasks I can take on\""), source: "peer", confirmed: true },
        { text: b("«أفوّض كل ما يمكن تفويضه»", "\"I delegate everything that can be delegated\""), source: "self", confirmed: true },
      ],
      coaching: [{ text: b("«الملاحظات تتأخر تحت ضغط التسليم»", "\"Feedback is delayed when under delivery pressure\""), source: "manager", confirmed: true }],
      accountability: [{ text: b("«تحمّل تعطل لوحة المعلومات في الربع الماضي»", "\"Owned the dashboard failure last quarter\""), source: "document", confirmed: true }],
      conflict: [{ text: b("«صمت في خلاف الأولويات وبقيت المسألة دون حل لأسابيع»", "\"Went quiet in a priorities disagreement for weeks\""), source: "peer", confirmed: true }],
    },
    ratingDates: ["2026-08-10"],
  },
  {
    id: "sara", slug: "sara",
    name: b("سارة القحطاني", "Sara Al-Qahtani"),
    role: b("محللة أعمال أولى", "Senior Business Analyst"),
    ratings: {
      delegation: r(75, 75, 75, 75),
      coaching: r(75, 75, null, null),
      accountability: r(75, 75, 75, null),
      fairness: r(75, 75, null, null),
      conflict: r(50, 50, null, null),
      communication: r(75, 75, null, null),
    },
    ratingDates: ["2026-08-04"],
  },
  {
    id: "khaled", slug: "khaled",
    name: b("خالد الزهراني", "Khaled Al-Zahrani"),
    role: b("مطور أول", "Senior Developer"),
    ratings: {
      delegation: r(25, 25, null, null),
      coaching: r(25, 25, null, null),
      accountability: r(75, 75, null, null),
      fairness: r(50, 50, null, null),
      conflict: r(25, 25, null, null),
      communication: r(50, 50, null, null),
    },
    ratingDates: ["2026-08-02"],
  },
  {
    id: "omar", slug: "omar",
    name: b("عمر الشهري", "Omar Al-Shehri"),
    role: b("مهندس بيانات", "Data Engineer"),
    ratings: {
      delegation: r(25, null, null, null),
      coaching: r(25, null, null, null),
      accountability: r(50, null, null, null),
      fairness: r(null, null, null, null),
      conflict: r(null, null, null, null),
      communication: r(null, null, null, null),
    },
    ratingDates: ["2026-08-01"],
  },
  {
    id: "lama", slug: "lama",
    name: b("لمى الحربي", "Lama Al-Harbi"),
    role: b("محللة أعمال", "Business Analyst"),
    ratings: {
      delegation: r(75, 50, null, null),
      coaching: r(50, null, null, null),
      accountability: r(75, 75, null, null),
      fairness: r(50, null, null, null),
      conflict: r(50, null, null, null),
      communication: r(75, 50, null, null),
    },
    ratingDates: ["2026-08-02"],
  },
  {
    id: "noura", slug: "noura",
    name: b("نورة المطيري", "Noura Al-Mutairi"),
    role: b("أخصائية تقارير", "Reporting Specialist"),
    ratings: emptyRatings(),
    ratingDates: [],
  },
]

export const emp = (idOrSlug: string) =>
  EMPLOYEES.find((e) => e.id === idOrSlug || e.slug === idOrSlug) ?? EMPLOYEES[0]

/* ---- scoring (§6) ---- */
const SCORE_SOURCES: ScoreSource[] = ["manager", "peer", "document"]

/** Confirmed others-only weighted score. Self excluded. */
export function behaviorScore(x: Rating): number | null {
  const present = SCORE_SOURCES.filter((k) => x[k] !== null)
  if (!present.length) return null
  const w = present.reduce((s, k) => s + RATER_W[k], 0)
  return Math.round((present.reduce((s, k) => s + x[k]! * RATER_W[k], 0) / w) * 100) / 100
}

/** Display anchor: floor continuous score to 25/50/75/100 (below 25 → 0 shown as null-ish via LevelLabel). */
export const behaviorLevel = (x: Rating) => {
  const a = behaviorScore(x)
  return a === null ? null : Math.floor(a / 25) * 25
}

export type Confidence = "high" | "medium" | "low" | "not_assessed"

export function behaviorConfidence(x: Rating, ratingDates: string[] = []): Confidence {
  const present = SCORE_SOURCES.filter((k) => x[k] !== null)
  if (!present.length) return "not_assessed"
  const individualRatings = present.length // one aggregated rating per source in our seed
  const stale = ratingDates.some((d) => {
    const ageMs = Date.now() - new Date(d).getTime()
    return ageMs > 365 * 24 * 60 * 60 * 1000
  })
  if (stale) return "low"
  if (present.length >= 3 || (present.length >= 2 && individualRatings >= 3)) return "high"
  // With one row per source, 2 sources + need 3 ratings: treat 2 sources as medium; 3 sources as high.
  if (present.length >= 2) return "medium"
  return "low"
}

export type PathKey = "now" | "develop" | "specialist" | "insufficient"

export function readiness(
  ratings: Ratings,
  ratingDates: string[] = [],
  roleReqs: typeof ROLE_REQ = ROLE_REQ,
) {
  const totalWeight = roleReqs.reduce((s, q) => s + q.weight, 0)
  const parts = roleReqs.map((q) => {
    const rt = ratings[q.id]
    const score = behaviorScore(rt)
    const others = SCORE_SOURCES.map((k) => rt[k]).filter((v): v is number => v !== null)
    const othersAvg = others.length ? others.reduce((s, v) => s + v, 0) / others.length : null
    const conf = behaviorConfidence(rt, ratingDates)
    const status =
      score === null ? "notAssessed" as const
        : score >= q.required ? "met" as const
          : q.critical ? "critical" as const
            : "partial" as const
    const fulfilment = score === null ? 0 : Math.min(score / q.required, 1)
    return {
      ...q,
      cur: score,
      level: score === null ? null : Math.floor(score / 25) * 25,
      status,
      conf,
      raters: SCORE_SOURCES.filter((k) => rt[k] !== null).length + (rt.self !== null ? 1 : 0),
      sourceCount: SCORE_SOURCES.filter((k) => rt[k] !== null).length,
      contribution: fulfilment * q.weight,
      blind: rt.self !== null && othersAvg !== null && rt.self - othersAvg >= 25,
      under: rt.self !== null && othersAvg !== null && rt.self - othersAvg <= -25,
      thin: SCORE_SOURCES.filter((k) => rt[k] !== null).length < 2,
    }
  })

  const assessed = parts.filter((p) => p.cur !== null)
  const assessedWeight = assessed.reduce((s, p) => s + p.weight, 0)
  const coverage = totalWeight === 0 ? 0 : assessedWeight / totalWeight
  const exact = assessedWeight === 0 ? 0 : (assessed.reduce((s, p) => s + p.contribution, 0) / assessedWeight) * 100
  const criticalMissing = parts.filter((p) => p.status === "critical")
  const criticalShortfallOk = criticalMissing.every((p) => p.cur !== null && p.required - p.cur! <= 25)

  const confs = assessed.map((p) => p.conf)
  const overallConfidence: Confidence =
    assessed.length === 0 ? "not_assessed"
      : confs.includes("low") ? "low"
        : confs.includes("medium") ? "medium"
          : "high"

  let path: PathKey
  if (coverage < 0.5) path = "insufficient"
  else if (exact >= 85 && criticalMissing.length === 0 && overallConfidence !== "low") path = "now"
  else if (exact >= 60 && criticalShortfallOk) path = "develop"
  else path = "specialist"

  // UI still uses high/low badges in places — map medium → high for the old dual badge
  const confidence: "high" | "low" = overallConfidence === "low" || overallConfidence === "not_assessed" ? "low" : "high"

  return {
    parts,
    exact: Math.round(exact * 100) / 100,
    rounded: Math.round(exact),
    coverage,
    criticalMissing,
    confidence,
    overallConfidence,
    path,
  }
}

export const PATH_NAME: Record<PathKey, B> = {
  now: b("جاهز الآن", "Ready now"),
  develop: b("طوّر أولاً ثم أعد التقييم", "Develop first, then re-evaluate"),
  specialist: b("مسار أخصائي أول", "Explore alternative path"),
  insufficient: b("أدلة غير كافية", "Insufficient evidence"),
}

/** What-if: Ahmad leads a small project first (hypothetical; never saved). */
export function whatIf(ratings: Ratings): Ratings {
  return {
    ...ratings,
    delegation: { ...ratings.delegation, manager: 75, peer: 75 },
  }
}

export const failedPromotionCost = () => P.replacementHiring + P.productivityLoss + P.teamTurnover

const f2 = (x: number) => (Math.round(x * 100) / 100).toString()

export function explainReadiness(e: Employee): Explain {
  const m = readiness(e.ratings, e.ratingDates)
  return {
    title: b(`كيف حُسبت جاهزية ${e.name.ar}؟`, `How ${e.name.en}'s readiness was calculated`),
    formula: b(
      "ملاءمة الدور = مجموع [ أقل قيمة من (الدرجة ÷ المطلوب، 1) × الوزن ] ÷ مجموع أوزان السلوكيات المقيّمة × 100. الدرجة من مصادر مؤكدة فقط (المدير 0.45 · الزميل 0.35 · المستند 0.20). تقييم الذات لا يدخل في الدرجة.",
      "Role match = Σ [ min(score ÷ required, 1) × weight ] ÷ Σ assessed weights × 100. Score from confirmed sources only (manager 0.45 · peer 0.35 · document 0.20). Self is excluded.",
    ),
    inputs: m.parts.map((p) => ({
      label: BEHAVIORS[p.id].name,
      value: p.cur === null
        ? "—"
        : b(`أقل قيمة(${f2(p.cur)}/${p.required}، 1) × ${p.weight} = ${f2(p.contribution)}`, `min(${f2(p.cur)}/${p.required}, 1) × ${p.weight} = ${f2(p.contribution)}`),
      note: p.cur === null ? b("غير مقيّم", "Not assessed") : undefined,
    })),
    result: b(`${f2(m.exact)}% ← يُعرض ${m.rounded}%`, `${f2(m.exact)}% → shown as ${m.rounded}%`),
  }
}

export function explainBehavior(e: Employee, id: BId): Explain {
  const rt = e.ratings[id]
  const present = SCORE_SOURCES.filter((k) => rt[k] !== null)
  const w = present.reduce((s, k) => s + RATER_W[k], 0)
  const avg = behaviorScore(rt)
  return {
    title: b(`كيف حُسب مستوى «${BEHAVIORS[id].name.ar}»؟`, `How the "${BEHAVIORS[id].name.en}" level was calculated`),
    formula: b(
      "المتوسط المرجّح للمصادر المؤكدة فقط (المدير 45% · الزميل 35% · المستند 20%). تقييم الذات يُستبعد من الدرجة ويُستخدم للنقاط العمياء.",
      "Weighted average of confirmed sources only (manager 45% · peer 35% · document 20%). Self is excluded from the score and used for blind spots.",
    ),
    inputs: present.map((k) => ({
      label: RATER_NAME[k],
      value: `${rt[k]} × ${f2(RATER_W[k] / w)}`,
      note: b(`الوزن الأصلي ${RATER_W[k] * 100}%`, `Original weight ${RATER_W[k] * 100}%`),
    })),
    result: avg === null
      ? b("غير مقيّم", "Not assessed")
      : b(`الدرجة ${f2(avg)}`, `Score ${f2(avg)}`),
  }
}

/** Compat alias used by older call sites */
export const behaviorAverage = behaviorScore
export const AHMAD_EVIDENCE: Partial<Record<BId, EvidenceQuote[]>> = emp("ahmad").evidence ?? {}

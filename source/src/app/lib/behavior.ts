// Behavioral readiness UI helpers + demo data. Scoring lives in @shared/engine (ONE engine).
import { b, type B } from "./demo-data.ts"
import { PROMOTION_COST as P } from "./assumptions.ts"
import type { Explain } from "./explain.ts"
import {
  SOURCE_WEIGHTS,
  TEAM_MANAGER_REQUIREMENTS,
  behaviorScore,
  behaviorLevel as floorLevel,
  readiness as engineReadiness,
  emptyRatings as engineEmptyRatings,
  type BehaviorSourceScores,
  type PathKey,
  type RatingsByBehavior,
  type RoleRequirement,
  type ScoreSource,
} from "@shared/engine.ts"
import type { Confidence } from "@shared/types.ts"

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
/** §6.7 Team Manager — from shared/policy (single source of truth) */
export const ROLE_REQ: RoleRequirement[] = TEAM_MANAGER_REQUIREMENTS

/** Scored sources only (§6.2). Self is never included in the score. */
export type { ScoreSource }
export type Rater = ScoreSource | "self"
export const RATER_NAME: Record<Rater, B> = {
  manager: b("المدير", "Manager"),
  peer: b("الزملاء", "Peers"),
  document: b("مستند", "Document"),
  self: b("الموظف نفسه", "Self"),
}
export const RATER_W: Record<ScoreSource, number> = { ...SOURCE_WEIGHTS }

export type Rating = BehaviorSourceScores
export type Ratings = RatingsByBehavior
export type EvidenceQuote = { text: B; source: Rater | "retro"; confirmed: boolean }

export type Employee = {
  id: string
  slug: string
  /** Supabase UUID when loaded from DB (needed for writes). */
  uuid?: string
  name: B
  role: B
  department?: B
  ratings: Ratings
  evidence?: Partial<Record<BId, EvidenceQuote[]>>
  /** ISO dates of confirmed ratings (for staleness) */
  ratingDates?: string[]
}

export const emptyRatings = (): Ratings => engineEmptyRatings()

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

/* ---- scoring: re-export ONE engine from shared/ ---- */
const SCORE_SOURCES: ScoreSource[] = ["manager", "peer", "document"]

export { behaviorScore }
export type { Confidence, PathKey }
export const behaviorLevel = (x: Rating) => floorLevel(behaviorScore(x))
export const behaviorAverage = behaviorScore

export function readiness(
  ratings: Ratings,
  ratingDates: string[] = [],
  roleReqs: RoleRequirement[] = ROLE_REQ,
) {
  return engineReadiness(ratings, ratingDates, roleReqs)
}

export const PATH_NAME: Record<PathKey, B> = {
  now: b("جاهز الآن", "Ready now"),
  develop: b("تطوير أولاً", "Develop first"),
  specialist: b("مسار بديل", "Alternative path"),
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
      "مطابقة الدور = مجموع [ أقل قيمة من (الدرجة ÷ المطلوب، 1) × الوزن ] ÷ مجموع أوزان السلوكيات المقيّمة × 100. الدرجة من مصادر مؤكدة فقط (المدير 0.45 · الزميل 0.35 · المستند 0.20). تقييم الذات لا يدخل في الدرجة.",
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

export const AHMAD_EVIDENCE: Partial<Record<BId, EvidenceQuote[]>> = emp("ahmad").evidence ?? {}

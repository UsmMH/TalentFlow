/** Analysis / plan validation + templates (PROJECT_SPEC §7.3–7.4). Pure, no I/O. */

import type { ReadinessSnapshot } from "./engine"
import { BEHAVIOR_KEYS } from "./policy"
import type { BehaviorKey, ReadinessSignal } from "./types"

export type Analysis = {
  summary: string
  strengths: { behavior_key: string; evidence: string }[]
  development_areas: { behavior_key: string; evidence: string; why_it_matters: string }[]
  blind_spots: { behavior_key: string; explanation: string }[]
  readiness_view: {
    signal: ReadinessSignal
    evidence_for: string[]
    evidence_against: string[]
    missing_evidence: string[]
  }
  path_options: { option: string; rationale: string }[]
  caution: string
}

export type PlanItem = {
  behavior_key: string
  type: "stretch_assignment" | "mentoring" | "course" | "practice"
  title: string
  description: string
  duration_weeks: number
  success_evidence: string
}

export type Plan = { items: PlanItem[] }

export type EngineSnapshotPayload = {
  exact: number
  rounded: number
  coverage: number
  signal: ReadinessSignal
  overallConfidence: string
  confidence: string
  parts: {
    id: BehaviorKey
    required: number
    weight: number
    critical: boolean
    cur: number | null
    level: number | null
    status: string
    conf: string
    contribution: number
    blind_spot: string | null
    thin: boolean
  }[]
  critical_gaps: BehaviorKey[]
}

export function toSnapshotPayload(snap: ReadinessSnapshot): EngineSnapshotPayload {
  return {
    exact: snap.exact,
    rounded: snap.rounded,
    coverage: Math.round(snap.coverage * 10000) / 10000,
    signal: snap.signal,
    overallConfidence: snap.overallConfidence,
    confidence: snap.confidence,
    parts: snap.parts.map((p) => ({
      id: p.id,
      required: p.required,
      weight: p.weight,
      critical: p.critical,
      cur: p.cur,
      level: p.level,
      status: p.status,
      conf: p.conf,
      contribution: Math.round(p.contribution * 100) / 100,
      blind_spot: p.blind_spot,
      thin: p.thin,
    })),
    critical_gaps: snap.criticalMissing.map((p) => p.id),
  }
}

/** Stable hash of engine snapshot for cache keys. */
export function snapshotHash(payload: EngineSnapshotPayload): string {
  const body = JSON.stringify({
    exact: payload.exact,
    rounded: payload.rounded,
    coverage: payload.coverage,
    signal: payload.signal,
    overallConfidence: payload.overallConfidence,
    confidence: payload.confidence,
    critical_gaps: payload.critical_gaps,
    parts: payload.parts.map((p) => ({
      id: p.id,
      required: p.required,
      weight: p.weight,
      critical: p.critical,
      cur: p.cur,
      level: p.level,
      status: p.status,
      conf: p.conf,
      contribution: p.contribution,
      blind_spot: p.blind_spot,
      thin: p.thin,
    })),
  })
  // FNV-1a 32-bit, hex — enough for cache keys in this demo
  let h = 0x811c9dc5
  for (let i = 0; i < body.length; i++) {
    h ^= body.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, "0")
}

const KEY_SET = new Set<string>(BEHAVIOR_KEYS)
const SIGNALS = new Set<string>([
  "Ready now",
  "Develop first",
  "Explore alternative path",
  "Insufficient evidence",
])
const PLAN_TYPES = new Set(["stretch_assignment", "mentoring", "course", "practice"])

/** Collect numbers the model is allowed to mention (from the snapshot only). */
export function allowedNumbers(payload: EngineSnapshotPayload): Set<string> {
  const out = new Set<string>()
  const add = (n: number | null | undefined) => {
    if (n === null || n === undefined || Number.isNaN(n)) return
    out.add(String(n))
    // also allow integer form of floats like 79.0 → 79 already separate
    if (Number.isFinite(n) && !Number.isInteger(n)) {
      out.add(String(Math.round(n * 100) / 100))
    }
  }
  add(payload.exact)
  add(payload.rounded)
  add(payload.coverage)
  add(Math.round(payload.coverage * 100)) // coverage as %
  for (const p of payload.parts) {
    add(p.required)
    add(p.weight)
    add(p.cur)
    add(p.level)
    add(p.contribution)
  }
  return out
}

const NUM_RE = /\d+(?:\.\d+)?/g

/** Extract numeric literals from nested strings. */
export function extractNumbersFromText(value: unknown): string[] {
  const found: string[] = []
  const walk = (v: unknown) => {
    if (typeof v === "string") {
      const m = v.match(NUM_RE)
      if (m) found.push(...m)
    } else if (Array.isArray(v)) {
      v.forEach(walk)
    } else if (v && typeof v === "object") {
      Object.values(v).forEach(walk)
    }
  }
  walk(value)
  return found
}

export type ValidationFailure = { reason: string; detail?: string }

export function validateAnalysis(
  analysis: unknown,
  payload: EngineSnapshotPayload,
): { ok: true; data: Analysis } | { ok: false; failures: ValidationFailure[] } {
  const failures: ValidationFailure[] = []
  if (!analysis || typeof analysis !== "object") {
    return { ok: false, failures: [{ reason: "not_an_object" }] }
  }
  const a = analysis as Analysis

  if (!a.readiness_view || typeof a.readiness_view !== "object") {
    failures.push({ reason: "missing_readiness_view" })
  } else if (a.readiness_view.signal !== payload.signal) {
    failures.push({
      reason: "signal_mismatch",
      detail: `got ${a.readiness_view.signal}, expected ${payload.signal}`,
    })
  } else if (!SIGNALS.has(a.readiness_view.signal)) {
    failures.push({ reason: "bad_signal", detail: String(a.readiness_view.signal) })
  }

  const checkKeys = (rows: { behavior_key: string }[] | undefined, label: string) => {
    if (!Array.isArray(rows)) {
      failures.push({ reason: `missing_${label}` })
      return
    }
    for (const row of rows) {
      if (!KEY_SET.has(row.behavior_key)) {
        failures.push({ reason: "unknown_behavior_key", detail: `${label}:${row.behavior_key}` })
      }
    }
  }
  checkKeys(a.strengths, "strengths")
  checkKeys(a.development_areas, "development_areas")
  checkKeys(a.blind_spots, "blind_spots")

  const allowed = allowedNumbers(payload)
  for (const num of extractNumbersFromText(a)) {
    if (!allowed.has(num)) {
      failures.push({ reason: "number_not_in_snapshot", detail: num })
    }
  }

  if (failures.length) return { ok: false, failures }
  return { ok: true, data: a }
}

export function validatePlan(
  plan: unknown,
  payload: EngineSnapshotPayload,
): { ok: true; data: Plan } | { ok: false; failures: ValidationFailure[] } {
  const failures: ValidationFailure[] = []
  if (!plan || typeof plan !== "object") {
    return { ok: false, failures: [{ reason: "not_an_object" }] }
  }
  const p = plan as Plan
  if (!Array.isArray(p.items)) {
    return { ok: false, failures: [{ reason: "missing_items" }] }
  }
  for (const item of p.items) {
    if (!KEY_SET.has(item.behavior_key)) {
      failures.push({ reason: "unknown_behavior_key", detail: item.behavior_key })
    }
    if (!PLAN_TYPES.has(item.type)) {
      failures.push({ reason: "bad_plan_type", detail: String(item.type) })
    }
    if (!Number.isFinite(item.duration_weeks) || item.duration_weeks <= 0) {
      failures.push({ reason: "bad_duration", detail: String(item.duration_weeks) })
    }
  }
  // Plan weeks are planning estimates — do not require them in the snapshot.
  // behavior_key / type checks above are the plan truth gates.
  if (failures.length) return { ok: false, failures }
  return { ok: true, data: p }
}

function nameOf(id: BehaviorKey, lang: "en" | "ar"): string {
  const names: Record<BehaviorKey, { en: string; ar: string }> = {
    delegation: { en: "Delegation and trust", ar: "التفويض والثقة" },
    coaching: { en: "Coaching and feedback", ar: "التوجيه والملاحظات" },
    accountability: { en: "Accountability", ar: "تحمّل المسؤولية" },
    fairness: { en: "Fairness", ar: "العدالة" },
    conflict: { en: "Conflict handling", ar: "معالجة الخلافات" },
    communication: { en: "Communication", ar: "التواصل" },
  }
  return names[id][lang]
}

/** Deterministic analysis from the engine snapshot (no LLM). */
export function templateAnalysis(
  payload: EngineSnapshotPayload,
  names: { employee: string; role: string },
  language: "en" | "ar",
): Analysis {
  const strengths = payload.parts
    .filter((p) => p.status === "met" && p.cur !== null)
    .map((p) => ({
      behavior_key: p.id,
      evidence:
        language === "ar"
          ? `${nameOf(p.id, "ar")} عند ${p.cur} (المطلوب ${p.required})`
          : `${nameOf(p.id, "en")} at ${p.cur} (required ${p.required})`,
    }))
  const development_areas = payload.parts
    .filter((p) => p.status !== "met" && p.cur !== null)
    .map((p) => ({
      behavior_key: p.id,
      evidence:
        language === "ar"
          ? `عند ${p.cur} مقابل المطلوب ${p.required}`
          : `At ${p.cur} vs required ${p.required}`,
      why_it_matters:
        language === "ar"
          ? p.critical
            ? `حرج لدور ${names.role}`
            : `مطلوب لدور ${names.role}`
          : p.critical
            ? `Critical for ${names.role}`
            : `Required for ${names.role}`,
    }))
  const blind_spots = payload.parts
    .filter((p) => p.blind_spot)
    .map((p) => ({
      behavior_key: p.id,
      explanation:
        language === "ar"
          ? p.blind_spot === "overestimates"
            ? `${nameOf(p.id, "ar")}: يبالغ في تقدير نفسه مقارنة بالآخرين`
            : `${nameOf(p.id, "ar")}: يقلل من تقدير نفسه مقارنة بالآخرين`
          : p.blind_spot === "overestimates"
            ? `${nameOf(p.id, "en")}: self rating overestimates vs others`
            : `${nameOf(p.id, "en")}: self rating underestimates vs others`,
    }))
  const evidence_for = strengths.map((s) => s.evidence)
  const evidence_against = development_areas.map(
    (d) => `${nameOf(d.behavior_key as BehaviorKey, language)}: ${d.evidence}`,
  )
  const missing_evidence = payload.parts
    .filter((p) => p.thin || p.cur === null)
    .map((p) =>
      language === "ar"
        ? `أدلة إضافية عن ${nameOf(p.id, "ar")}`
        : `More evidence on ${nameOf(p.id, "en")}`,
    )

  const path_options =
    language === "ar"
      ? [
          {
            option: payload.signal,
            rationale: `الملاءمة ${payload.exact}؛ الإشارة من المحرك: ${payload.signal}`,
          },
          {
            option: "مسار أخصائي أول",
            rationale: "خيار إذا فضّل العمق التخصصي على قيادة الناس",
          },
        ]
      : [
          {
            option: payload.signal,
            rationale: `Role match ${payload.exact}; engine signal: ${payload.signal}`,
          },
          {
            option: "Senior specialist track",
            rationale: "A fit if deep individual contribution is preferred over people leadership",
          },
        ]

  return {
    summary:
      language === "ar"
        ? `${names.employee}: ملاءمة الدور ${payload.exact} → ${payload.signal}.`
        : `${names.employee}: role match ${payload.exact} → ${payload.signal}.`,
    strengths,
    development_areas,
    blind_spots,
    readiness_view: {
      signal: payload.signal,
      evidence_for,
      evidence_against,
      missing_evidence,
    },
    path_options,
    caution:
      language === "ar"
        ? "القرار للإنسان. هذه إشارة جاهزية وليست توقعاً."
        : "A human decides. This is a readiness signal, not a prediction.",
  }
}

/** Deterministic plan tied to behavior gaps. */
export function templatePlan(
  payload: EngineSnapshotPayload,
  language: "en" | "ar",
): Plan {
  const gaps = payload.parts.filter((p) => p.status !== "met" && p.cur !== null)
  const targets = gaps.length ? gaps : payload.parts.filter((p) => p.thin).slice(0, 1)
  const items: PlanItem[] = targets.slice(0, 3).map((p, i) => {
    const type = (i === 0 ? "stretch_assignment" : i === 1 ? "mentoring" : "practice") as PlanItem["type"]
    const req = p.required
    if (language === "ar") {
      return {
        behavior_key: p.id,
        type,
        title:
          type === "stretch_assignment"
            ? `مهمة تطويرية: ${nameOf(p.id, "ar")}`
            : type === "mentoring"
              ? `إرشاد حول ${nameOf(p.id, "ar")}`
              : `ممارسة ${nameOf(p.id, "ar")}`,
        description: `اعمل على رفع ${nameOf(p.id, "ar")} من ${p.cur} نحو ${req} بأدلة ملحوظة.`,
        duration_weeks: type === "mentoring" ? 12 : type === "stretch_assignment" ? 6 : 8,
        success_evidence: `تقييمات جديدة مؤكدة لـ ${nameOf(p.id, "ar")} عند ${req} أو أعلى مع أمثلة`,
      }
    }
    return {
      behavior_key: p.id,
      type,
      title:
        type === "stretch_assignment"
          ? `Stretch assignment: ${nameOf(p.id, "en")}`
          : type === "mentoring"
            ? `Mentoring on ${nameOf(p.id, "en")}`
            : `Practice ${nameOf(p.id, "en")}`,
      description: `Work on raising ${nameOf(p.id, "en")} from ${p.cur} toward ${req} with observable evidence.`,
      duration_weeks: type === "mentoring" ? 12 : type === "stretch_assignment" ? 6 : 8,
      success_evidence: `New confirmed ratings for ${nameOf(p.id, "en")} at ${req}+ with examples`,
    }
  })
  if (!items.length) {
    items.push(
      language === "ar"
        ? {
            behavior_key: "communication",
            type: "practice",
            title: "الحفاظ على الأدلة الحالية",
            description: "استمر في جمع أمثلة ملحوظة عبر المصادر.",
            duration_weeks: 4,
            success_evidence: "تقييمات مؤكدة جديدة تحافظ على المستويات الحالية",
          }
        : {
            behavior_key: "communication",
            type: "practice",
            title: "Maintain current evidence",
            description: "Keep collecting observable examples across sources.",
            duration_weeks: 4,
            success_evidence: "New confirmed ratings that sustain current levels",
          },
    )
  }
  return { items }
}

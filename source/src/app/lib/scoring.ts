// Deterministic scoring. No AI.
import { ASSUMPTIONS as A } from "./assumptions.ts"
import { CANDIDATES, REQUIREMENTS, type Candidate, type Evidence, type SkillId, type Source } from "./demo-data.ts"

export const SOURCE_WEIGHT: Record<Source, number> = { test: 0.45, projects: 0.3, manager: 0.15, cert: 0.1, cv: 0.3 }
export const LEVELS = [25, 50, 75, 100] as const

/** Weighted average of available sources (weights renormalised), or null if no evidence. */
export function skillAverage(ev: Evidence | null): number | null {
  const e = Object.entries(ev ?? {}) as [Source, number][]
  if (!e.length) return null
  const w = e.reduce((s, [k]) => s + SOURCE_WEIGHT[k], 0)
  return Math.round((e.reduce((s, [k, v]) => s + v * SOURCE_WEIGHT[k], 0) / w) * 100) / 100
}
/** Floor to the nearest level 25/50/75/100 (below 25 → 0). */
export function skillLevel(ev: Evidence | null): number | null {
  const a = skillAverage(ev)
  return a === null ? null : Math.floor(a / 25) * 25
}

export type SkillStatus = "met" | "partial" | "critical" | "notAssessed"
export function skillStatus(cur: number | null, req: number, critical: boolean): SkillStatus {
  if (cur === null) return "notAssessed"
  if (cur >= req) return "met"
  return critical ? "critical" : "partial"
}

export function matchScore(c: Candidate) {
  const parts = REQUIREMENTS.map((r) => {
    const cur = skillLevel(c.evidence[r.skill])
    return {
      ...r, cur, status: skillStatus(cur, r.required, r.critical),
      ratio: cur === null ? 0 : Math.min(cur / r.required, 1),
      contribution: cur === null ? 0 : Math.min(cur / r.required, 1) * r.weight,
    }
  })
  const exact = parts.reduce((s, p) => s + p.contribution, 0)
  return {
    parts, exact, rounded: Math.round(exact),
    criticalMissing: parts.filter((p) => p.status === "critical").map((p) => p.skill as SkillId),
    notAssessed: parts.filter((p) => p.status === "notAssessed").map((p) => p.skill as SkillId),
  }
}

export function timeCost(c: Candidate) {
  const m = matchScore(c)
  if (m.criticalMissing.length) return { kind: "na" as const, weeks: null, cost: null, training: 0, backfill: 0 }
  if (c.type === "external") return { kind: "hire" as const, ...A.externalSenior, training: 0, backfill: 0 }
  const gaps = m.parts.filter((p) => p.cur !== null && p.cur < p.required && p.weight >= A.materialWeight)
    .reduce((s, p) => s + (p.required - p.cur!) / 25, 0)
  const training = gaps * A.costPerGap
  const backfill = c.backfill === "junior" ? A.externalJunior.cost : c.backfill === "dataEngineer" ? A.externalDataEngineer.cost : 0
  return { kind: gaps ? ("train" as const) : ("now" as const), weeks: gaps * A.weeksPerGap, cost: training + backfill, training, backfill }
}

export const byId = (id: string) => CANDIDATES.find((c) => c.id === id)

export const options = () => {
  const [a, s, f] = [byId("ahmad")!, byId("sara")!, byId("faisal")!]
  const [ta, ts, tf] = [timeCost(a), timeCost(s), timeCost(f)]
  const list = [
    { key: "A", c: a, fit: matchScore(a).exact, weeks: ta.weeks!, cost: ta.cost!, risk: "low" as const, recommended: true },
    { key: "B", c: s, fit: matchScore(s).exact, weeks: ts.weeks!, cost: ts.cost!, risk: "high" as const, recommended: false },
    { key: "C", c: f, fit: matchScore(f).exact, weeks: tf.weeks!, cost: tf.cost!, risk: "medium" as const, recommended: false },
  ]
  return { list, saving: list[2].cost - list[0].cost, faster: list[2].weeks - list[0].weeks }
}

export const LEVEL_NAME = {
  0: ["—", "—"],
  25: ["مبتدئ", "Beginner"],
  50: ["قيد التطوير", "Developing"],
  75: ["متمكن", "Proficient"],
  100: ["نموذجي", "Exemplary"],
} as const

export type LevelStep = keyof typeof LEVEL_NAME

/** Snap a score onto a rubric step for display. Engine still uses raw numbers. */
export function levelStep(level: number | null | undefined): LevelStep | null {
  if (level === null || level === undefined || Number.isNaN(level)) return null
  if (([0, 25, 50, 75, 100] as const).includes(level as LevelStep)) return level as LevelStep
  return (Math.max(0, Math.min(100, Math.round(level / 25) * 25)) || 0) as LevelStep
}

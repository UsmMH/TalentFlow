/** Pure scoring engine — no I/O. PROJECT_SPEC §6. */

import type { BehaviorKey, Confidence, ReadinessSignal } from "./types.ts"
import {
  BEHAVIOR_KEYS,
  BLIND_SPOT_GAP,
  COVERAGE_MIN,
  CRITICAL_SHORTFALL_MAX,
  DEVELOP_MATCH_MIN,
  EVIDENCE_MAX_AGE_MONTHS,
  READY_MATCH_MIN,
  SOURCE_WEIGHTS,
  TEAM_MANAGER_REQUIREMENTS,
  type RoleRequirement,
  type ScoreSource,
} from "./policy.ts"

export type { ScoreSource, RoleRequirement }
export { SOURCE_WEIGHTS, TEAM_MANAGER_REQUIREMENTS, BEHAVIOR_KEYS }

export type BehaviorSourceScores = {
  manager: number | null
  peer: number | null
  document: number | null
  self: number | null
}

export type RatingsByBehavior = Record<BehaviorKey, BehaviorSourceScores>

export type BehaviorMeta = {
  /** ISO dates of confirmed ratings for this behavior (staleness). */
  dates?: string[]
  /** Individual confirmed ratings per source before averaging (§6.3). */
  individualCounts?: Partial<Record<ScoreSource, number>>
}

const SCORE_SOURCES: ScoreSource[] = ["manager", "peer", "document"]

export function emptySourceScores(): BehaviorSourceScores {
  return { manager: null, peer: null, document: null, self: null }
}

export function emptyRatings(): RatingsByBehavior {
  return Object.fromEntries(BEHAVIOR_KEYS.map((k) => [k, emptySourceScores()])) as RatingsByBehavior
}

/** §6.2 — confirmed others-only weighted score. Self excluded. */
export function behaviorScore(x: BehaviorSourceScores): number | null {
  const present = SCORE_SOURCES.filter((k) => x[k] !== null && x[k] !== undefined)
  if (!present.length) return null
  const w = present.reduce((s, k) => s + SOURCE_WEIGHTS[k], 0)
  return Math.round((present.reduce((s, k) => s + x[k]! * SOURCE_WEIGHTS[k], 0) / w) * 100) / 100
}

/** Floor continuous score to display anchor 25/50/75/100. */
export function behaviorLevel(score: number | null): number | null {
  return score === null ? null : Math.floor(score / 25) * 25
}

function isStale(dates: string[], now: Date): boolean {
  if (!dates.length) return false
  const maxAgeMs = EVIDENCE_MAX_AGE_MONTHS * 30.4375 * 24 * 60 * 60 * 1000
  return dates.some((d) => now.getTime() - new Date(d).getTime() > maxAgeMs)
}

/** §6.3 confidence per behavior. */
export function behaviorConfidence(
  x: BehaviorSourceScores,
  meta: BehaviorMeta = {},
  now: Date = new Date(),
): Confidence {
  const present = SCORE_SOURCES.filter((k) => x[k] !== null && x[k] !== undefined)
  if (!present.length) return "not_assessed"

  const individualCount =
    meta.individualCounts
      ? present.reduce((s, k) => s + (meta.individualCounts![k] ?? 1), 0)
      : present.length

  if (isStale(meta.dates ?? [], now)) return "low"
  if (present.length >= 3 || (present.length >= 2 && individualCount >= 3)) return "high"
  if (present.length >= 2) return "medium"
  return "low"
}

/** §6.4 */
export function blindSpot(
  self: number | null,
  othersScore: number | null,
): "overestimates" | "underestimates" | null {
  if (self === null || othersScore === null) return null
  const gap = self - othersScore
  if (gap >= BLIND_SPOT_GAP) return "overestimates"
  if (gap <= -BLIND_SPOT_GAP) return "underestimates"
  return null
}

export type BehaviorPart = RoleRequirement & {
  cur: number | null
  level: number | null
  status: "met" | "partial" | "critical" | "notAssessed"
  conf: Confidence
  sourceCount: number
  raters: number
  contribution: number
  blind: boolean
  under: boolean
  thin: boolean
  blind_spot: "overestimates" | "underestimates" | null
}

export type ReadinessSnapshot = {
  parts: BehaviorPart[]
  exact: number
  rounded: number
  coverage: number
  criticalMissing: BehaviorPart[]
  overallConfidence: Confidence
  /** UI dual badge: medium maps to high */
  confidence: "high" | "low"
  signal: ReadinessSignal
}

export type ComputeReadinessInput = {
  ratings: RatingsByBehavior
  requirements?: RoleRequirement[]
  /** Per-behavior meta; if omitted, `ratingDates` applies to all assessed behaviors. */
  metaByBehavior?: Partial<Record<BehaviorKey, BehaviorMeta>>
  ratingDates?: string[]
  now?: Date
}

/** §6.5 role readiness */
export function computeReadiness(input: ComputeReadinessInput): ReadinessSnapshot {
  const requirements = input.requirements ?? TEAM_MANAGER_REQUIREMENTS
  const now = input.now ?? new Date()
  const totalWeight = requirements.reduce((s, q) => s + q.weight, 0)

  const parts: BehaviorPart[] = requirements.map((q) => {
    const rt = input.ratings[q.id] ?? emptySourceScores()
    const score = behaviorScore(rt)
    const others = SCORE_SOURCES.map((k) => rt[k]).filter((v): v is number => v !== null)
    const othersAvg = others.length ? others.reduce((s, v) => s + v, 0) / others.length : null
    const meta: BehaviorMeta = {
      dates: input.metaByBehavior?.[q.id]?.dates ?? input.ratingDates,
      individualCounts: input.metaByBehavior?.[q.id]?.individualCounts,
    }
    const conf = behaviorConfidence(rt, meta, now)
    const spot = blindSpot(rt.self, othersAvg)
    const status =
      score === null ? ("notAssessed" as const)
        : score >= q.required ? ("met" as const)
          : q.critical ? ("critical" as const)
            : ("partial" as const)
    const fulfilment = score === null ? 0 : Math.min(score / q.required, 1)
    const sourceCount = SCORE_SOURCES.filter((k) => rt[k] !== null).length
    return {
      ...q,
      cur: score,
      level: behaviorLevel(score),
      status,
      conf,
      sourceCount,
      raters: sourceCount + (rt.self !== null ? 1 : 0),
      contribution: fulfilment * q.weight,
      blind: spot === "overestimates",
      under: spot === "underestimates",
      thin: sourceCount < 2,
      blind_spot: spot,
    }
  })

  const assessed = parts.filter((p) => p.cur !== null)
  const assessedWeight = assessed.reduce((s, p) => s + p.weight, 0)
  const coverage = totalWeight === 0 ? 0 : assessedWeight / totalWeight
  const exact =
    assessedWeight === 0
      ? 0
      : (assessed.reduce((s, p) => s + p.contribution, 0) / assessedWeight) * 100
  const criticalMissing = parts.filter((p) => p.status === "critical")
  const criticalShortfallOk = criticalMissing.every(
    (p) => p.cur !== null && p.required - p.cur! <= CRITICAL_SHORTFALL_MAX,
  )

  const confs = assessed.map((p) => p.conf)
  const overallConfidence: Confidence =
    assessed.length === 0 ? "not_assessed"
      : confs.includes("low") ? "low"
        : confs.includes("medium") ? "medium"
          : "high"

  let signal: ReadinessSignal
  if (coverage < COVERAGE_MIN) signal = "Insufficient evidence"
  else if (exact >= READY_MATCH_MIN && criticalMissing.length === 0 && overallConfidence !== "low") {
    signal = "Ready now"
  } else if (exact >= DEVELOP_MATCH_MIN && criticalShortfallOk) {
    signal = "Develop first"
  } else {
    signal = "Explore alternative path"
  }

  const confidence: "high" | "low" =
    overallConfidence === "low" || overallConfidence === "not_assessed" ? "low" : "high"

  return {
    parts,
    exact: Math.round(exact * 100) / 100,
    rounded: Math.round(exact),
    coverage,
    criticalMissing,
    overallConfidence,
    confidence,
    signal,
  }
}

/** Map engine signal → existing UI path keys */
export type PathKey = "now" | "develop" | "specialist" | "insufficient"

export function signalToPath(signal: ReadinessSignal): PathKey {
  switch (signal) {
    case "Ready now": return "now"
    case "Develop first": return "develop"
    case "Explore alternative path": return "specialist"
    case "Insufficient evidence": return "insufficient"
  }
}

/** Convenience wrapper used by the frontend (same shape as before). */
export function readiness(
  ratings: RatingsByBehavior,
  ratingDates: string[] = [],
  requirements: RoleRequirement[] = TEAM_MANAGER_REQUIREMENTS,
  now?: Date,
) {
  const snap = computeReadiness({ ratings, ratingDates, requirements, now })
  return { ...snap, path: signalToPath(snap.signal) }
}

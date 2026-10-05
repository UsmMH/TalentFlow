/** Editable policy constants for the scoring engine (PROJECT_SPEC §6). Not scientific constants. */

import type { BehaviorKey } from "./types"

/** §6.2 — self is never included */
export const SOURCE_WEIGHTS = {
  manager: 0.45,
  peer: 0.35,
  document: 0.2,
} as const

export type ScoreSource = keyof typeof SOURCE_WEIGHTS

/** §6.4 blind-spot thresholds (points) */
export const BLIND_SPOT_GAP = 25

/** §6.3 — evidence older than this (months) → Low confidence */
export const EVIDENCE_MAX_AGE_MONTHS = 12

/** §6.5 readiness thresholds */
export const COVERAGE_MIN = 0.5
export const READY_MATCH_MIN = 85
export const DEVELOP_MATCH_MIN = 60
export const CRITICAL_SHORTFALL_MAX = 25

export type RoleRequirement = {
  id: BehaviorKey
  required: number
  weight: number
  critical: boolean
}

/** §6.7 Team Manager — default demo role */
export const TEAM_MANAGER_REQUIREMENTS: RoleRequirement[] = [
  { id: "delegation", required: 75, weight: 20, critical: true },
  { id: "coaching", required: 75, weight: 20, critical: false },
  { id: "accountability", required: 75, weight: 15, critical: false },
  { id: "fairness", required: 75, weight: 15, critical: false },
  { id: "conflict", required: 50, weight: 15, critical: false },
  { id: "communication", required: 75, weight: 15, critical: false },
]

export const BEHAVIOR_KEYS: BehaviorKey[] = [
  "delegation",
  "coaching",
  "accountability",
  "fairness",
  "conflict",
  "communication",
]

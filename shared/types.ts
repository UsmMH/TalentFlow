/** Shared domain types. Engine pure functions land here in Phase 2. */

export type BehaviorKey =
  | "delegation"
  | "coaching"
  | "accountability"
  | "fairness"
  | "conflict"
  | "communication"

export type Level = 25 | 50 | 75 | 100
export type RaterType = "manager" | "peer" | "document" | "self"
export type RatingSource = "human" | "ai_suggested"
export type RatingStatus = "pending" | "confirmed" | "rejected"

export type Confidence = "high" | "medium" | "low" | "not_assessed"
export type ReadinessSignal =
  | "Ready now"
  | "Develop first"
  | "Explore alternative path"
  | "Insufficient evidence"

export type Rubric = {
  "25": { en: string; ar: string }
  "50": { en: string; ar: string }
  "75": { en: string; ar: string }
  "100": { en: string; ar: string }
}

import { describe, expect, it } from "vitest"
import { computeReadiness, type BehaviorSourceScores, type RatingsByBehavior } from "./engine"
import {
  snapshotHash,
  templateAnalysis,
  templatePlan,
  toSnapshotPayload,
  validateAnalysis,
  validatePlan,
} from "./validateAnalysis"

const r = (
  manager: number | null,
  peer: number | null,
  document: number | null,
  self: number | null,
): BehaviorSourceScores => ({ manager, peer, document, self })

const ahmad: RatingsByBehavior = {
  delegation: r(50, 50, null, 100),
  coaching: r(50, 50, null, 75),
  accountability: r(100, 100, 100, 75),
  fairness: r(75, 75, null, 75),
  conflict: r(25, 25, null, 50),
  communication: r(75, 75, null, 75),
}

function ahmedPayload() {
  return toSnapshotPayload(computeReadiness({ ratings: ahmad, ratingDates: ["2026-08-10"] }))
}

describe("validateAnalysis", () => {
  it("rejects signal mismatch", () => {
    const payload = ahmedPayload()
    const base = templateAnalysis(payload, { employee: "Ahmed", role: "Team Manager" }, "en")
    const bad = {
      ...base,
      readiness_view: { ...base.readiness_view, signal: "Ready now" as const },
    }
    const v = validateAnalysis(bad, payload)
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.failures.some((f) => f.reason === "signal_mismatch")).toBe(true)
  })

  it("rejects unknown behavior_key", () => {
    const payload = ahmedPayload()
    const base = templateAnalysis(payload, { employee: "Ahmed", role: "Team Manager" }, "en")
    const bad = {
      ...base,
      strengths: [...base.strengths, { behavior_key: "charisma", evidence: "x" }],
    }
    const v = validateAnalysis(bad, payload)
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.failures.some((f) => f.reason === "unknown_behavior_key")).toBe(true)
  })

  it("rejects number not in snapshot", () => {
    const payload = ahmedPayload()
    const base = templateAnalysis(payload, { employee: "Ahmed", role: "Team Manager" }, "en")
    const bad = { ...base, summary: `${base.summary} Mystery score 91.` }
    const v = validateAnalysis(bad, payload)
    expect(v.ok).toBe(false)
    if (!v.ok) expect(v.failures.some((f) => f.reason === "number_not_in_snapshot")).toBe(true)
  })

  it("template fallback is valid (en + ar)", () => {
    const payload = ahmedPayload()
    for (const lang of ["en", "ar"] as const) {
      const t = templateAnalysis(payload, { employee: "Ahmed", role: "Team Manager" }, lang)
      const v = validateAnalysis(t, payload)
      expect(v.ok).toBe(true)
      const plan = templatePlan(payload, lang)
      const pv = validatePlan(plan, payload)
      expect(pv.ok).toBe(true)
    }
  })

  it("cache hit: identical snapshot hash (skip LLM when hashes match)", () => {
    const a = ahmedPayload()
    const b = ahmedPayload()
    expect(snapshotHash(a)).toBe(snapshotHash(b))
    // API uses: if cached.snapshot_hash === hash → return without LLM
    const cachedHash = snapshotHash(a)
    const currentHash = snapshotHash(b)
    expect(cachedHash === currentHash).toBe(true)
  })

  it("hash changes when scores change", () => {
    const a = ahmedPayload()
    const changed = { ...a, exact: a.exact + 1 }
    expect(snapshotHash(a)).not.toBe(snapshotHash(changed))
  })
})

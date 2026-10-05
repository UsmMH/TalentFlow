import { describe, expect, it } from "vitest"
import {
  behaviorConfidence,
  behaviorScore,
  computeReadiness,
  emptyRatings,
  readiness,
  type BehaviorSourceScores,
  type RatingsByBehavior,
} from "./engine.ts"
import { TEAM_MANAGER_REQUIREMENTS, type RoleRequirement } from "./policy.ts"

const r = (
  manager: number | null,
  peer: number | null,
  document: number | null,
  self: number | null,
): BehaviorSourceScores => ({ manager, peer, document, self })

/** §6.7 Ahmed */
const ahmad: RatingsByBehavior = {
  delegation: r(50, 50, null, 100),
  coaching: r(50, 50, null, 75),
  accountability: r(100, 100, 100, 75),
  fairness: r(75, 75, null, 75),
  conflict: r(25, 25, null, 50),
  communication: r(75, 75, null, 75),
}

/** §6.7 Sara */
const sara: RatingsByBehavior = {
  delegation: r(75, 75, 75, 75),
  coaching: r(75, 75, null, null),
  accountability: r(75, 75, 75, null),
  fairness: r(75, 75, null, null),
  conflict: r(50, 50, null, null),
  communication: r(75, 75, null, null),
}

/** §6.7 Khaled */
const khaled: RatingsByBehavior = {
  delegation: r(25, 25, null, null),
  coaching: r(25, 25, null, null),
  accountability: r(75, 75, null, null),
  fairness: r(50, 50, null, null),
  conflict: r(25, 25, null, null),
  communication: r(50, 50, null, null),
}

describe("§6.7 worked example", () => {
  it("Ahmed = 79.17 / Develop first / delegation blind spot", () => {
    const m = readiness(ahmad, ["2026-08-10"])
    expect(m.exact).toBeCloseTo(79.17, 2)
    expect(m.signal).toBe("Develop first")
    expect(m.path).toBe("develop")
    expect(m.criticalMissing[0]?.id).toBe("delegation")
    expect(m.parts[0].blind).toBe(true)
    expect(m.parts[0].blind_spot).toBe("overestimates")
  })

  it("Sara = 100 / Ready now", () => {
    const m = readiness(sara, ["2026-08-04"])
    expect(m.exact).toBeCloseTo(100, 2)
    expect(m.signal).toBe("Ready now")
    expect(m.path).toBe("now")
  })

  it("Khaled = 55.83 / Explore alternative path", () => {
    const m = readiness(khaled, ["2026-08-02"])
    expect(m.exact).toBeCloseTo(55.83, 2)
    expect(m.signal).toBe("Explore alternative path")
    expect(m.path).toBe("specialist")
  })
})

describe("§6.2 self excluded from score", () => {
  it("ignores self when computing the behavior score", () => {
    expect(behaviorScore(r(50, null, null, 100))).toBe(50)
    expect(behaviorScore(r(null, null, null, 100))).toBeNull()
  })
})

describe("§6.5 not assessed / coverage", () => {
  it("excludes not-assessed from the match and lowers coverage", () => {
    const ratings = emptyRatings()
    ratings.delegation = r(75, 75, null, null) // weight 20
    ratings.coaching = r(75, 75, null, null) // weight 20
    // remaining 60 weight not assessed
    const m = computeReadiness({ ratings, ratingDates: ["2026-08-01"] })
    expect(m.coverage).toBeCloseTo(0.4, 5)
    expect(m.exact).toBeCloseTo(100, 2) // assessed only, both met
    expect(m.signal).toBe("Insufficient evidence") // coverage < 0.5
  })

  it("coverage < 0.5 → Insufficient evidence", () => {
    const ratings = emptyRatings()
    expect(readiness(ratings).signal).toBe("Insufficient evidence")
  })
})

describe("§6.3 confidence", () => {
  const fresh = ["2026-08-01"]
  const stale = ["2020-01-01"]
  const now = new Date("2026-10-05")

  it("Not assessed when no confirmed sources", () => {
    expect(behaviorConfidence(r(null, null, null, 100), {}, now)).toBe("not_assessed")
  })

  it("Low with one source", () => {
    expect(behaviorConfidence(r(50, null, null, null), { dates: fresh }, now)).toBe("low")
  })

  it("Medium with two sources", () => {
    expect(behaviorConfidence(r(50, 50, null, null), { dates: fresh }, now)).toBe("medium")
  })

  it("High with three sources", () => {
    expect(behaviorConfidence(r(50, 50, 50, null), { dates: fresh }, now)).toBe("high")
  })

  it("High with two sources and 3+ individual ratings", () => {
    expect(
      behaviorConfidence(r(50, 50, null, null), {
        dates: fresh,
        individualCounts: { manager: 2, peer: 1 },
      }, now),
    ).toBe("high")
  })

  it("Low when evidence is older than 12 months", () => {
    expect(behaviorConfidence(r(50, 50, 50, null), { dates: stale }, now)).toBe("low")
  })
})

describe("§6.5 critical shortfall", () => {
  it("critical shortfall above 25 → Explore alternative path", () => {
    const reqs: RoleRequirement[] = [
      { id: "delegation", required: 75, weight: 100, critical: true },
    ]
    const ratings = emptyRatings()
    ratings.delegation = r(25, 25, null, null) // shortfall 50 > 25
    const m = computeReadiness({ ratings, requirements: reqs, ratingDates: ["2026-08-01"] })
    expect(m.exact).toBeCloseTo(33.33, 2)
    expect(m.signal).toBe("Explore alternative path")
  })

  it("critical shortfall of exactly 25 can still be Develop first when match ≥ 60", () => {
    const m = readiness(ahmad, ["2026-08-10"])
    expect(m.parts[0].required - m.parts[0].cur!).toBe(25)
    expect(m.signal).toBe("Develop first")
  })
})

describe("policy default requirements", () => {
  it("Team Manager weights sum to 100", () => {
    expect(TEAM_MANAGER_REQUIREMENTS.reduce((s, q) => s + q.weight, 0)).toBe(100)
  })
})

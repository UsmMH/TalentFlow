// Run: node src/app/lib/scoring.test.ts
import assert from "node:assert/strict"
import { byId, matchScore, skillLevel, options } from "./scoring.ts"

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 0.01, `${a} != ${b}`)
assert.equal(skillLevel(byId("ahmad")!.evidence.sql), 75) // 75.65 → 75
near(matchScore(byId("ahmad")!).exact, 91.67)
near(matchScore(byId("sara")!).exact, 95)
near(matchScore(byId("faisal")!).exact, 81.67)
near(matchScore(byId("lina")!).exact, 85)
assert.deepEqual(matchScore(byId("lina")!).criticalMissing, ["python"])
assert.equal(matchScore(byId("faisal")!).notAssessed[0], "comm")
const o = options()
assert.equal(o.saving, 19000)
assert.equal(o.faster, 8)
assert.equal(o.list[0].cost, 26000)
assert.equal(o.list[1].cost, 50000)
assert.equal(o.list[1].weeks, 0)
console.log("scoring ok")

import { emp, readiness } from "./behavior.ts"

// PROJECT_SPEC §6.7 worked example
const ahmad = readiness(emp("ahmad").ratings, emp("ahmad").ratingDates)
near(ahmad.exact, 79.17)
assert.equal(ahmad.path, "develop")
assert.equal(ahmad.criticalMissing[0].id, "delegation")
assert.ok(ahmad.parts[0].blind, "Ahmed overestimates delegation")
assert.equal(readiness(emp("sara").ratings, emp("sara").ratingDates).path, "now")
near(readiness(emp("sara").ratings).exact, 100)
near(readiness(emp("khaled").ratings).exact, 55.83)
assert.equal(readiness(emp("khaled").ratings).path, "specialist")
assert.equal(readiness(emp("noura").ratings).path, "insufficient")
console.log("behavior ok")

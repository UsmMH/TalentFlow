// Skills-track scoring checks (local mocks). Behavior engine: npm test at repo root (shared/engine.test.ts)
import assert from "node:assert/strict"
import { byId, matchScore, skillLevel, options } from "./scoring.ts"

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 0.01, `${a} != ${b}`)
assert.equal(skillLevel(byId("ahmad")!.evidence.sql), 75)
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

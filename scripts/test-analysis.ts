/**
 * Live smoke: /api-style analysis generation for Ahmed, Sara, Khaled (en + ar).
 * Uses shared engine + LLM (no DB writes required for validation printout;
 * still needs OPENROUTER_*). Does not call Vercel routes.
 *
 * Usage (repo root):
 *   npx --yes tsx --env-file=source/.env.local scripts/test-analysis.ts
 */
import { chatJson } from "../api/_lib/llm.ts"
import { llmSmokeOpts } from "./llmSmokeOpts.ts"
import { ANALYSIS_SCHEMA, analysisSystemPrompt, analysisUserPrompt } from "../api/_lib/prompts/analysis.ts"
import { PLAN_SCHEMA, planSystemPrompt, planUserPrompt } from "../api/_lib/prompts/plan.ts"
import {
  computeReadiness,
  type BehaviorSourceScores,
  type RatingsByBehavior,
} from "../shared/engine.ts"
import {
  snapshotHash,
  templateAnalysis,
  templatePlan,
  toSnapshotPayload,
  validateAnalysis,
  validatePlan,
  type Analysis,
} from "../shared/validateAnalysis.ts"

const r = (
  manager: number | null,
  peer: number | null,
  document: number | null,
  self: number | null,
): BehaviorSourceScores => ({ manager, peer, document, self })

const PEOPLE: { id: string; name_en: string; name_ar: string; ratings: RatingsByBehavior }[] = [
  {
    id: "ahmad",
    name_en: "Ahmed",
    name_ar: "أحمد",
    ratings: {
      delegation: r(50, 50, null, 100),
      coaching: r(50, 50, null, 75),
      accountability: r(100, 100, 100, 75),
      fairness: r(75, 75, null, 75),
      conflict: r(25, 25, null, 50),
      communication: r(75, 75, null, 75),
    },
  },
  {
    id: "sara",
    name_en: "Sara",
    name_ar: "سارة",
    ratings: {
      delegation: r(75, 75, 75, 75),
      coaching: r(75, 75, null, null),
      accountability: r(75, 75, 75, null),
      fairness: r(75, 75, null, null),
      conflict: r(50, 50, null, null),
      communication: r(75, 75, null, null),
    },
  },
  {
    id: "khaled",
    name_en: "Khaled",
    name_ar: "خالد",
    ratings: {
      delegation: r(25, 25, null, null),
      coaching: r(25, 25, null, null),
      accountability: r(75, 75, null, null),
      fairness: r(50, 50, null, null),
      conflict: r(25, 25, null, null),
      communication: r(50, 50, null, null),
    },
  },
]

async function runOne(person: (typeof PEOPLE)[0], language: "en" | "ar") {
  const snap = computeReadiness({ ratings: person.ratings, ratingDates: ["2026-08-10"] })
  const payload = toSnapshotPayload(snap)
  const hash = snapshotHash(payload)
  const employeeName = language === "ar" ? person.name_ar : person.name_en
  const roleName = language === "ar" ? "مدير فريق" : "Team Manager"

  console.log(`\n=== ${person.id} / ${language} signal=${payload.signal} match=${payload.exact} hash=${hash} ===`)

  const llm = await chatJson<Analysis>({
    messages: [
      { role: "system", content: analysisSystemPrompt(language) },
      {
        role: "user",
        content: analysisUserPrompt({ snapshot: payload, employeeName, roleName, language }),
      },
    ],
    jsonSchema: ANALYSIS_SCHEMA,
    ...llmSmokeOpts(),
    validate: (data) => {
      const v = validateAnalysis(data, payload)
      return v.ok ? { ok: true } : { ok: false, error: v.failures.map((f) => f.reason).join(",") }
    },
  })

  if (!llm.ok) {
    const t = templateAnalysis(payload, { employee: employeeName, role: roleName }, language)
    const tv = validateAnalysis(t, payload)
    console.log(
      `analysis: FAIL llm=${llm.error} model=${llm.model} latency_ms=${llm.latency_ms} → template ok=${tv.ok}`,
    )
  } else {
    const v = validateAnalysis(llm.data, payload)
    console.log(
      `analysis: OK model=${llm.model} latency_ms=${llm.latency_ms} validate=${v.ok} signal=${llm.data.readiness_view?.signal}`,
    )
  }

  const analysis = llm.ok && validateAnalysis(llm.data, payload).ok
    ? llm.data
    : templateAnalysis(payload, { employee: employeeName, role: roleName }, language)

  const planLlm = await chatJson<{ items: unknown[] }>({
    messages: [
      { role: "system", content: planSystemPrompt(language) },
      {
        role: "user",
        content: planUserPrompt({ snapshot: payload, analysis, employeeName, roleName, language }),
      },
    ],
    jsonSchema: PLAN_SCHEMA,
    ...llmSmokeOpts(),
    validate: (data) => {
      const v = validatePlan(data, payload)
      return v.ok ? { ok: true } : { ok: false, error: v.failures.map((f) => f.reason).join(",") }
    },
  })

  if (!planLlm.ok) {
    const t = templatePlan(payload, language)
    console.log(
      `plan: FAIL llm=${planLlm.error} model=${planLlm.model} latency_ms=${planLlm.latency_ms} → template items=${t.items.length}`,
    )
  } else {
    const v = validatePlan(planLlm.data, payload)
    console.log(
      `plan: OK model=${planLlm.model} latency_ms=${planLlm.latency_ms} validate=${v.ok} items=${planLlm.data.items?.length ?? 0}`,
    )
  }
}

async function main() {
  if (typeof process.stdout.setDefaultEncoding === "function") {
    process.stdout.setDefaultEncoding("utf8")
  }
  if (!process.env.OPENROUTER_API_KEY || !process.env.LLM_MODEL) {
    console.error("Set OPENROUTER_API_KEY and LLM_MODEL")
    process.exit(1)
  }
  console.log("test-analysis: Ahmed/Sara/Khaled x en/ar (UTF-8)")
  for (const p of PEOPLE) {
    for (const lang of ["en", "ar"] as const) {
      await runOne(p, lang)
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})

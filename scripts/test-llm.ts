/**
 * Live LLM smoke test for interpret (EN + AR, manager + peer conflict).
 * Usage (repo root):
 *   npm run test:llm
 * Does not write to the database. Never prints API keys.
 * Output is UTF-8 ASCII-friendly labels so it pastes cleanly on Windows terminals.
 */
import { chatJson } from "../api/_lib/llm.ts"
import { llmSmokeOpts } from "./llmSmokeOpts.ts"
import { INTERPRET_SCHEMA, interpretSystemPrompt, interpretUserPrompt } from "../api/_lib/prompts/interpret.ts"
import { validateProposals } from "../shared/validateInterpret.ts"

const BEHAVIORS = [
  {
    key: "delegation",
    name_en: "Delegation and trust",
    name_ar: "التفويض والثقة",
    rubric: {
      "25": { en: "Keeps most tasks", ar: "يبقي معظم المهام" },
      "50": { en: "Delegates but often redoes work", ar: "يفوّض لكن يعيد العمل" },
      "75": { en: "Hands over meaningful tasks", ar: "يسلّم مهام ذات قيمة" },
      "100": { en: "Builds capacity by delegating stretch work", ar: "يبني القدرات بالتفويض" },
    },
  },
  {
    key: "coaching",
    name_en: "Coaching and feedback",
    name_ar: "التوجيه والملاحظات",
    rubric: { "25": { en: "Little feedback", ar: "ملاحظات قليلة" }, "50": { en: "Occasional", ar: "أحياناً" }, "75": { en: "Specific timely", ar: "محددة وفي وقتها" }, "100": { en: "Consistent coaching", ar: "توجيه مستمر" } },
  },
  {
    key: "accountability",
    name_en: "Accountability",
    name_ar: "تحمّل المسؤولية",
    rubric: { "25": { en: "Avoids ownership", ar: "يتجنب" }, "50": { en: "Uneven", ar: "غير منتظم" }, "75": { en: "Owns results", ar: "يتحمل النتائج" }, "100": { en: "Sets the standard", ar: "يضع المعيار" } },
  },
  {
    key: "fairness",
    name_en: "Fairness",
    name_ar: "العدالة",
    rubric: { "25": { en: "Uneven", ar: "غير متساو" }, "50": { en: "Usually fair", ar: "عادة عادل" }, "75": { en: "Consistent", ar: "متسق" }, "100": { en: "Trusted", ar: "موثوق" } },
  },
  {
    key: "conflict",
    name_en: "Conflict handling",
    name_ar: "معالجة الخلافات",
    rubric: { "25": { en: "Avoids conflict", ar: "يتجنب" }, "50": { en: "Some linger", ar: "بعضها يعلق" }, "75": { en: "Addresses early", ar: "يعالج مبكراً" }, "100": { en: "Turns into clarity", ar: "يحوّل لوضوح" } },
  },
  {
    key: "communication",
    name_en: "Communication",
    name_ar: "التواصل",
    rubric: { "25": { en: "Unclear", ar: "غير واضح" }, "50": { en: "Adequate", ar: "مقبول" }, "75": { en: "Clear and listens", ar: "واضح وينصت" }, "100": { en: "Keeps team aligned", ar: "يبقي الفريق متوافقاً" } },
  },
]

const EN =
  "Ahmed delivers excellent analysis and rarely misses a deadline. When team members hand in their work, he often redoes it himself overnight instead of giving feedback. He took ownership when the dashboard failed last quarter."

const EN_PEER =
  `${EN} In a disagreement about priorities he went quiet and the issue stayed unresolved for weeks.`

const AR =
  "يقدّم أحمد تحليلاً ممتازاً ونادراً ما يفوّت موعداً. عندما يسلّم أعضاء الفريق عملهم، غالباً ما يعيد إنجازه بنفسه طوال الليل بدل إعطاء ملاحظات. تحمّل المسؤولية عندما تعطّلت لوحة المعلومات في الربع الماضي."

const AR_PEER =
  `${AR} في خلاف حول الأولويات صمت وبقيت المسألة دون حل لأسابيع.`

const RUNS = Number(process.env.LLM_SMOKE_RUNS ?? 3)

type Case = { id: string; language: "en" | "ar"; freeText: string }

const CASES: Case[] = [
  { id: "en-manager", language: "en", freeText: EN },
  { id: "en-peer-conflict", language: "en", freeText: EN_PEER },
  { id: "ar-manager", language: "ar", freeText: AR },
  { id: "ar-peer-conflict", language: "ar", freeText: AR_PEER },
]

function median(nums: number[]): number {
  if (!nums.length) return 0
  const s = [...nums].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2
}

/** Escape / flatten Arabic for paste-friendly logs (keep quotes truncated, mark lang). */
function clip(s: string, n = 80): string {
  const one = s.replace(/\s+/g, " ").trim()
  return one.length <= n ? one : `${one.slice(0, n)}...`
}

async function runOnce(c: Case) {
  const llm = await chatJson<{ proposals?: unknown[] }>({
    messages: [
      { role: "system", content: interpretSystemPrompt(c.language) },
      {
        role: "user",
        content: interpretUserPrompt({ freeText: c.freeText, behaviors: BEHAVIORS, language: c.language }),
      },
    ],
    jsonSchema: INTERPRET_SCHEMA,
    ...llmSmokeOpts(),
  })

  if (!llm.ok) {
    return {
      ok: false as const,
      model: llm.model,
      latency_ms: llm.latency_ms,
      error: llm.error,
      valid: 0,
      dropped: 0,
      levels: {} as Record<string, number>,
    }
  }

  const raw = Array.isArray(llm.data.proposals) ? llm.data.proposals : []
  const { valid, dropped } = validateProposals(
    c.freeText,
    raw as { behavior_key: string; level: number; quote: string; rationale: string }[],
  )
  const levels = Object.fromEntries(valid.map((p) => [p.behavior_key, p.level]))
  return {
    ok: true as const,
    model: llm.model,
    latency_ms: llm.latency_ms,
    valid: valid.length,
    dropped: dropped.length,
    levels,
    proposals: valid,
  }
}

async function runCase(c: Case) {
  console.log(`\n=== CASE ${c.id} (${c.language}) x${RUNS} ===`)
  console.log("expect ~ delegation 50, accountability ~75, conflict 25 when peer text used")

  let success = 0
  const latencies: number[] = []
  let validTotal = 0
  let droppedTotal = 0
  const models = new Map<string, number>()

  for (let i = 1; i <= RUNS; i++) {
    const r = await runOnce(c)
    latencies.push(r.latency_ms)
    validTotal += r.valid
    droppedTotal += r.dropped
    models.set(r.model, (models.get(r.model) ?? 0) + 1)

    if (r.ok) {
      success += 1
      console.log(
        `  run ${i}: OK model=${r.model} latency_ms=${r.latency_ms} valid=${r.valid} dropped=${r.dropped} levels=${JSON.stringify(r.levels)}`,
      )
      for (const p of r.proposals) {
        console.log(`    - ${p.behavior_key}@${p.level} quote=${clip(p.quote)}`)
      }
    } else {
      console.log(`  run ${i}: FAIL model=${r.model} latency_ms=${r.latency_ms} error=${r.error}`)
    }
  }

  const rate = `${success}/${RUNS}`
  console.log(
    `SUMMARY case=${c.id} success_rate=${rate} median_latency_ms=${Math.round(median(latencies))} valid_total=${validTotal} dropped_total=${droppedTotal} models=${JSON.stringify(Object.fromEntries(models))}`,
  )
}

async function main() {
  if (typeof process.stdout.setDefaultEncoding === "function") {
    process.stdout.setDefaultEncoding("utf8")
  }
  if (!process.env.OPENROUTER_API_KEY || !process.env.LLM_MODEL) {
    console.error("Set OPENROUTER_API_KEY and LLM_MODEL (e.g. via --env-file=source/.env.local)")
    process.exit(1)
  }
  console.log("test-llm: interpret smoke (UTF-8). accountability expectation ~75 (single example).")
  for (const c of CASES) {
    await runCase(c)
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})

/**
 * Live LLM smoke test for interpret (EN + AR seed Ahmed feedback).
 * Usage (repo root, with .env.local loaded):
 *   npx --yes tsx --env-file=.env.local scripts/test-llm.ts
 * Does not write to the database. Never prints API keys.
 */
import { chatJson } from "../api/_lib/llm.ts"
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

const AR =
  "يقدّم أحمد تحليلاً ممتازاً ونادراً ما يفوّت موعداً. عندما يسلّم أعضاء الفريق عملهم، غالباً ما يعيد إنجازه بنفسه طوال الليل بدل إعطاء ملاحظات. تحمّل المسؤولية عندما تعطّلت لوحة المعلومات في الربع الماضي."

async function runOne(label: string, language: "en" | "ar", freeText: string) {
  console.log(`\n=== ${label} ===`)
  const llm = await chatJson<{ proposals?: unknown[] }>({
    messages: [
      { role: "system", content: interpretSystemPrompt(language) },
      {
        role: "user",
        content: interpretUserPrompt({ freeText, behaviors: BEHAVIORS, language }),
      },
    ],
    jsonSchema: INTERPRET_SCHEMA,
    timeoutMs: 20_000,
  })

  if (!llm.ok) {
    console.log("LLM failed:", llm.error, `(${llm.latency_ms}ms, model=${llm.model})`)
    return
  }

  const raw = Array.isArray(llm.data.proposals) ? llm.data.proposals : []
  const { valid, dropped } = validateProposals(
    freeText,
    raw as { behavior_key: string; level: number; quote: string; rationale: string }[],
  )

  console.log(`model=${llm.model} latency_ms=${llm.latency_ms}`)
  console.log("proposals (valid):")
  for (const p of valid) {
    console.log(`  - ${p.behavior_key} @ ${p.level}: "${p.quote}" — ${p.rationale}`)
  }
  console.log("dropped:")
  for (const d of dropped) {
    console.log(`  - ${d.behavior_key} @ ${d.level}: ${d.reason}`)
  }

  const byKey = Object.fromEntries(valid.map((p) => [p.behavior_key, p.level]))
  console.log("spot-check (expected ~ delegation 50, accountability 100, conflict 25 when peer text used):", byKey)
}

async function main() {
  if (!process.env.OPENROUTER_API_KEY || !process.env.LLM_MODEL) {
    console.error("Set OPENROUTER_API_KEY and LLM_MODEL (e.g. via --env-file=.env.local)")
    process.exit(1)
  }
  await runOne("English (manager seed)", "en", EN)
  // Peer conflict signal in EN for conflict ~25
  await runOne(
    "English (peer conflict add-on)",
    "en",
    `${EN} In a disagreement about priorities he went quiet and the issue stayed unresolved for weeks.`,
  )
  await runOne("Arabic (manager seed)", "ar", AR)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})

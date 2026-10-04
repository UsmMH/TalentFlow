// Builds the content of the ExplainDrawer ("كيف حُسب؟") from the same numbers the screens use.
import { b, SKILLS, SOURCE_NAME, SOURCE_DATE, type B, type Candidate, type SkillId, type Source } from "./demo-data.ts"
import { ASSUMPTIONS as A } from "./assumptions.ts"
import { matchScore, skillAverage, skillLevel, SOURCE_WEIGHT, options } from "./scoring.ts"

export type Explain = {
  title: B
  formula: B
  inputs: { label: B; value: string | B; note?: B }[]
  result: B
  assumptions?: boolean
}
const f2 = (x: number) => (Math.round(x * 100) / 100).toString()

export function explainMatch(c: Candidate): Explain {
  const m = matchScore(c)
  return {
    title: b(`كيف حُسب تطابق ${c.name.ar}؟`, `How ${c.name.en}'s match was calculated`),
    formula: b("التطابق = مجموع [ أقل قيمة من (المستوى الحالي ÷ المطلوب، 1) × وزن المهارة ]", "Match = Σ [ min(current ÷ required, 1) × skill weight ]"),
    inputs: m.parts.map((p) => ({
      label: SKILLS[p.skill],
      value: p.cur === null ? "—" : b(`أقل قيمة(${p.cur}/${p.required}، 1) × ${p.weight} = ${f2(p.contribution)}`, `min(${p.cur}/${p.required}, 1) × ${p.weight} = ${f2(p.contribution)}`),
      note: p.cur === null ? b("غير مقيّم — قد ترتفع المطابقة بعد التقييم", "Not assessed — the match may rise after assessment") : undefined,
    })),
    result: b(`${f2(m.exact)}% ← يُعرض ${m.rounded}%`, `${f2(m.exact)}% → shown as ${m.rounded}%`),
  }
}

export function explainSkill(c: Candidate, skill: SkillId): Explain {
  const ev = c.evidence[skill]
  const entries = Object.entries(ev ?? {}) as [Source, number][]
  const wsum = entries.reduce((s, [k]) => s + SOURCE_WEIGHT[k], 0)
  const avg = skillAverage(ev)
  return {
    title: b(`كيف حُسب مستوى ${SKILLS[skill].ar}؟`, `How the ${SKILLS[skill].en} level was calculated`),
    formula: b("المتوسط المرجّح للأدلة المتاحة (اختبار 45% · مشاريع 30% · تقييم المدير 15% · شهادة 10%)، ثم تقريب للأسفل إلى 25/50/75/100", "Weighted average of available evidence (test 45% · projects 30% · manager 15% · certificate 10%), then floored to 25/50/75/100"),
    inputs: entries.map(([k, v]) => ({
      label: SOURCE_NAME[k],
      value: `${v} × ${f2(SOURCE_WEIGHT[k] / wsum)}`,
      note: b(`التاريخ ${SOURCE_DATE[k]} · الوزن الأصلي ${SOURCE_WEIGHT[k] * 100}%`, `Date ${SOURCE_DATE[k]} · original weight ${SOURCE_WEIGHT[k] * 100}%`),
    })),
    result: avg === null ? b("غير مقيّم — لا يوجد دليل بعد (وهذا ليس صفراً)", "Not assessed — no evidence yet (this is not zero)") : b(`المتوسط ${f2(avg)} ← المستوى ${skillLevel(ev)}`, `Average ${f2(avg)} → level ${skillLevel(ev)}`),
  }
}

export function explainCost(): Explain {
  const o = options()
  return {
    title: b("كيف حُسبت الأوقات والتكاليف؟", "How time and cost were calculated"),
    formula: b("الوقت والتكلفة = فجوات المهارة × الافتراضات + تكلفة تعبئة الوظيفة الشاغرة", "Time and cost = skill gaps × assumptions + cost of backfilling the vacancy"),
    inputs: [
      { label: b("الخيار أ · تدريب + مبتدئ خارجي", "Option A · training + junior hire"), value: `6,000 + 20,000 = ${o.list[0].cost.toLocaleString("en-US")}` },
      { label: b("الخيار ب · تعبئة مهندس بيانات", "Option B · Data Engineer backfill"), value: o.list[1].cost.toLocaleString("en-US") },
      { label: b("الخيار ج · توظيف خارجي", "Option C · external hire"), value: o.list[2].cost.toLocaleString("en-US") },
    ],
    result: b(`التوفير ${o.saving.toLocaleString("en-US")} ريال · أسرع بـ ${o.faster} أسابيع`, `Saves SAR ${o.saving.toLocaleString("en-US")} · ${o.faster} weeks faster`),
    assumptions: true,
  }
}

const row = (w: number, c: number) => b(`${w} أسابيع · ${c.toLocaleString("en-US")} ريال`, `${w} wk · SAR ${c.toLocaleString("en-US")}`)
export const ASSUMPTION_ROWS: { label: B; value: B }[] = [
  { label: b("كل فجوة 25 نقطة", "Each 25-point gap"), value: row(A.weeksPerGap, A.costPerGap) },
  { label: b("حد الأهمية للفجوة (وزن المهارة)", "Material gap threshold (skill weight)"), value: b(`${A.materialWeight}% أو أكثر`, `≥ ${A.materialWeight}%`) },
  { label: b("توظيف خارجي (أول)", "External hire (senior)"), value: row(A.externalSenior.weeks, A.externalSenior.cost) },
  { label: b("توظيف خارجي (مبتدئ)", "External hire (junior)"), value: row(A.externalJunior.weeks, A.externalJunior.cost) },
  { label: b("تعبئة مهندس بيانات", "Data Engineer backfill"), value: row(A.externalDataEngineer.weeks, A.externalDataEngineer.cost) },
]

export const explainAI = (): Explain => ({
  title: b("كيف بُني هذا الشرح؟", "How this explanation was built"),
  formula: b("نص مبني على الأرقام المحسوبة أعلاه فقط. لا يغيّر الدرجات ولا يتخذ القرار.", "Text built only from the numbers calculated above. It never changes scores or makes the decision."),
  inputs: [
    { label: b("تطابق سارة", "Sara's match"), value: "95%" },
    { label: b("تطابق أحمد", "Ahmad's match"), value: "92%" },
    { label: b("الفجوة", "Gap"), value: b("باور بي آي 50 → 75", "Power BI 50 → 75") },
    { label: b("تغطية وظيفة أحمد", "Cover for Ahmad's role"), value: b("خالد · 88%", "Khalid · 88%") },
  ],
  result: b("القرار النهائي للمدير", "The final decision is the manager's"),
})

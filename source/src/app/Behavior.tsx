import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useApp } from "./lib/i18n"
import { PROMOTION_COST as P } from "./lib/assumptions.ts"
import { PATH_NAME, RATER_NAME, ROLE, explainBehavior, explainReadiness, readiness, whatIf, type BId, type Rater } from "./lib/behavior.ts"
import { useBehaviorData } from "./lib/behavior-data"
import { postJson } from "./lib/api"
import { supabase, supabaseConfigured } from "./lib/supabase"
import { Btn, Card, Dialog, HowLink, KpiTile, LevelLabel, PageTitle, ScoreCell, SkillBar, Skeleton, StatusBadge, type Variant } from "./ui"

const B = "/app/behavior"
const th = "px-4 py-3 text-start text-sm font-bold text-i500"
const pathV = { now: "met", develop: "partial", specialist: "notAssessed", insufficient: "lowConf" } as const
const tone = (s: string) => (s === "critical" ? "critical" : s === "partial" ? "partial" : "met") as "met" | "partial" | "critical"
const displayLevel = (cur: number | null, level: number | null) => level ?? (cur === null ? null : Math.floor(cur / 25) * 25)

type AnalysisPayload = {
  summary: string
  strengths: { behavior_key: string; evidence: string }[]
  development_areas: { behavior_key: string; evidence: string; why_it_matters: string }[]
  blind_spots: { behavior_key: string; explanation: string }[]
  readiness_view: {
    signal: string
    evidence_for: string[]
    evidence_against: string[]
    missing_evidence: string[]
  }
  path_options: { option: string; rationale: string }[]
  caution: string
}

type PlanPayload = {
  items: {
    behavior_key: string
    type: string
    title: string
    description: string
    duration_weeks: number
    success_evidence: string
  }[]
}

function AiTag({ confirmed }: { confirmed: boolean }) {
  const { tr } = useApp()
  return confirmed
    ? <span className="rounded-full bg-mist px-2 py-1 text-[13px] font-bold text-i700">{tr("مؤكَّد", "Confirmed")}</span>
    : <span className="rounded-full border border-dashed border-i500 px-2 py-1 text-[13px] font-bold text-i500">{tr("مقترح من الذكاء الاصطناعي · بانتظار التأكيد", "AI-suggested · awaiting confirmation")}</span>
}

/* ============ Readiness list ============ */
export function BehaviorOverview() {
  const { tr, bi } = useApp()
  const nav = useNavigate()
  const data = useBehaviorData()
  const rows = data.employees.map((e) => ({ e, m: readiness(e.ratings, e.ratingDates, data.roleReqs) })).sort((a, z) => z.m.exact - a.m.exact)
  const count = (p: string) => rows.filter((r) => r.m.path === p).length
  if (data.loading) return <><PageTitle>{tr("الجاهزية السلوكية", "Behavioral readiness")}</PageTitle><Skeleton className="mb-4 h-24" /><Skeleton className="h-48" /></>
  return (
    <>
      <PageTitle sub={tr("قبل قرار الترقية: هل تدعم الأدلة سلوكياً هذا الانتقال؟", "Before the promotion decision: does the evidence support this move behaviorally?")}>{tr("الجاهزية السلوكية", "Behavioral readiness")} · {bi(ROLE)}</PageTitle>
      {data.error && <p className="mb-4 text-sm text-i500">{tr("تعذّر الاتصال بقاعدة البيانات — عرض البيانات المحلية.", "Could not reach the database — showing local fallback.")}</p>}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <KpiTile label={tr("جاهزون الآن", "Ready now")} value={`${count("now")}`} context={tr(`من ${rows.length} موظفين`, `of ${rows.length} employees`)} />
        <KpiTile label={tr("يحتاجون تطويراً أولاً", "Need development first")} value={`${count("develop")}`} context={tr("ثم إعادة التقييم", "then re-evaluate")} />
        <KpiTile label={tr("مسار أخصائي أول", "Senior specialist track")} value={`${count("specialist")}`} context={tr("ليس كل موظف يصبح مديراً", "Not everyone should become a manager")} />
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead><tr className="border-b border-i100">{[tr("الموظف", "Employee"), tr("تغطية الأدلة", "Evidence coverage"), tr("السلوك الحرج", "Critical behavior"), tr("الثقة", "Confidence"), tr("المسار المقترح", "Suggested path")].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map(({ e, m }) => (
              <tr key={e.slug} onClick={() => nav(`${B}/${e.slug}`)} className={`cursor-pointer border-b border-i100 last:border-0 hover:bg-mist ${e.slug === "ahmad" ? "flash-row" : ""}`}>
                <td className="px-4 py-4"><div className="text-base font-bold text-ink">{bi(e.name)}</div><div className="text-sm text-i500">{bi(e.role)}</div></td>
                <td className="px-4 py-4" onClick={(ev) => ev.stopPropagation()}><ScoreCell value={`${m.rounded}%`} explain={explainReadiness(e)} /></td>
                <td className="px-4 py-4">{m.criticalMissing.length ? <StatusBadge v="critical" /> : <StatusBadge v="met" />}</td>
                <td className="px-4 py-4"><StatusBadge v={m.confidence === "high" ? "highConf" : "lowConf"} /></td>
                <td className="px-4 py-4"><StatusBadge v={pathV[m.path]} label={bi(PATH_NAME[m.path])} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="mt-4 max-w-[720px] text-sm leading-[1.7] text-i500">{tr("هذه إشارات جاهزية مبنية على الأدلة وما ينقصها، وليست توقعاً لنجاح أحد. القرار النهائي للمدير والموارد البشرية.", "These are readiness signals based on evidence and what is missing, not a prediction of anyone's success. The final decision is the manager's and HR's.")}</p>
      <div className="mt-4"><Link to={`${B}/rate`} className="text-sm font-bold text-flow underline">{tr("إضافة تقييم أو تحليل ملاحظات", "Add a rating or analyze feedback")}</Link></div>
    </>
  )
}

/* ============ Behavior profile ============ */
export function BehaviorProfile() {
  const { tr, bi } = useApp()
  const { id } = useParams()
  const data = useBehaviorData()
  if (data.loading) return <Skeleton className="h-48" />
  const e = data.emp(id ?? "ahmad")
  const m = readiness(e.ratings, e.ratingDates, data.roleReqs)
  const quotes = e.evidence ?? {}
  return (
    <>
      <Link to={B} className="mb-4 inline-block text-sm font-bold text-flow underline">{tr("الجاهزية السلوكية", "Behavioral readiness")}</Link>
      <Card className="mb-6 flex flex-wrap items-center justify-between gap-6 p-6">
        <div className="min-w-0">
          <h1 className="m-0 text-[28px] font-bold text-ink">{bi(e.name)}</h1>
          <p className="m-0 mt-1 text-base text-i500">{bi(e.role)} → {bi(ROLE)}</p>
          <div className="mt-3 flex flex-wrap gap-2"><StatusBadge v={m.confidence === "high" ? "highConf" : "lowConf"} />{m.criticalMissing.length ? <StatusBadge v="critical" /> : <StatusBadge v="met" label={tr("السلوك الحرج متحقق", "Critical behavior met")} />}<StatusBadge v={pathV[m.path]} label={bi(PATH_NAME[m.path])} /></div>
        </div>
        <div><div className="text-sm text-i500">{tr("تغطية الأدلة لمتطلبات الدور", "Evidence coverage of role requirements")}</div><ScoreCell value={`${m.rounded}%`} explain={explainReadiness(e)} size={56} /></div>
      </Card>
      <h2 className="m-0 mb-3 text-xl font-bold text-ink">{tr("السلوكيات مقابل متطلبات الدور", "Behaviors vs. role requirements")}</h2>
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        {m.parts.map((p) => (
          <Card key={p.id} className="flex flex-col gap-3 p-6">
            <div className="flex items-center justify-between gap-2"><b className="text-xl text-ink">{bi(data.behaviors[p.id].name)}</b><StatusBadge v={p.status as Variant} label={p.status === "critical" ? tr("سلوك حرج ناقص", "Critical behavior missing") : undefined} /></div>
            <p className="m-0 text-sm leading-[1.6] text-i500">{bi(data.behaviors[p.id].anchor)}</p>
            <SkillBar current={p.cur} required={p.required} tone={tone(p.status)} />
            <div className="flex justify-between gap-2 text-sm text-i700"><span>{tr("الحالي", "Current")}: <LevelLabel level={displayLevel(p.cur, p.level)} /></span><span>{tr("المطلوب", "Required")}: <LevelLabel level={p.required} /></span></div>
            <div className="flex flex-wrap gap-2 text-sm text-i700">
              {(["manager", "peer", "document", "self"] as Rater[]).map((k) => <span key={k} className="rounded-full border border-i100 px-3 py-1">{bi(RATER_NAME[k])}: <b className="font-num">{e.ratings[p.id][k] ?? "—"}</b></span>)}
            </div>
            {p.blind && <div><StatusBadge v="highImpact" label={tr("نقطة عمياء: تقييمه لنفسه أعلى من تقييم الآخرين", "Blind spot: self-view is higher than others' view")} /></div>}
            {p.thin && <div><StatusBadge v="lowConf" label={tr(`أدلة قليلة (${p.sourceCount} من 3 مصادر)`, `Thin evidence (${p.sourceCount} of 3 sources)`)} /></div>}
            {(quotes[p.id] ?? []).map((q, i) => (
              <div key={i} className="rounded-[12px] bg-mist p-3 text-sm leading-[1.7] text-i900">
                <div>{bi(q.text)}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2"><span className="text-i500">{q.source === "retro" ? tr("مراجعة المشروع", "Project retrospective") : bi(RATER_NAME[q.source])}</span><AiTag confirmed={q.confirmed} /></div>
              </div>
            ))}
            <HowLink explain={explainBehavior(e, p.id)} />
          </Card>
        ))}
      </div>
      {e.slug === "ahmad" && <Link to={`${B}/ahmad/analysis`}><Btn>{tr("عرض تحليل التطوير الفردي", "View the individual development analysis")}</Btn></Link>}
    </>
  )
}

/* ============ Individual Development Analysis ============ */
export function Analysis() {
  const { tr, bi, n, lang } = useApp()
  const nav = useNavigate()
  const data = useBehaviorData()
  const e = data.emp("ahmad")
  const m = readiness(e.ratings, e.ratingDates, data.roleReqs)
  const [hypo, setHypo] = useState(false)
  const m2 = readiness(whatIf(e.ratings), e.ratingDates, data.roleReqs)
  const [cost, setCost] = useState(P.replacementHiring + P.productivityLoss + P.teamTurnover)
  const [planCost, setPlanCost] = useState(P.developmentPlan)
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisPayload | null>(null)
  const [plan, setPlan] = useState<PlanPayload | null>(null)
  const [loadingAi, setLoadingAi] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [savedNote, setSavedNote] = useState(false)
  const [aiMeta, setAiMeta] = useState<string>("")

  async function loadAi(force = false) {
    setLoadingAi(true)
    setAiError(null)
    const body = { slug: "ahmad", role_slug: "team-manager", language: lang, force }
    const [aRes, pRes] = await Promise.all([
      postJson<{
        analysis: AnalysisPayload
        source: string
        saved: boolean
        model: string
        latency_ms: number
      }>("/api/analysis", body, { timeoutMs: 25_000 }),
      postJson<{
        plan: PlanPayload
        source: string
        saved: boolean
        model: string
        latency_ms: number
      }>("/api/plan", body, { timeoutMs: 25_000 }),
    ])
    setLoadingAi(false)
    if (!aRes.ok) {
      setAiError(aRes.error)
      return
    }
    setAnalysis(aRes.data.analysis)
    setSavedNote(Boolean(aRes.data.saved) || aRes.data.source === "seed")
    setAiMeta(`${aRes.data.source}/${aRes.data.model}`)
    if (pRes.ok) {
      setPlan(pRes.data.plan)
      if (pRes.data.saved || pRes.data.source === "seed") setSavedNote(true)
    }
  }

  useEffect(() => {
    if (data.loading) return
    void loadAi(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when UI language changes
  }, [data.loading, lang])

  const strengths = analysis?.strengths?.length
    ? analysis.strengths
    : m.parts.filter((p) => p.status === "met").map((p) => ({ behavior_key: p.id, evidence: "" }))
  const gaps = analysis?.development_areas?.length
    ? analysis.development_areas
    : m.parts.filter((p) => p.status !== "met").map((p) => ({ behavior_key: p.id, evidence: "", why_it_matters: "" }))
  const blind = analysis?.blind_spots?.length
    ? analysis.blind_spots
    : m.parts.filter((p) => p.blind).map((p) => ({ behavior_key: p.id, explanation: "" }))

  if (data.loading) return <Skeleton className="h-48" />
  const input = "w-[160px] rounded-[12px] border border-i100 bg-white px-3 py-2 text-base"

  if (done)
    return (
      <Card className="pop mx-auto max-w-[640px] p-8 text-center">
        <StatusBadge v="met" label={tr("تم الاعتماد", "Approved")} />
        <p className="mt-4 text-xl font-bold leading-[1.6] text-ink">{tr("تم اعتماد المسار: التطوير أولاً ثم إعادة التقييم. أُرسلت الخطة إلى أحمد.", "Path approved: develop first, then re-evaluate. The plan was sent to Ahmad.")}</p>
        <Btn className="mt-6" onClick={() => nav("/app/me/behavior")}>{tr("عرض ملف أحمد وخطته", "View Ahmad's profile and plan")}</Btn>
      </Card>
    )
  return (
    <>
      <Link to={`${B}/ahmad`} className="mb-4 inline-block text-sm font-bold text-flow underline">{tr("ملف أحمد السلوكي", "Ahmad's behavioral profile")}</Link>
      <PageTitle sub={tr("شرح مبني على القواعد والأدلة المحسوبة. القرار للمدير.", "An explanation built from rules and calculated evidence. The decision is the manager's.")}>{tr("تحليل التطوير الفردي", "Individual development analysis")} · {bi(e.name)}</PageTitle>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Btn kind="outline" disabled={loadingAi} onClick={() => void loadAi(true)}>
          {loadingAi ? tr("جارٍ التوليد…", "Generating…") : tr("توليد / تحديث", "Generate / Refresh")}
        </Btn>
        <span className="rounded-full border border-dashed border-i500 px-3 py-1 text-[13px] font-bold text-i500">
          {tr("مولَّد بالذكاء الاصطناعي · القرار للإنسان", "AI-generated · a human decides")}
        </span>
        {savedNote && (
          <span className="rounded-full bg-mist px-3 py-1 text-[13px] font-bold text-i700">
            {tr("نتيجة محفوظة", "Saved result")}
          </span>
        )}
        {aiMeta && <span className="text-[12px] text-i500">{aiMeta}</span>}
      </div>
      {aiError && (
        <Card className="mb-4 border-crit p-4 text-base text-ink">
          {tr(
            `تعذّر التوليد (${aiError}). يمكنك إعادة المحاولة أو الاعتماد على الإشارة المحسوبة أدناه.`,
            `Could not generate (${aiError}). You can retry or rely on the calculated signal below.`,
          )}
        </Card>
      )}
      {analysis?.summary && <p className="mb-6 max-w-[820px] text-base leading-[1.7] text-i900">{analysis.summary}</p>}
      {analysis?.caution && <p className="mb-6 text-sm leading-[1.7] text-i500">{analysis.caution}</p>}

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="mb-2 text-sm font-bold text-flow">{tr("نقاط القوة", "Strengths")}</div>
          <ul className="m-0 list-disc ps-6 text-base leading-[1.8] text-i900">
            {strengths.map((s, i) => (
              <li key={`${s.behavior_key}-${i}`}>
                {data.behaviors[s.behavior_key as BId] ? bi(data.behaviors[s.behavior_key as BId].name) : s.behavior_key}
                {s.evidence ? <span className="text-i500"> — {s.evidence}</span> : null}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-6">
          <div className="mb-2 text-sm font-bold text-i500">{tr("مجالات التطوير", "Development areas")}</div>
          <ul className="m-0 list-disc ps-6 text-base leading-[1.8] text-i900">
            {gaps.map((g, i) => {
              const part = m.parts.find((p) => p.id === g.behavior_key)
              return (
                <li key={`${g.behavior_key}-${i}`}>
                  {data.behaviors[g.behavior_key as BId] ? bi(data.behaviors[g.behavior_key as BId].name) : g.behavior_key}
                  {part && <span className="font-num text-sm text-i500"> ({part.cur} → {part.required})</span>}
                  {"why_it_matters" in g && g.why_it_matters ? <span className="text-i500"> — {g.why_it_matters}</span> : null}
                </li>
              )
            })}
          </ul>
        </Card>
        <Card className="p-6">
          <div className="mb-2 text-sm font-bold text-i500">{tr("النقاط العمياء", "Blind spots")}</div>
          {blind.length === 0 && <p className="m-0 text-base text-i500">—</p>}
          {blind.map((b, i) => (
            <p key={`${b.behavior_key}-${i}`} className="m-0 text-base leading-[1.7] text-i900">
              {b.explanation
                || tr(
                  `«${bi(data.behaviors[b.behavior_key as BId].name)}»: يرى أحمد نفسه عند ${e.ratings[b.behavior_key as BId].self}، بينما يراه المدير والزملاء عند ${e.ratings[b.behavior_key as BId].manager} و${e.ratings[b.behavior_key as BId].peer}.`,
                  `"${bi(data.behaviors[b.behavior_key as BId].name)}": Ahmed sees himself at ${e.ratings[b.behavior_key as BId].self}, while his manager and peers see him at ${e.ratings[b.behavior_key as BId].manager} and ${e.ratings[b.behavior_key as BId].peer}.`,
                )}
            </p>
          ))}
        </Card>
      </div>

      <Card className="mb-6 p-6">
        <div className="mb-2 text-sm font-bold text-i500">{tr("ما الذي سيقوّي الملف؟", "What would strengthen the case?")}</div>
        <ul className="m-0 list-disc ps-6 text-base leading-[1.8] text-i900">
          {(analysis?.readiness_view?.missing_evidence?.length
            ? analysis.readiness_view.missing_evidence
            : [
                tr("تقييم من الزملاء لمعالجة الخلافات، فهو غير متوفر حالياً.", "A peer rating for conflict handling, which is missing today."),
                tr("أدلة جديدة على التفويض بعد مشروع صغير يقوده بنفسه.", "New evidence of delegation after a small project he leads himself."),
              ]
          ).map((line, i) => <li key={i}>{line}</li>)}
        </ul>
        {analysis?.readiness_view && (
          <div className="mt-4 grid gap-3 text-sm leading-[1.7] text-i700 md:grid-cols-2">
            <div>
              <div className="font-bold text-i500">{tr("أدلة مع الإشارة", "Evidence for")}</div>
              <ul className="m-0 list-disc ps-5">{analysis.readiness_view.evidence_for.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
            <div>
              <div className="font-bold text-i500">{tr("أدلة ضد الإشارة", "Evidence against")}</div>
              <ul className="m-0 list-disc ps-5">{analysis.readiness_view.evidence_against.map((x, i) => <li key={i}>{x}</li>)}</ul>
            </div>
          </div>
        )}
      </Card>

      <h2 className="m-0 mb-3 text-xl font-bold text-ink">{tr("المسار المقترح", "Suggested path")}</h2>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {(analysis?.path_options?.length
          ? analysis.path_options.map((opt, i) => {
              const recommended = opt.option === (analysis.readiness_view?.signal ?? m.signal) || i === 0
              return (
                <Card key={i} className={`flex flex-col gap-3 p-6 ${recommended ? "border-2 border-flow" : ""}`}>
                  <b className="text-xl text-ink">{opt.option}</b>
                  <span className={`self-start rounded-full px-3 py-1 text-[13px] font-bold ${recommended ? "bg-flow text-white" : "bg-i100 text-i700"}`}>
                    {recommended ? tr("التوصية", "Recommended") : tr("بديل", "Alternative")}
                  </span>
                  <p className="m-0 text-base leading-[1.7] text-i700">{opt.rationale}</p>
                </Card>
              )
            })
          : ([["now", tr("الأدلة لا تدعم ذلك بعد: التفويض حرج وهو دون المطلوب.", "The evidence doesn't support it yet: delegation is critical and below the requirement.")], ["develop", tr("الملاءمة مرتفعة وفجوتان قابلتان للإغلاق خلال ثلاثة أشهر.", "High fit and two gaps that can be closed within three months.")], ["specialist", tr("خيار مناسب إذا فضّل أحمد التخصص التقني.", "A fit if Ahmad prefers to stay technical.")]] as const).map(([k, why]) => (
              <Card key={k} className={`flex flex-col gap-3 p-6 ${k === "develop" ? "border-2 border-flow" : ""}`}>
                <b className="text-xl text-ink">{bi(PATH_NAME[k])}</b>
                <span className={`self-start rounded-full px-3 py-1 text-[13px] font-bold ${k === "develop" ? "bg-flow text-white" : "bg-i100 text-i700"}`}>{k === "develop" ? tr("التوصية", "Recommended") : tr("بديل", "Alternative")}</span>
                <p className="m-0 text-base leading-[1.7] text-i700">{why}</p>
              </Card>
            ))
        )}
      </div>

      {plan?.items?.length ? (
        <>
          <h2 className="m-0 mb-3 text-xl font-bold text-ink">{tr("خطة التطوير", "Development plan")}</h2>
          <ol className="m-0 mb-6 flex list-none flex-col gap-4 p-0">
            {plan.items.map((item, i) => (
              <li key={i}>
                <Card className="flex flex-wrap items-center gap-4 p-6">
                  <span className="grid size-8 place-items-center rounded-full bg-ink font-num font-extrabold text-white">{i + 1}</span>
                  <div className="min-w-[200px] flex-1">
                    <b className="text-base text-ink">{item.title}</b>
                    <div className="text-sm text-i500">{item.duration_weeks} {tr("أسابيع", "weeks")} · {item.type}</div>
                    <p className="m-0 mt-1 text-sm leading-[1.6] text-i700">{item.description}</p>
                    <p className="m-0 mt-1 text-sm leading-[1.6] text-i500">{tr("دليل النجاح", "Success evidence")}: {item.success_evidence}</p>
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        </>
      ) : null}

      <h2 className="m-0 mb-3 text-xl font-bold text-ink">{tr("ماذا لو؟", "What if?")}</h2>
      <Card className="mb-6 flex flex-col gap-4 p-6">
        <label className="flex items-center gap-3 text-base font-bold text-ink"><input type="checkbox" checked={hypo} onChange={(ev) => setHypo(ev.target.checked)} />{tr("ماذا لو قاد أحمد مشروعاً صغيراً أولاً؟", "What if Ahmad leads a small project first?")}</label>
        <div className="grid gap-4 md:grid-cols-2">
          <div><div className="text-sm text-i500">{tr("الآن", "Now")}</div><div className="font-num text-[40px] font-extrabold leading-none text-ink">{m.rounded}%</div><div className="mt-1 text-sm text-i700">{tr("التفويض", "Delegation")}: <LevelLabel level={m.parts[0].cur} /></div></div>
          <div className={hypo ? "" : "opacity-40"}><div className="text-sm text-i500">{tr("افتراضياً بعد المشروع", "Hypothetically after the project")}</div><div className="font-num text-[40px] font-extrabold leading-none text-ink">{hypo ? m2.rounded : "—"}%</div><div className="mt-1 text-sm text-i700">{tr("التفويض", "Delegation")}: <LevelLabel level={hypo ? m2.parts[0].cur : null} /></div></div>
        </div>
        <p className="m-0 text-sm leading-[1.7] text-i500">{tr("افتراض: يتحقق فقط إذا أظهرت تقييمات المدير والزملاء بعد المشروع مستوى 75 في التفويض. لا يُحفظ ولا يغيّر الدرجات الحالية.", "Assumption: it only holds if the manager's and peers' ratings after the project show level 75 in delegation. It isn't saved and doesn't change current scores.")}</p>
      </Card>

      <h2 className="m-0 mb-3 text-xl font-bold text-ink">{tr("تكلفة الترقية الفاشلة مقابل خطة التطوير", "Cost of a failed promotion vs. a development plan")}</h2>
      <Card className="mb-6 flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-end gap-6">
          <label className="flex flex-col gap-1 text-sm font-bold text-i500">{tr("تكلفة ترقية فاشلة (ريال)", "Failed promotion (SAR)")}<input type="number" className={input} value={cost} onChange={(ev) => setCost(+ev.target.value)} /></label>
          <label className="flex flex-col gap-1 text-sm font-bold text-i500">{tr("تكلفة خطة التطوير (ريال)", "Development plan (SAR)")}<input type="number" className={input} value={planCost} onChange={(ev) => setPlanCost(+ev.target.value)} /></label>
          <div><div className="text-sm text-i500">{tr("الفرق", "Difference")}</div><div className="font-num text-[40px] font-extrabold leading-none text-ink">{n(Math.max(cost - planCost, 0))} <span className="text-base font-bold text-i500">{tr("ريال", "SAR")}</span></div></div>
        </div>
        <p className="m-0 text-sm leading-[1.7] text-i500">{tr(`تقدير بافتراضات قابلة للتعديل: توظيف بديل ${n(P.replacementHiring)}، وتراجع إنتاجية الفريق ${n(P.productivityLoss)}، ومغادرة أعضاء من الفريق ${n(P.teamTurnover)}.`, `An estimate with editable assumptions: replacement hiring ${n(P.replacementHiring)}, team productivity loss ${n(P.productivityLoss)}, team members leaving ${n(P.teamTurnover)}.`)}</p>
      </Card>

      <Btn onClick={() => setOpen(true)}>{tr("اعتماد المسار", "Approve path")}</Btn>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <h2 className="m-0 mb-3 text-xl font-bold text-ink">{tr("تأكيد القرار", "Confirm decision")}</h2>
        <p className="m-0 mb-6 text-base leading-[1.7] text-i700">{tr("ستعتمد أنت مسار «التطوير أولاً ثم إعادة التقييم» لأحمد. هذا القرار قرارك.", "You are approving the path \"develop first, then re-evaluate\" for Ahmad. This is your decision.")}</p>
        <div className="flex gap-2"><Btn onClick={() => { setDone(true); setOpen(false) }}>{tr("اعتماد", "Approve")}</Btn><Btn kind="outline" onClick={() => setOpen(false)}>{tr("إلغاء", "Cancel")}</Btn></div>
      </Dialog>
    </>
  )
}

/* ============ Rating form + feedback reading ============ */
const SAMPLE_AR =
  "يقدّم أحمد تحليلاً ممتازاً ونادراً ما يفوّت موعداً. عندما يسلّم أعضاء الفريق عملهم، غالباً ما يعيد إنجازه بنفسه طوال الليل بدل إعطاء ملاحظات. تحمّل المسؤولية عندما تعطّلت لوحة المعلومات في الربع الماضي. في خلاف حول الأولويات صمت وبقيت المسألة دون حل لأسابيع."
const SAMPLE_EN =
  "Ahmed delivers excellent analysis and rarely misses a deadline. When team members hand in their work, he often redoes it himself overnight instead of giving feedback. He took ownership when the dashboard failed last quarter. In a disagreement about priorities he went quiet and the issue stayed unresolved for weeks."

type AiProposal = {
  id: string
  behavior_key: BId
  level: number
  quote: string
  rationale: string
  ok: boolean | null
}

export function RateForm() {
  const { tr, bi, lang } = useApp()
  const data = useBehaviorData()
  const nav = useNavigate()
  const [rater, setRater] = useState<Rater>("manager")
  const [bid, setBid] = useState<BId>("delegation")
  const [level, setLevel] = useState(50)
  const [example, setExample] = useState("")
  const [error, setError] = useState(false)
  const [saved, setSaved] = useState(false)
  const [text, setText] = useState(lang === "ar" ? SAMPLE_AR : SAMPLE_EN)
  const [phase, setPhase] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [found, setFound] = useState<AiProposal[]>([])
  const [aiError, setAiError] = useState<string | null>(null)
  const chip = (on: boolean) => `rounded-full border px-3 py-2 text-sm font-bold ${on ? "border-flow bg-flow text-white" : "border-i100 bg-white text-i700"}`

  const employee = data.emp("ahmad")

  const submitManual = async () => {
    if (!example.trim()) return setError(true)
    setError(false)
    if (supabaseConfigured && supabase && employee.uuid) {
      const { data: behs } = await supabase.from("behaviors").select("id,key")
      const behaviorId = (behs ?? []).find((x) => x.key === bid)?.id
      if (behaviorId) {
        const { data: sub, error: subErr } = await supabase
          .from("feedback_submissions")
          .insert({
            employee_id: employee.uuid,
            rater_type: rater === "peer" ? "peer" : rater,
            rater_name: "Demo rater",
            free_text: null,
            language: lang,
          })
          .select("id")
          .single()
        if (!subErr && sub) {
          await supabase.from("behavior_ratings").insert({
            submission_id: sub.id,
            employee_id: employee.uuid,
            behavior_id: behaviorId,
            level,
            example: example.trim(),
            source: "human",
            status: "confirmed",
          })
          await data.reload()
        }
      }
    }
    setSaved(true)
    setExample("")
  }

  const analyze = async () => {
    setAiError(null)
    setFound([])
    if (!text.trim()) {
      setAiError(tr("أضف نص الملاحظات أولاً.", "Add feedback text first."))
      setPhase("error")
      return
    }
    if (!supabaseConfigured || !supabase || !employee.uuid) {
      setAiError(tr(
        "يلزم اتصال قاعدة البيانات لاقتراحات الذكاء الاصطناعي. يمكنك إدخال تقييم يدوي أعلاه.",
        "Database connection is required for AI suggestions. You can still add a manual rating above.",
      ))
      setPhase("error")
      return
    }

    setPhase("loading")
    const language = /[\u0600-\u06FF]/.test(text) ? "ar" : "en"
    const { data: sub, error: subErr } = await supabase
      .from("feedback_submissions")
      .insert({
        employee_id: employee.uuid,
        rater_type: rater === "peer" ? "peer" : rater,
        rater_name: "Demo rater",
        free_text: text.trim(),
        language,
      })
      .select("id")
      .single()

    if (subErr || !sub) {
      setAiError(tr("تعذّر حفظ الملاحظات. جرّب التقييم اليدوي.", "Could not save the feedback. Try a manual rating."))
      setPhase("error")
      return
    }

    const result = await postJson<{
      saved: { id: string; behavior_key: string; level: number; quote: string; rationale: string }[]
      dropped: { reason: string }[]
    }>("/api/interpret-feedback", { submission_id: sub.id }, { timeoutMs: 20_000 })

    if (!result.ok) {
      const timedOut = result.error === "timeout"
      setAiError(
        timedOut
          ? tr(
            "استغرق التفسير أكثر من 20 ثانية. أضف تقييماً يدوياً بالمثال أعلاه، أو أعد المحاولة لاحقاً.",
            "Interpretation took longer than 20 seconds. Add a manual rating with an example above, or try again later.",
          )
          : tr(
            `تعذّر تفسير النص (${result.error}). يمكنك إدخال تقييم يدوي بالمثال أعلاه.`,
            `Could not interpret the text (${result.error}). You can add a manual rating with an example above.`,
          ),
      )
      setPhase("error")
      return
    }

    setFound(
      result.data.saved.map((p) => ({
        id: p.id,
        behavior_key: p.behavior_key as BId,
        level: p.level,
        quote: p.quote,
        rationale: p.rationale,
        ok: null,
      })),
    )
    setPhase("done")
  }

  const confirmOrReject = async (ratingId: string, action: "confirm" | "reject", index: number) => {
    const result = await postJson<{ status: string }>("/api/ratings-confirm", { rating_id: ratingId, action }, { timeoutMs: 15_000 })
    if (!result.ok) {
      setAiError(tr("تعذّر تحديث الاقتراح.", "Could not update the suggestion."))
      return
    }
    if (action === "reject") {
      setFound((rows) => rows.filter((_, j) => j !== index))
    } else {
      setFound((rows) => rows.map((x, j) => (j === index ? { ...x, ok: true } : x)))
      await data.reload()
    }
  }

  return (
    <>
      <PageTitle sub={tr("كل تقييم يحتاج مثالاً ملموساً. لا نستنتج السلوك من البريد أو المحادثات.", "Every rating needs a concrete example. We never infer behavior from emails or chats.")}>{tr("تقييم سلوكي", "Behavior rating")}</PageTitle>
      <Card className="mb-6 flex flex-col gap-4 p-6">
        <div className="text-sm font-bold text-i500">{tr("المقيِّم", "Rater")}</div>
        <div className="flex flex-wrap gap-2">{(["manager", "peer", "self"] as Rater[]).map((k) => <button key={k} className={chip(rater === k)} onClick={() => setRater(k)}>{bi(RATER_NAME[k])}</button>)}</div>
        <div className="text-sm font-bold text-i500">{tr("السلوك", "Behavior")}</div>
        <div className="flex flex-wrap gap-2">{data.roleReqs.map((q) => <button key={q.id} className={chip(bid === q.id)} onClick={() => setBid(q.id)}>{bi(data.behaviors[q.id].name)}</button>)}</div>
        <div className="text-sm font-bold text-i500">{tr("المستوى", "Level")}</div>
        <div className="flex overflow-hidden self-start rounded-[12px] border border-i100">{[25, 50, 75, 100].map((l) => <button key={l} onClick={() => setLevel(l)} className={`border-0 px-4 py-2 text-sm font-bold ${level === l ? "bg-ink text-white" : "bg-white text-i700"}`}><span className="font-num">{l}</span></button>)}</div>
        <label className="flex flex-col gap-2 text-sm font-bold text-i500">{tr("مثال ملموس (مطلوب)", "A concrete example (required)")}
          <textarea value={example} onChange={(ev) => setExample(ev.target.value)} rows={3} placeholder={tr("مثال: في اجتماع الأسبوع الماضي…", "For example: in last week's meeting…")} className="rounded-[12px] border border-i100 bg-white p-3 text-base font-normal text-i900" />
        </label>
        {error && <p role="alert" className="m-0 text-sm font-bold text-i900">{tr("أضف مثالاً ملموساً قبل الحفظ.", "Add a concrete example before saving.")}</p>}
        {saved && <StatusBadge v="met" label={tr("تمت إضافة التقييم", "Rating saved")} />}
        <Btn className="self-start" onClick={() => void submitManual()}>{tr("حفظ التقييم", "Save rating")}</Btn>
      </Card>

      <h2 className="m-0 mb-3 text-xl font-bold text-ink">{tr("قراءة الملاحظات النصية", "Reading free-text feedback")}</h2>
      <Card className="mb-6 flex flex-col gap-4 p-6">
        <textarea value={text} onChange={(ev) => setText(ev.target.value)} rows={5} className="rounded-[12px] border border-i100 bg-white p-3 text-base leading-[1.7] text-i900" aria-label={tr("ملاحظات المشروع", "Project feedback")} />
        <Btn className="self-start" disabled={phase === "loading"} onClick={() => void analyze()}>{tr("اقترح تقييمات من النص", "Suggest ratings from the text")}</Btn>
        {phase === "loading" && (
          <div className="flex flex-col gap-2" role="status">
            <b>{tr("جارٍ تفسير النص بالذكاء الاصطناعي… (قد يستغرق حتى 20 ثانية)", "Interpreting with AI… (may take up to 20 seconds)")}</b>
            <Skeleton className="h-12" /><Skeleton className="h-12" />
          </div>
        )}
        {aiError && (
          <div role="alert" className="rounded-[12px] border border-i100 bg-mist p-4 text-sm leading-[1.7] text-i900">
            <p className="m-0 mb-2">{aiError}</p>
            <p className="m-0 text-i500">{tr("البديل: استخدم نموذج التقييم اليدوي أعلاه بمثال ملموس.", "Fallback: use the manual rating form above with a concrete example.")}</p>
          </div>
        )}
        {phase === "done" && found.length === 0 && !aiError && (
          <p className="m-0 text-base text-i700">{tr("لم نجد أدلة كافية قابلة للتحقق في هذا النص.", "We found no verifiable evidence in this text.")}</p>
        )}
        {found.map((f, i) => (
          <div key={f.id} className="flex flex-col gap-2 rounded-[12px] bg-mist p-4">
            <div className="flex flex-wrap items-center gap-2">
              <b className="text-base text-ink">{bi(data.behaviors[f.behavior_key]?.name ?? { ar: f.behavior_key, en: f.behavior_key })}</b>
              <span className="text-sm text-i700">{tr("المستوى المقترح", "Suggested level")}: <LevelLabel level={f.level} /></span>
              <AiTag confirmed={f.ok === true} />
            </div>
            <p className="m-0 text-sm leading-[1.7] text-i900">«{f.quote}»</p>
            {f.rationale && <p className="m-0 text-sm leading-[1.7] text-i700">{f.rationale}</p>}
            {f.ok === null ? (
              <div className="flex flex-wrap gap-2">
                <Btn className="px-4 py-2 text-sm" onClick={() => void confirmOrReject(f.id, "confirm", i)}>{tr("تأكيد", "Confirm")}</Btn>
                <Btn kind="outline" className="px-4 py-2 text-sm" onClick={() => void confirmOrReject(f.id, "reject", i)}>{tr("رفض", "Reject")}</Btn>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-bold text-flow">{tr("أُضيف إلى الملف بعد التأكيد", "Added to the profile after confirmation")}</span>
                <button type="button" className="border-0 bg-transparent p-0 text-sm font-bold text-flow underline" onClick={() => nav("/app/behavior/ahmad")}>
                  {tr("عرض الملف", "View profile")}
                </button>
              </div>
            )}
          </div>
        ))}
        <p className="m-0 text-sm leading-[1.7] text-i500">{tr("الاقتراحات تبقى «بانتظار التأكيد» حتى يراجعها شخص. الدرجات تأتي من قواعد معلنة، ولا يخترع النظام رقماً.", "Suggestions stay \"awaiting confirmation\" until a person reviews them. Scores come from declared rules; the system never invents a number.")}</p>
      </Card>
    </>
  )
}

/* ============ Employee: my behavioral profile + plan ============ */
export function MyBehavior() {
  const { tr, bi, lang } = useApp()
  const data = useBehaviorData()
  const [planItems, setPlanItems] = useState<PlanPayload["items"] | null>(null)
  const [planSaved, setPlanSaved] = useState(false)

  useEffect(() => {
    if (data.loading) return
    void (async () => {
      const res = await postJson<{
        plan: PlanPayload
        saved: boolean
        source: string
      }>("/api/plan", { slug: "ahmad", role_slug: "team-manager", language: lang }, { timeoutMs: 25_000 })
      if (res.ok) {
        setPlanItems(res.data.plan.items)
        setPlanSaved(Boolean(res.data.saved) || res.data.source === "seed")
      }
    })()
  }, [data.loading, lang])

  if (data.loading) return <Skeleton className="h-48" />
  const e = data.emp("ahmad")
  const m = readiness(e.ratings, e.ratingDates, data.roleReqs)
  const fallbackSteps = [
    [tr("قيادة مشروع صغير مع تفويض مهام حقيقية لزملائك", "Lead a small project and delegate real tasks to colleagues"), tr("6 أسابيع", "6 weeks"), "progress"],
    [tr("جلسات إرشاد شهرية مع مدير خبير", "Monthly mentoring with an experienced manager"), tr("3 أشهر", "3 months"), "todo"],
    [tr("إعادة تقييم من المدير والزملاء", "Re-evaluation by your manager and peers"), "", "locked"],
  ] as const
  const label = { progress: tr("قيد التنفيذ", "In progress"), todo: tr("لم تبدأ", "Not started"), locked: tr("مقفلة حتى انتهاء المشروع", "Locked until the project is done") }
  const stone = { progress: "partial", todo: "notAssessed", locked: "notAssessed" } as const
  return (
    <>
      <PageTitle sub={tr("ملفك السلوكي كما تراه أنت، مع خطتك للنمو", "Your behavioral profile as you see it, with your growth plan")}>{tr("ملفي السلوكي", "My behavioral profile")}</PageTitle>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-3 p-6"><div className="text-sm text-i500">{tr("تغطية الأدلة لدور مدير فريق", "Evidence coverage for team manager")}</div><ScoreCell value={`${m.rounded}%`} explain={explainReadiness(e)} size={56} /><p className="m-0 text-base leading-[1.7] text-i700">{tr("هذه إشارة جاهزية وليست توقعاً. القرار النهائي لمديرك.", "This is a readiness signal, not a prediction. The final decision is your manager's.")}</p></Card>
        <Card className="flex flex-col gap-3 bg-ink p-6 text-white"><div className="text-sm text-mint">{tr("أولويتك الآن", "Your priority now")}</div><div className="text-xl font-bold">{bi(data.behaviors.delegation.name)}</div><div className="font-num text-[40px] font-extrabold leading-none">{m.parts[0].cur} → {m.parts[0].required}</div></Card>
      </div>
      <h2 className="m-0 mb-3 text-xl font-bold text-ink">{tr("سلوكياتي", "My behaviors")}</h2>
      <Card className="mb-8 flex flex-col gap-4 p-6">
        {m.parts.map((p) => (
          <div key={p.id} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2"><b className="text-base text-ink">{bi(data.behaviors[p.id].name)}</b><div className="flex items-center gap-2 text-sm text-i700"><LevelLabel level={displayLevel(p.cur, p.level)} />{p.blind && <StatusBadge v="highImpact" label={tr("رأي الآخرين يختلف عن رأيك", "Others see this differently")} />}</div></div>
            <SkillBar current={p.cur} required={p.required} tone={p.status === "met" ? "met" : "partial"} />
          </div>
        ))}
      </Card>
      <h2 className="m-0 mb-3 text-xl font-bold text-ink">{tr("خطة التطوير", "Development plan")}</h2>
      {planSaved && (
        <p className="mb-3 text-sm font-bold text-i500">{tr("نتيجة محفوظة", "Saved result")}</p>
      )}
      <ol className="m-0 mb-6 flex list-none flex-col gap-4 p-0">
        {planItems?.length
          ? planItems.map((item, i) => (
              <li key={i}>
                <Card className="flex flex-wrap items-center gap-4 p-6">
                  <span className="grid size-8 place-items-center rounded-full bg-ink font-num font-extrabold text-white">{i + 1}</span>
                  <div className="min-w-[200px] flex-1">
                    <b className="text-base text-ink">{item.title}</b>
                    <div className="text-sm text-i500">{item.duration_weeks} {tr("أسابيع", "weeks")}</div>
                    <p className="m-0 mt-1 text-sm text-i700">{item.description}</p>
                  </div>
                  <StatusBadge v="partial" label={tr("قيد التنفيذ", "In progress")} />
                </Card>
              </li>
            ))
          : fallbackSteps.map(([title, dur, st], i) => (
              <li key={i}><Card className={`flex flex-wrap items-center gap-4 p-6 ${st === "locked" ? "bg-mist" : ""}`}><span className="grid size-8 place-items-center rounded-full bg-ink font-num font-extrabold text-white">{i + 1}</span><div className="min-w-[200px] flex-1"><b className="text-base text-ink">{title}</b>{dur && <div className="text-sm text-i500">{dur}</div>}</div><StatusBadge v={stone[st]} label={label[st]} /></Card></li>
            ))}
      </ol>
      <Card className="border-flow bg-mist p-6 text-base font-bold leading-[1.7] text-ink">{tr("الدرجة لا ترتفع بإنهاء الخطة وحدها؛ تُحدَّث بعد تقييمات جديدة تدعمها أمثلة.", "A score doesn't rise from finishing the plan alone; it updates after new ratings backed by examples.")}</Card>
    </>
  )
}

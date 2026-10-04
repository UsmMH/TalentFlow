import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useApp } from "./lib/i18n"
import { PROMOTION_COST as P } from "./lib/assumptions.ts"
import { PATH_NAME, RATER_NAME, ROLE, explainBehavior, explainReadiness, readiness, whatIf, type BId, type Rater } from "./lib/behavior.ts"
import { useBehaviorData } from "./lib/behavior-data"
import { Btn, Card, Dialog, HowLink, KpiTile, LevelLabel, PageTitle, ScoreCell, SkillBar, Skeleton, StatusBadge, type Variant } from "./ui"

const B = "/app/behavior"
const th = "px-4 py-3 text-start text-sm font-bold text-i500"
const pathV = { now: "met", develop: "partial", specialist: "notAssessed", insufficient: "lowConf" } as const
const tone = (s: string) => (s === "critical" ? "critical" : s === "partial" ? "partial" : "met") as "met" | "partial" | "critical"
const displayLevel = (cur: number | null, level: number | null) => level ?? (cur === null ? null : Math.floor(cur / 25) * 25)

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
  const { tr, bi, n } = useApp()
  const nav = useNavigate()
  const data = useBehaviorData()
  const e = data.emp("ahmad")
  const m = readiness(e.ratings, e.ratingDates, data.roleReqs)
  const [hypo, setHypo] = useState(false)
  const m2 = readiness(whatIf(e.ratings), e.ratingDates, data.roleReqs)
  const [cost, setCost] = useState(P.replacementHiring + P.productivityLoss + P.teamTurnover)
  const [plan, setPlan] = useState(P.developmentPlan)
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const strengths = m.parts.filter((p) => p.status === "met")
  const gaps = m.parts.filter((p) => p.status !== "met")
  const blind = m.parts.filter((p) => p.blind)
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

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card className="p-6"><div className="mb-2 text-sm font-bold text-flow">{tr("نقاط القوة", "Strengths")}</div><ul className="m-0 list-disc ps-6 text-base leading-[1.8] text-i900">{strengths.map((p) => <li key={p.id}>{bi(data.behaviors[p.id].name)}</li>)}</ul></Card>
        <Card className="p-6"><div className="mb-2 text-sm font-bold text-i500">{tr("مجالات التطوير", "Development areas")}</div><ul className="m-0 list-disc ps-6 text-base leading-[1.8] text-i900">{gaps.map((p) => <li key={p.id}>{bi(data.behaviors[p.id].name)} <span className="font-num text-sm text-i500">({p.cur} → {p.required})</span></li>)}</ul></Card>
        <Card className="p-6"><div className="mb-2 text-sm font-bold text-i500">{tr("النقاط العمياء", "Blind spots")}</div>{blind.map((p) => <p key={p.id} className="m-0 text-base leading-[1.7] text-i900">{tr(`«${bi(data.behaviors[p.id].name)}»: يرى أحمد نفسه عند ${e.ratings[p.id].self}، بينما يراه المدير والزملاء عند ${e.ratings[p.id].manager} و${e.ratings[p.id].peer}.`, `"${bi(data.behaviors[p.id].name)}": Ahmed sees himself at ${e.ratings[p.id].self}, while his manager and peers see him at ${e.ratings[p.id].manager} and ${e.ratings[p.id].peer}.`)}</p>)}</Card>
      </div>

      <Card className="mb-6 p-6">
        <div className="mb-2 text-sm font-bold text-i500">{tr("ما الذي سيقوّي الملف؟", "What would strengthen the case?")}</div>
        <ul className="m-0 list-disc ps-6 text-base leading-[1.8] text-i900">
          <li>{tr("تقييم من الزملاء لمعالجة الخلافات، فهو غير متوفر حالياً.", "A peer rating for conflict handling, which is missing today.")}</li>
          <li>{tr("أدلة جديدة على التفويض بعد مشروع صغير يقوده بنفسه.", "New evidence of delegation after a small project he leads himself.")}</li>
        </ul>
      </Card>

      <h2 className="m-0 mb-3 text-xl font-bold text-ink">{tr("المسار المقترح", "Suggested path")}</h2>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {([["now", tr("الأدلة لا تدعم ذلك بعد: التفويض حرج وهو دون المطلوب.", "The evidence doesn't support it yet: delegation is critical and below the requirement.")], ["develop", tr("الملاءمة مرتفعة وفجوتان قابلتان للإغلاق خلال ثلاثة أشهر.", "High fit and two gaps that can be closed within three months.")], ["specialist", tr("خيار مناسب إذا فضّل أحمد التخصص التقني.", "A fit if Ahmad prefers to stay technical.")]] as const).map(([k, why]) => (
          <Card key={k} className={`flex flex-col gap-3 p-6 ${k === "develop" ? "border-2 border-flow" : ""}`}>
            <b className="text-xl text-ink">{bi(PATH_NAME[k])}</b>
            <span className={`self-start rounded-full px-3 py-1 text-[13px] font-bold ${k === "develop" ? "bg-flow text-white" : "bg-i100 text-i700"}`}>{k === "develop" ? tr("التوصية", "Recommended") : tr("بديل", "Alternative")}</span>
            <p className="m-0 text-base leading-[1.7] text-i700">{why}</p>
          </Card>
        ))}
      </div>

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
          <label className="flex flex-col gap-1 text-sm font-bold text-i500">{tr("تكلفة خطة التطوير (ريال)", "Development plan (SAR)")}<input type="number" className={input} value={plan} onChange={(ev) => setPlan(+ev.target.value)} /></label>
          <div><div className="text-sm text-i500">{tr("الفرق", "Difference")}</div><div className="font-num text-[40px] font-extrabold leading-none text-ink">{n(Math.max(cost - plan, 0))} <span className="text-base font-bold text-i500">{tr("ريال", "SAR")}</span></div></div>
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
const SAMPLE = "في مشروع التقارير الربعية أعاد أحمد كتابة التقرير بنفسه بدل أن يتركه لزميله. شرح لسارة طريقة عرض النتائج وتابع تحسّنها أسبوعياً. ويؤجّل الحديث عن الخلاف حتى يهدأ الجميع."
const RULES: { id: BId; test: RegExp; low: RegExp }[] = [
  { id: "delegation", test: /بنفسه|يفوّض|يفوض|يترك/, low: /بنفسه/ },
  { id: "coaching", test: /شرح|يوجّه|يوجه|يدرّب|ملاحظات/, low: /^$/ },
  { id: "conflict", test: /خلاف|توتر|نزاع/, low: /يؤجّل|يؤجل|يتجنب/ },
]

export function RateForm() {
  const { tr, bi } = useApp()
  const data = useBehaviorData()
  const [rater, setRater] = useState<Rater>("manager")
  const [bid, setBid] = useState<BId>("delegation")
  const [level, setLevel] = useState(50)
  const [example, setExample] = useState("")
  const [error, setError] = useState(false)
  const [saved, setSaved] = useState(false)
  const [text, setText] = useState(SAMPLE)
  const [phase, setPhase] = useState<"idle" | "loading" | "done">("idle")
  const [found, setFound] = useState<{ id: BId; level: number; quote: string; ok: boolean | null }[]>([])
  const chip = (on: boolean) => `rounded-full border px-3 py-2 text-sm font-bold ${on ? "border-flow bg-flow text-white" : "border-i100 bg-white text-i700"}`

  const submit = () => {
    if (!example.trim()) return setError(true)
    setError(false); setSaved(true); setExample("")
  }
  const analyze = () => {
    setPhase("loading")
    setTimeout(() => {
      const sentences = text.split(/[.؛\n]/).map((s) => s.trim()).filter(Boolean)
      const out = RULES.flatMap((r) => sentences.filter((s) => r.test.test(s)).map((s) => ({ id: r.id, level: r.low.test(s) ? 25 : 75, quote: s, ok: null as boolean | null })))
      setFound(out); setPhase("done")
    }, 1200)
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
        {saved && <StatusBadge v="met" label={tr("تمت إضافة التقييم (بيانات تجريبية)", "Rating added (sample data)")} />}
        <Btn className="self-start" onClick={submit}>{tr("حفظ التقييم", "Save rating")}</Btn>
      </Card>

      <h2 className="m-0 mb-3 text-xl font-bold text-ink">{tr("قراءة الملاحظات النصية", "Reading free-text feedback")}</h2>
      <Card className="mb-6 flex flex-col gap-4 p-6">
        <textarea value={text} onChange={(ev) => setText(ev.target.value)} rows={4} className="rounded-[12px] border border-i100 bg-white p-3 text-base leading-[1.7] text-i900" aria-label={tr("ملاحظات المشروع", "Project feedback")} />
        <Btn className="self-start" onClick={analyze}>{tr("اقترح تقييمات من النص", "Suggest ratings from the text")}</Btn>
        {phase === "loading" && <div className="flex flex-col gap-2" role="status"><b>{tr("جارٍ قراءة النص…", "Reading the text…")}</b><Skeleton className="h-12" /><Skeleton className="h-12" /></div>}
        {phase === "done" && found.length === 0 && <p className="m-0 text-base text-i700">{tr("لم نجد أدلة كافية في هذا النص.", "We found no usable evidence in this text.")}</p>}
        {found.map((f, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-[12px] bg-mist p-4">
            <div className="flex flex-wrap items-center gap-2"><b className="text-base text-ink">{bi(data.behaviors[f.id].name)}</b><span className="text-sm text-i700">{tr("المستوى المقترح", "Suggested level")}: <LevelLabel level={f.level} /></span><AiTag confirmed={f.ok === true} /></div>
            <p className="m-0 text-sm leading-[1.7] text-i900">«{f.quote}»</p>
            {f.ok === null ? (
              <div className="flex gap-2"><Btn className="px-4 py-2 text-sm" onClick={() => setFound(found.map((x, j) => (j === i ? { ...x, ok: true } : x)))}>{tr("تأكيد", "Confirm")}</Btn><Btn kind="outline" className="px-4 py-2 text-sm" onClick={() => setFound(found.filter((_, j) => j !== i))}>{tr("رفض", "Reject")}</Btn></div>
            ) : <span className="text-sm font-bold text-flow">{tr("أُضيف إلى الملف بعد التأكيد (بيانات تجريبية)", "Added to the profile after confirmation (sample data)")}</span>}
          </div>
        ))}
        <p className="m-0 text-sm leading-[1.7] text-i500">{tr("الاقتراحات تبقى «بانتظار التأكيد» حتى يراجعها شخص. الدرجات تأتي من قواعد معلنة، ولا يخترع النظام رقماً.", "Suggestions stay \"awaiting confirmation\" until a person reviews them. Scores come from declared rules; the system never invents a number.")}</p>
      </Card>
    </>
  )
}

/* ============ Employee: my behavioral profile + plan ============ */
export function MyBehavior() {
  const { tr, bi } = useApp()
  const data = useBehaviorData()
  if (data.loading) return <Skeleton className="h-48" />
  const e = data.emp("ahmad")
  const m = readiness(e.ratings, e.ratingDates, data.roleReqs)
  const steps = [
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
      <ol className="m-0 mb-6 flex list-none flex-col gap-4 p-0">
        {steps.map(([title, dur, st], i) => (
          <li key={i}><Card className={`flex flex-wrap items-center gap-4 p-6 ${st === "locked" ? "bg-mist" : ""}`}><span className="grid size-8 place-items-center rounded-full bg-ink font-num font-extrabold text-white">{i + 1}</span><div className="min-w-[200px] flex-1"><b className="text-base text-ink">{title}</b>{dur && <div className="text-sm text-i500">{dur}</div>}</div><StatusBadge v={stone[st]} label={label[st]} /></Card></li>
        ))}
      </ol>
      <Card className="border-flow bg-mist p-6 text-base font-bold leading-[1.7] text-ink">{tr("الدرجة لا ترتفع بإنهاء الخطة وحدها؛ تُحدَّث بعد تقييمات جديدة تدعمها أمثلة.", "A score doesn't rise from finishing the plan alone; it updates after new ratings backed by examples.")}</Card>
    </>
  )
}

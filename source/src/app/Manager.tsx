import { useEffect, useRef, useState, type ReactNode } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { Upload } from "lucide-react"
import { useApp } from "./lib/i18n"
import { Num } from "./lib/motion"
import { b, CANDIDATES, CHAINS, COMPANY, LONG_NAME_CANDIDATE, REQUIREMENTS, ROLES, SKILLS, SOURCE_DATE, SOURCE_NAME, type Candidate, type SkillId, type Source } from "./lib/demo-data.ts"
import { byId, matchScore, options, skillAverage, timeCost } from "./lib/scoring.ts"
import { explainAI, explainCost, explainMatch, explainSkill } from "./lib/explain.ts"
import { Btn, Card, CandidateTypeBadge, Dialog, FlowChain, HowLink, KpiTile, LevelLabel, PageTitle, ScoreCell, SkillBar, Skeleton, StatusBadge } from "./ui"

const R = "/app/roles/senior-data-analyst"
const th = "px-4 py-3 text-start text-sm font-bold text-i500"

function useTimeCostText() {
  const { tr, n } = useApp()
  return (c: Candidate) => {
    const t = timeCost(c)
    return {
      time: t.kind === "now" ? tr("جاهزة الآن", "Ready now") : t.kind === "na" ? "—" : t.kind === "hire" ? tr(`${t.weeks} أسبوعاً (توظيف)`, `${t.weeks} wk (hire)`) : tr(`${t.weeks} أسابيع`, `${t.weeks} wk`),
      cost: t.cost === null ? "—" : tr(`${n(t.cost)} ريال`, `SAR ${n(t.cost)}`),
    }
  }
}

/* ============ 1. Overview ============ */
export function Overview() {
  const { tr, bi, n, lang } = useApp()
  const o = options()
  const matched = CANDIDATES.filter((c) => c.type === "internal" && matchScore(c).exact >= 90 && !matchScore(c).criticalMissing.length).length
  const top = Math.round(Math.max(...CANDIDATES.map((c) => matchScore(c).exact)))
  const date = new Date().toLocaleDateString(lang === "ar" ? "ar-SA-u-nu-latn-ca-gregory" : "en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  const tone = { review: "partial", draft: "notAssessed", done: "met" } as const
  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <PageTitle sub={`${date} · ${bi(COMPANY)}`}>{tr("صباح الخير، نورة", "Good morning, Noura")}</PageTitle>
        <Link to="/app/roles/new"><Btn>{tr("إنشاء وظيفة", "Create role")}</Btn></Link>
      </div>
      <p className="mb-4 text-sm text-i500">{tr("شاشة المهارات · بيانات تجريبية غير مربوطة بقاعدة البيانات", "Skills screens · sample data, not connected to the database")}</p>
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <KpiTile label={tr("وظائف مفتوحة", "Open roles")} value="3" context={tr("وظيفة واحدة قيد المراجعة", "One role in review")} />
        <KpiTile label={tr("مرشحون داخليون مطابقون", "Matching internal candidates")} value={<>{matched} <span className="text-xl font-bold text-i500">{tr("من 4", "of 4")}</span></>} context={tr("تطابق 90% أو أكثر", "Match of 90% or more")} />
        <KpiTile label={tr("توفير محتمل", "Potential saving")} value={tr(`${n(o.saving)} ريال`, `SAR ${n(o.saving)}`)} context={tr("في وظيفة محلل بيانات أول", "In the Senior Data Analyst role")} />
      </div>
      <h2 className="m-0 mb-3 text-xl font-bold text-ink">{tr("الوظائف", "Roles")}</h2>
      <Card className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead><tr className="border-b border-i100"><th className={th}>{tr("الوظيفة", "Role")}</th><th className={th}>{tr("القسم", "Department")}</th><th className={th}>{tr("الحالة", "Status")}</th><th className={th}>{tr("أعلى تطابق", "Highest match")}</th><th className={th} /></tr></thead>
          <tbody>
            {ROLES.map((r) => (
              <tr key={r.id} className="border-b border-i100 last:border-0">
                <td className="px-4 py-4 text-base font-bold text-ink">{bi(r.title)}</td>
                <td className="px-4 py-4 text-sm text-i700">{bi(r.dept)}</td>
                <td className="px-4 py-4"><StatusBadge v={tone[r.statusTone]} label={bi(r.status)} /></td>
                <td className="px-4 py-4 font-num text-xl font-extrabold"><Num text={r.id === "senior-data-analyst" ? `${top}%` : r.topMatch ? `${r.topMatch}%` : "—"} /></td>
                <td className="px-4 py-4 text-end">
                  {r.statusTone === "done" ? <span className="text-sm text-i500">—</span>
                    : <Link to={r.id === "senior-data-analyst" ? R : `${R}?demo=empty`} className="text-sm font-bold text-flow underline">{tr("عرض المرشحين", "View candidates")}</Link>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  )
}

/* ============ 2. Create role ============ */
type Imp = 3 | 2 | 1
const IMP_FROM_WEIGHT = (w: number): Imp => (w >= 25 ? 3 : w >= 15 ? 2 : 1)
type Row = { skill: SkillId | string; label: string; level: number; imp: Imp; critical: boolean; accepted: boolean; suggested: boolean }

function weights(rows: Row[]) {
  const tot = rows.reduce((s, r) => s + r.imp, 0)
  const w = rows.map((r) => Math.floor((r.imp / tot) * 100))
  w[0] += 100 - w.reduce((s, x) => s + x, 0) // weights always sum to 100
  return w
}

export function CreateRole() {
  const { tr, bi } = useApp()
  const nav = useNavigate()
  const [q] = useSearchParams()
  const [title, setTitle] = useState("")
  const [phase, setPhase] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [rows, setRows] = useState<Row[]>([])
  const [manual, setManual] = useState("")
  const file = useRef<HTMLInputElement>(null)

  function upload(name: string) {
    setPhase("loading")
    setTimeout(() => {
      if (q.get("demo") === "error" || /error/i.test(name)) return setPhase("error")
      setRows(REQUIREMENTS.map((r) => ({ skill: r.skill, label: bi(SKILLS[r.skill]), level: r.required, imp: IMP_FROM_WEIGHT(r.weight), critical: r.critical, accepted: false, suggested: true })))
      if (!title) setTitle(bi(ROLES[0].title))
      setPhase("done")
    }, 1500)
  }
  const patch = (i: number, p: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...p } : r)))
  const addManual = () => {
    if (!manual.trim()) return
    setRows([...rows, { skill: manual, label: manual, level: 50, imp: 2, critical: false, accepted: true, suggested: false }])
    setManual(""); setPhase("done")
  }
  const w = rows.length ? weights(rows) : []
  const chip = (on: boolean) => `rounded-full border px-3 py-1 text-sm font-bold ${on ? "border-flow bg-flow text-white" : "border-i100 bg-white text-i700"}`
  const seg = (on: boolean) => `border-0 px-3 py-2 text-sm font-bold ${on ? "bg-ink text-white" : "bg-white text-i700"}`

  return (
    <>
      <PageTitle sub={tr("ارفع الوصف الوظيفي وراجع المهارات المقترحة", "Upload the job description and review the suggested skills")}>{tr("إنشاء وظيفة", "Create role")}</PageTitle>
      <Card className="mb-6 flex flex-col gap-4 p-6">
        <label className="flex flex-col gap-2 text-sm font-bold text-i500">
          {tr("المسمى الوظيفي", "Job title")}
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-[12px] border border-i100 px-4 py-3 text-base font-normal text-i900" />
        </label>
        <button onClick={() => file.current?.click()} className="flex flex-col items-center gap-2 rounded-[20px] border-2 border-dashed border-i300 bg-mist p-8 text-i700">
          <Upload size={24} />
          <b>{tr("رفع الوصف الوظيفي", "Upload job description")}</b>
          <span className="text-sm text-i500">{tr("ملف بصيغة بي دي إف أو وورد", "PDF or Word")}</span>
        </button>
        <input ref={file} type="file" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0].name)} />
        <button className="self-start border-0 bg-transparent p-0 text-sm font-bold text-flow underline" onClick={() => upload("jd.pdf")}>{tr("استخدم وصفاً تجريبياً", "Use a sample description")}</button>
      </Card>

      {phase === "loading" && <Card className="flex flex-col gap-3 p-6"><b role="status">{tr("جارٍ استخراج المهارات…", "Extracting skills…")}</b><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></Card>}
      {phase === "error" && <Card className="border-i300 p-6"><b className="text-ink">{tr("تعذّر استخراج المهارات — أضفها يدوياً", "Couldn't extract skills — add them manually")}</b></Card>}

      {rows.length > 0 && (
        <div className="mb-6 flex flex-col gap-3">
          {rows.map((r, i) => (
            <Card key={i} className="flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-[160px] flex-1">
                <div className="flex items-center gap-2"><b className="text-base text-ink">{r.label}</b>{r.suggested && !r.accepted && <span className="rounded-full bg-mist px-2 py-1 text-[13px] font-bold text-i700">{tr("مقترح", "Suggested")}</span>}</div>
                <span className="text-sm text-i500">{tr("الوزن", "Weight")}: <b className="font-num">{w[i]}%</b></span>
              </div>
              <div className="flex overflow-hidden rounded-[12px] border border-i100" role="group" aria-label={tr("المستوى المطلوب", "Required level")}>
                {[25, 50, 75, 100].map((l) => <button key={l} className={seg(r.level === l)} onClick={() => patch(i, { level: l })}><span className="font-num">{l}</span></button>)}
              </div>
              <div className="flex gap-1">
                {([[3, "عالية", "High"], [2, "متوسطة", "Medium"], [1, "منخفضة", "Low"]] as const).map(([v, a, e]) => <button key={v} className={chip(r.imp === v)} onClick={() => patch(i, { imp: v })}>{tr(a, e)}</button>)}
              </div>
              <label className="flex items-center gap-2 text-sm font-bold text-i700"><input type="checkbox" checked={r.critical} onChange={(e) => patch(i, { critical: e.target.checked })} />{tr("حرج", "Critical")}</label>
              {r.suggested && !r.accepted && <Btn kind="outline" className="px-4 py-2 text-sm" onClick={() => patch(i, { accepted: true })}>{tr("قبول", "Accept")}</Btn>}
            </Card>
          ))}
        </div>
      )}
      {(phase === "done" || phase === "error") && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder={tr("أضف مهارة يدوياً", "Add a skill manually")} className="rounded-[12px] border border-i100 bg-white px-4 py-3 text-base" />
          <Btn kind="outline" onClick={addManual}>{tr("إضافة", "Add")}</Btn>
        </div>
      )}
      {rows.length > 0 && <Btn onClick={() => nav(R)}>{tr("حفظ وعرض المرشحين", "Save and view candidates")}</Btn>}
    </>
  )
}

/* ============ 3. Ranking (main screen) ============ */
export function Ranking() {
  const { tr, bi, n } = useApp()
  const nav = useNavigate()
  const [q] = useSearchParams()
  const demo = q.get("demo")
  const [tab, setTab] = useState<"all" | "internal" | "external">("all")
  const [loading, setLoading] = useState(demo === "loading")
  useEffect(() => { if (loading) { const t = setTimeout(() => setLoading(false), 1500); return () => clearTimeout(t) } }, [loading])
  const tc = useTimeCostText()

  const pool = demo === "empty" ? [] : demo === "long" ? [...CANDIDATES, LONG_NAME_CANDIDATE] : CANDIDATES
  const rows = pool.map((c) => ({ c, m: matchScore(c) })).sort((a, z) => z.m.exact - a.m.exact).filter(({ c }) => tab === "all" || c.type === tab)

  const tabBtn = (k: typeof tab, label: string) => (
    <button key={k} onClick={() => setTab(k)} className={`rounded-[12px] border px-4 py-2 text-sm font-bold ${tab === k ? "border-ink bg-ink text-white" : "border-i100 bg-white text-i700"}`}>{label}</button>
  )
  return (
    <>
      <PageTitle sub={bi(b("قسم التحليلات", "Analytics"))}>{bi(ROLES[0].title)}</PageTitle>
      <div className="mb-6 flex flex-wrap gap-2">
        {REQUIREMENTS.map((r) => <span key={r.skill} className="rounded-full border border-i100 bg-white px-3 py-1 text-sm text-i700">{bi(SKILLS[r.skill])} <b className="font-num">{r.required}</b>{r.critical && <> · <b className="text-ink">{tr("حرج", "Critical")}</b></>}</span>)}
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">{tabBtn("all", tr("الكل", "All"))}{tabBtn("internal", tr("داخلي", "Internal"))}{tabBtn("external", tr("خارجي", "External"))}</div>
        <Btn onClick={() => nav(`${R}/decision`)}>{tr("مقارنة الخيارات", "Compare options")}</Btn>
      </div>
      <Card className="overflow-x-auto">
        {loading ? (
          <div className="flex flex-col gap-3 p-6">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : rows.length === 0 ? (
          <p className="m-0 p-8 text-center text-base text-i700">{tr("لا يوجد مرشحون بعد — أضف موظفين أو ارفع سيراً ذاتية", "No candidates yet — add employees or upload CVs")}</p>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-i100">
                {[tr("المرشح", "Candidate"), tr("التطابق", "Match"), tr("الشرط الحرج", "Critical requirement"), tr("الثقة", "Confidence"), tr("أثر النقل", "Transfer impact"), tr("الوقت للجاهزية", "Time to ready"), tr("التكلفة التقديرية", "Estimated cost")].map((h) => <th key={h} className={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, m }) => {
                const hl = c.id === "ahmad"
                const t = tc(c)
                const link = c.id === "long" ? "faisal" : c.id
                return (
                  <tr key={c.id} onClick={() => nav(`${R}/candidates/${link}`)} className={`${hl ? "flash-row" : ""} cursor-pointer border-b border-i100 last:border-0 hover:bg-mist ${hl ? "bg-mist" : ""}`}>
                    <td className={`max-w-[240px] px-4 py-4 ${hl ? "border-s-[3px] border-flow" : "border-s-[3px] border-transparent"}`}>
                      <div className="truncate text-base font-bold text-ink" title={bi(c.name)}>{bi(c.name)}</div>
                      <div className="mt-1 flex flex-wrap gap-1"><CandidateTypeBadge type={c.type} />{hl && <span className="rounded-full bg-flow px-3 py-1 text-[13px] font-bold text-white">{tr("موصى به", "Recommended")}</span>}</div>
                    </td>
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}><ScoreCell value={`${m.rounded}%`} explain={explainMatch(c)} /></td>
                    <td className="px-4 py-4">{m.criticalMissing.length ? <StatusBadge v="critical" /> : <StatusBadge v="met" />}</td>
                    <td className="px-4 py-4"><StatusBadge v={c.confidence === "high" ? "highConf" : "lowConf"} /></td>
                    <td className="px-4 py-4">{c.impact === "high" ? <StatusBadge v="highImpact" /> : c.impact === "low" ? <StatusBadge v="met" label={tr("أثر منخفض", "Low impact")} /> : <StatusBadge v="noImpact" />}</td>
                    <td className="px-4 py-4 text-base">{t.time}</td>
                    <td className="px-4 py-4 text-base">{t.cost}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
      <div className="mt-4"><HowLink explain={explainCost()} label={tr("كيف حُسبت هذه الأرقام؟", "How were these numbers calculated?")} /></div>
      <span className="hidden">{n(0)}</span>
    </>
  )
}

/* ============ 4. Candidate detail ============ */
export function CandidateDetail() {
  const { tr, bi, n } = useApp()
  const { id } = useParams()
  const c = byId(id ?? "") ?? CANDIDATES[0]
  const m = matchScore(c)
  const chain = c.id === "ahmad" || c.id === "sara" ? CHAINS[c.id] : null
  const tone = (s: string) => (s === "critical" ? "critical" : s === "partial" ? "partial" : "met") as "met" | "partial" | "critical"
  const sv = { met: "met", partial: "partial", critical: "critical", notAssessed: "notAssessed" } as const
  return (
    <>
      <Link to={R} className="mb-4 inline-block text-sm font-bold text-flow underline">{tr("ترتيب المرشحين", "Candidate ranking")}</Link>
      <Card className="mb-6 flex flex-wrap items-center justify-between gap-6 p-6">
        <div className="min-w-0">
          <h1 className="m-0 text-[28px] font-bold text-ink">{bi(c.name)}</h1>
          <p className="m-0 mt-1 text-base text-i500">{bi(c.currentRole)}</p>
          <div className="mt-3 flex flex-wrap gap-2"><CandidateTypeBadge type={c.type} /><StatusBadge v={c.confidence === "high" ? "highConf" : "lowConf"} />{m.criticalMissing.length ? <StatusBadge v="critical" /> : <StatusBadge v="met" label={tr("الشروط الحرجة متحققة", "Critical requirements met")} />}</div>
        </div>
        <div><div className="text-sm text-i500">{tr("التطابق", "Match")}</div><ScoreCell value={`${m.rounded}%`} explain={explainMatch(c)} size={56} /></div>
      </Card>
      <h2 className="m-0 mb-3 text-xl font-bold text-ink">{tr("المهارات", "Skills")}</h2>
      <div className="mb-8 grid gap-4 md:grid-cols-2">
        {m.parts.map((p) => {
          const ev = Object.entries(c.evidence[p.skill] ?? {}) as [Source, number][]
          return (
            <Card key={p.skill} className="flex flex-col gap-3 p-6">
              <div className="flex items-center justify-between gap-2"><b className="text-xl text-ink">{bi(SKILLS[p.skill])}</b><StatusBadge v={sv[p.status]} /></div>
              <SkillBar current={p.cur} required={p.required} tone={tone(p.status)} />
              <div className="flex justify-between gap-2 text-sm text-i700">
                <span>{tr("الحالي", "Current")}: <LevelLabel level={p.cur} /></span>
                <span>{tr("المطلوب", "Required")}: <LevelLabel level={p.required} /></span>
              </div>
              {p.cur === null && <p className="m-0 text-sm text-i700">{tr("غير مقيّم — قد ترتفع المطابقة بعد التقييم", "Not assessed — the match may rise after assessment")}</p>}
              {ev.length > 0 && (
                <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-i700">
                  {ev.map(([k, v]) => <li key={k} className="flex justify-between"><span>{bi(SOURCE_NAME[k])} · {SOURCE_DATE[k]}</span><b className="font-num">{v}</b></li>)}
                </ul>
              )}
              <HowLink explain={explainSkill(c, p.skill)} />
            </Card>
          )
        })}
      </div>
      <h2 className="m-0 mb-3 text-xl font-bold text-ink">{tr("أثر النقل", "Transfer impact")}</h2>
      {chain ? (
        <div className="flex flex-col gap-3">
          <FlowChain nodes={chain.nodes.map((x) => ({ title: bi(x.title), sub: bi(x.sub) }))} />
          <div className="flex flex-wrap items-center gap-4"><StatusBadge v={chain.impact === "high" ? "highImpact" : "met"} label={chain.impact === "low" ? tr("أثر منخفض", "Low impact") : undefined} /><Link to={`${R}/chain`} className="text-sm font-bold text-flow underline">{tr("عرض سلسلة الشواغر كاملة", "View the full vacancy chain")}</Link></div>
        </div>
      ) : <Card className="p-6"><StatusBadge v="noImpact" /></Card>}
      <span className="hidden">{n(0)}</span>
    </>
  )
}

/* ============ 5. Vacancy chain ============ */
export function Chain() {
  const { tr, bi } = useApp()
  const nav = useNavigate()
  const col = (k: "ahmad" | "sara", head: string): ReactNode => (
    <div className="flex min-w-0 flex-1 basis-[420px] flex-col gap-4">
      <h2 className="m-0 text-xl font-bold text-ink">{head}</h2>
      <FlowChain nodes={CHAINS[k].nodes.map((x) => ({ title: bi(x.title), sub: bi(x.sub) }))} />
      <div className="flex items-center gap-2 text-base"><span className="text-i500">{tr("الأثر:", "Impact:")}</span><StatusBadge v={CHAINS[k].impact === "high" ? "highImpact" : "met"} label={CHAINS[k].impact === "low" ? tr("أثر منخفض", "Low impact") : undefined} /></div>
      <p className="m-0 text-base leading-[1.7] text-i700">{bi(CHAINS[k].summary)}</p>
    </div>
  )
  return (
    <>
      <PageTitle sub={tr("ماذا يحدث في المنظمة بعد كل نقل؟", "What happens in the organization after each move?")}>{tr("سلسلة الشواغر", "Vacancy chain")}</PageTitle>
      <div className="mb-8 flex flex-wrap gap-8">{col("ahmad", tr("إذا نُقل أحمد", "If Ahmad moves"))}{col("sara", tr("إذا نُقلت سارة", "If Sara moves"))}</div>
      <Card className="mb-6 p-6 text-base leading-[1.7] text-i900">{tr("سارة أعلى تطابقاً، لكن نقلها يترك فجوة حرجة بلا بديل داخلي. أحمد يحقق الاحتياج بأقل أثر على المنظمة.", "Sara has the higher match, but moving her leaves a critical gap with no internal cover. Ahmad meets the need with the least impact on the organization.")}</Card>
      <Btn onClick={() => nav(`${R}/decision`)}>{tr("مقارنة الخيارات", "Compare options")}</Btn>
    </>
  )
}

/* ============ 6. Decision ============ */
export function Decision() {
  const { tr, bi, n, approved, setApproved } = useApp()
  const nav = useNavigate()
  const [open, setOpen] = useState(false)
  const o = options()
  const names = { A: tr("نقل أحمد مع تطوير", "Move Ahmad with development"), B: tr("نقل سارة مباشرة", "Move Sara directly"), C: tr("توظيف خارجي (فيصل)", "External hire (Faisal)") }
  const riskLabel = { low: tr("منخفضة", "Low"), medium: tr("متوسطة", "Medium"), high: tr("مرتفعة", "High") }
  const riskV = { low: "met", medium: "partial", high: "highImpact" } as const

  if (approved)
    return (
      <Card className="pop mx-auto max-w-[640px] p-8 text-center">
        <StatusBadge v="met" label={tr("تم الاعتماد", "Approved")} />
        <p className="mt-4 text-xl font-bold leading-[1.6] text-ink">{tr("تم اعتماد نقل أحمد مع خطة تطوير. أُرسلت الخطة إلى أحمد.", "Ahmad's move with a development plan was approved. The plan was sent to Ahmad.")}</p>
        <Btn className="mt-6" onClick={() => nav("/app/me/plan")}>{tr("عرض خطة أحمد", "View Ahmad's plan")}</Btn>
      </Card>
    )
  return (
    <>
      <PageTitle sub={tr("القرار للمدير. النظام يشرح ويوصي فقط.", "The manager decides. The system only explains and recommends.")}>{tr("مقارنة الخيارات", "Compare options")}</PageTitle>
      <Card className="mb-6 border-flow bg-mist p-6"><b className="text-xl leading-[1.5] text-ink">{tr(`الخيار أ أوفر بـ ${n(o.saving)} ريال وأسرع بـ ${o.faster} أسابيع من التوظيف الخارجي`, `Option A saves SAR ${n(o.saving)} and is ${o.faster} weeks faster than the external hire`)}</b></Card>
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        {o.list.map((x) => (
          <Card key={x.key} className={`flex flex-col gap-4 p-6 ${x.recommended ? "border-2 border-flow" : ""}`}>
            <div className="flex items-center justify-between gap-2"><b className="text-xl text-ink">{tr({ A: "أ", B: "ب", C: "ج" }[x.key]!, x.key)} · {names[x.key as "A"]}</b></div>
            <span className={`self-start rounded-full px-3 py-1 text-[13px] font-bold ${x.recommended ? "bg-flow text-white" : "bg-i100 text-i700"}`}>{x.recommended ? tr("التوصية", "Recommended") : tr("بديل", "Alternative")}</span>
            <div><div className="text-sm text-i500">{tr("التطابق", "Fit")}</div><div className="font-num text-[40px] font-extrabold leading-none text-ink"><Num text={`${Math.round(x.fit)}%`} /></div></div>
            <div><div className="text-sm text-i500">{tr("الوقت", "Time")}</div><div className="font-num text-[40px] font-extrabold leading-none text-ink">{x.weeks === 0 ? tr("الآن", "Now") : <><Num text={String(x.weeks)} /> <span className="text-base font-bold text-i500">{tr("أسابيع", "weeks")}</span></>}</div></div>
            <div><div className="text-sm text-i500">{tr("التكلفة الكلية", "Total cost")}</div><div className="font-num text-[40px] font-extrabold leading-none text-ink"><Num text={n(x.cost)} /> <span className="text-base font-bold text-i500">{tr("ريال", "SAR")}</span></div></div>
            <div><div className="mb-1 text-sm text-i500">{tr("المخاطر التنظيمية", "Organizational risk")}</div><StatusBadge v={riskV[x.risk]} label={riskLabel[x.risk]} /></div>
            <HowLink explain={explainCost()} />
          </Card>
        ))}
      </div>
      <Card className="mb-6 p-6">
        <div className="mb-2 flex flex-wrap items-center gap-4"><span className="rounded-full bg-mist px-3 py-1 text-[13px] font-bold text-i700">{tr("شرح مبني على الأرقام المحسوبة", "Explanation based on the calculated numbers")}</span><HowLink explain={explainAI()} /></div>
        <p className="m-0 text-base leading-[1.8] text-i900">{tr(
          "سارة أعلى مطابقة (95%)، لكن نقلها يترك وظيفة مهندس بيانات بلا بديل داخلي لمدة تقارب 14 أسبوعاً. أحمد يغطي 92% من المتطلبات وتنقصه مهارة واحدة (باور بي آي) يمكن إغلاقها خلال 4 أسابيع، ووظيفته الحالية يغطيها خالد. التوصية: نقل أحمد مع تطوير. القرار لك.",
          "Sara has the highest match (95%), but moving her leaves the Data Engineer role without an internal cover for about 14 weeks. Ahmad covers 92% of the requirements and lacks one skill (Power BI) that can be closed in 4 weeks, and his current role is covered by Khalid. Recommendation: move Ahmad with development. The decision is yours.")}</p>
      </Card>
      <Btn onClick={() => setOpen(true)}>{tr("اعتماد القرار", "Approve decision")}</Btn>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <h2 className="m-0 mb-3 text-xl font-bold text-ink">{tr("تأكيد القرار", "Confirm decision")}</h2>
        <p className="m-0 mb-6 text-base leading-[1.7] text-i700">{tr("ستعتمد أنت نقل أحمد مع خطة تطوير باور بي آي. هذا القرار قرارك، ويمكنك مراجعته لاحقاً.", "You are approving Ahmad's move with a Power BI development plan. This is your decision and can be reviewed later.")}</p>
        <div className="flex gap-2"><Btn onClick={() => { setApproved(true); setOpen(false) }}>{tr("اعتماد", "Approve")}</Btn><Btn kind="outline" onClick={() => setOpen(false)}>{tr("إلغاء", "Cancel")}</Btn></div>
      </Dialog>
    </>
  )
}

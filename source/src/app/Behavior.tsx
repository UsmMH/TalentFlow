import { useEffect, useRef, useState, type ReactNode } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ChevronDown } from "lucide-react"
import { useApp } from "./lib/i18n"
import { PATH_NAME, RATER_NAME, ROLE, explainReadiness, readiness, whatIf, type BId, type Rater } from "./lib/behavior.ts"
import { useBehaviorData } from "./lib/behavior-data"
import { describeApiError, postJson } from "./lib/api"
import { supabase, supabaseConfigured } from "./lib/supabase"
import { BackLink, Btn, Card, Dialog, KpiTile, LevelLabel, PageTitle, ScoreCell, SkillBar, Skeleton, StatusBadge, type Variant } from "./ui"

const B = "/app/behavior"
/** Must exceed /api/interpret-feedback LLM budget (cold start + OpenRouter on Vercel). */
const INTERPRET_CLIENT_TIMEOUT_MS = 50_000
const th = "px-4 py-3 text-start text-sm font-bold text-i500"
const pathV = { now: "met", develop: "partial", specialist: "notAssessed", insufficient: "lowConf" } as const
const tone = (s: string) => (s === "critical" ? "critical" : s === "partial" ? "partial" : "met") as "met" | "partial" | "critical"
const displayLevel = (cur: number | null, level: number | null) => level ?? (cur === null ? null : Math.floor(cur / 25) * 25)

/** Guard: API/DB JSON sometimes stores a string; .length on a string would pass then .map throws. */
function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? v : []
}

function ExpandSection({
  title,
  summary,
  open: initiallyOpen = false,
  children,
}: {
  title: string
  summary?: string
  open?: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(initiallyOpen)
  return (
    <div className="mb-3 overflow-hidden rounded-[16px] border border-i100 bg-white">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 border-0 bg-transparent px-5 py-4 text-start"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <div className="min-w-0">
          <div className="text-base font-bold text-ink">{title}</div>
          {summary && <p className="m-0 mt-1 text-sm leading-[1.6] text-i700">{summary}</p>}
        </div>
        <ChevronDown
          size={20}
          className={`mt-0.5 shrink-0 text-flow transition-transform duration-300 ease-out ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      <div
        className={`expand-panel grid transition-[grid-template-rows,opacity] duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="border-t border-i100 px-5 py-4">{children}</div>
        </div>
      </div>
    </div>
  )
}

function DataNotice({ error, empty, emptyHint }: { error?: string | null; empty?: boolean; emptyHint?: string }) {
  const { tr } = useApp()
  if (error) {
    return (
      <div role="alert">
        <Card className="mb-4 border-crit p-4 text-base text-ink">
          {tr(
            `تعذّر تحميل البيانات (${error}). جرّب إعادة التحميل أو استخدم البيانات المحلية إن ظهرت.`,
            `Could not load data (${error}). Try refreshing, or use local fallback if shown.`,
          )}
        </Card>
      </div>
    )
  }
  if (empty) {
    return (
      <div role="status">
        <Card className="mb-4 p-4 text-base text-i700">
          {emptyHint ?? tr("لا توجد بيانات للعرض بعد.", "Nothing to show yet.")}
        </Card>
      </div>
    )
  }
  return null
}

/** Highlight several quotes in one text, each with its own color. */
const SUGGEST_COLORS = [
  { mark: "bg-[#DDF5E9]", edge: "#2A9B6A" },
  { mark: "bg-[#FFE8CC]", edge: "#D97706" },
  { mark: "bg-[#D6EEF8]", edge: "#0284C7" },
  { mark: "bg-[#F5E0D8]", edge: "#C45C3E" },
  { mark: "bg-[#E8EDD9]", edge: "#6B7F3A" },
  { mark: "bg-[#E8E8EE]", edge: "#5A5F7A" },
] as const

function MultiHighlight({ text, quotes }: { text: string; quotes: string[] }) {
  const lower = text.toLowerCase()
  type Range = { start: number; end: number; color: number }
  const ranges: Range[] = []
  quotes.forEach((quote, color) => {
    const q = quote.trim()
    if (!q) return
    const at = lower.indexOf(q.toLowerCase())
    if (at < 0) return
    ranges.push({ start: at, end: at + q.length, color: color % SUGGEST_COLORS.length })
  })
  ranges.sort((a, b) => a.start - b.start || b.end - a.end)
  const picked: Range[] = []
  let cursor = 0
  for (const r of ranges) {
    if (r.start < cursor) continue
    picked.push(r)
    cursor = r.end
  }
  if (!picked.length) return <span>{text}</span>
  const nodes: ReactNode[] = []
  let i = 0
  for (const r of picked) {
    if (r.start > i) nodes.push(<span key={`t${i}`}>{text.slice(i, r.start)}</span>)
    nodes.push(
      <mark key={`m${r.start}`} className={`rounded-[4px] px-0.5 text-ink ${SUGGEST_COLORS[r.color]!.mark}`}>
        {text.slice(r.start, r.end)}
      </mark>,
    )
    i = r.end
  }
  if (i < text.length) nodes.push(<span key={`t${i}`}>{text.slice(i)}</span>)
  return <span>{nodes}</span>
}

function rubricLine(rubric: Record<string, { ar: string; en: string }> | undefined, level: number, lang: string) {
  const cell = rubric?.[String(level) as "25" | "50" | "75" | "100"]
  if (!cell) return null
  return lang === "ar" ? cell.ar : cell.en
}

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

/* ============ Team readiness (KPIs + who is where) ============ */
export function BehaviorOverview() {
  const { tr, bi } = useApp()
  const nav = useNavigate()
  const data = useBehaviorData()
  const rows = data.employees
    .map((e) => ({ e, m: readiness(e.ratings, e.ratingDates, data.roleReqs) }))
    .sort((a, z) => z.m.exact - a.m.exact)
  const count = (p: string) => rows.filter((r) => r.m.path === p).length
  if (data.loading) {
    return (
      <>
        <PageTitle>{tr("لمحة عن الفريق", "Team at a glance")}</PageTitle>
        <Skeleton className="mb-4 h-24" /><Skeleton className="h-48" />
      </>
    )
  }
  return (
    <>
      <PageTitle sub={tr("قبل قرار الترقية: هل تدعم الأدلة هذا الانتقال سلوكياً؟", "Before the promotion decision: does the evidence support this move behaviorally?")}>
        {tr("لمحة عن الفريق", "Team at a glance")} · {bi(ROLE)}
      </PageTitle>
      <DataNotice
        error={data.error}
        empty={rows.length === 0}
        emptyHint={tr("لا يوجد موظفون في هذا العرض بعد.", "No employees in this view yet.")}
      />
      {data.error && !data.employees.length ? null : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiTile label={tr("جاهزون الآن", "Ready now")} value={`${count("now")}`} context={tr(`من ${rows.length} موظفين`, `of ${rows.length} employees`)} />
            <KpiTile label={tr("يحتاجون تطويراً أولاً", "Need development first")} value={`${count("develop")}`} context={tr("ثم إعادة التقييم", "then re-evaluate")} />
            <KpiTile label={tr("مسار بديل", "Alternative path")} value={`${count("specialist")}`} context={tr("ليس كل موظف يصبح مديراً", "Not everyone should become a manager")} />
            <KpiTile label={tr("أدلة غير كافية", "Insufficient evidence")} value={`${count("insufficient")}`} context={tr("يحتاجون تقييماً أوسع", "need a broader assessment")} />
          </div>

          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <h2 className="m-0 text-xl font-bold text-ink">{tr("جاهزية الفريق للدور", "Team readiness for the role")}</h2>
            <Btn kind="outline" className="px-4 py-2 text-sm" onClick={() => nav(`${B}/files`)}>
              {tr("ملفات الموظفين", "Employee files")}
            </Btn>
          </div>
          <Card className="overflow-hidden">
            <ul className="m-0 flex list-none flex-col divide-y divide-i100 p-0">
              {rows.map(({ e, m }) => (
                <li key={e.slug}>
                  <button
                    type="button"
                    onClick={() => nav(`${B}/${e.slug}`)}
                    className={`flex w-full flex-wrap items-center gap-3 px-4 py-3.5 text-start hover:bg-mist ${e.slug === "ahmad" ? "flash-row bg-mist/60" : "bg-transparent"}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-base font-bold text-ink">{bi(e.name)}</div>
                      <div className="mt-0.5 truncate text-sm text-i500">{bi(e.role)}</div>
                    </div>
                    <span className="font-num text-2xl font-extrabold text-ink">{m.rounded}%</span>
                    <div className="flex flex-wrap gap-2">
                      {m.criticalMissing.length
                        ? <StatusBadge v="critical" label={tr("فجوة حرجة", "Critical gap")} />
                        : <StatusBadge v="met" label={tr("مستوفى", "Met")} />}
                      <StatusBadge v={pathV[m.path]} label={bi(PATH_NAME[m.path])} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
          <p className="mt-4 max-w-[720px] text-sm leading-[1.7] text-i500">
            {tr(
              "هذه إشارات جاهزية مبنية على الأدلة وما ينقصها، وليست توقّعاً لنجاح أحد. القرار النهائي للمدير والموارد البشرية.",
              "These are readiness signals based on evidence and what is missing, not a prediction of anyone's success. The final decision is the manager's and HR's.",
            )}
          </p>
        </>
      )}
    </>
  )
}

/* ============ Employee files (team list → profile) ============ */
export function EmployeeFiles() {
  const { tr, bi } = useApp()
  const nav = useNavigate()
  const data = useBehaviorData()
  const rows = data.employees.map((e) => ({ e, m: readiness(e.ratings, e.ratingDates, data.roleReqs) })).sort((a, z) => z.m.exact - a.m.exact)
  if (data.loading) {
    return (
      <>
        <PageTitle>{tr("ملفات الموظفين", "Employee files")}</PageTitle>
        <Skeleton className="h-48" />
      </>
    )
  }
  return (
    <>
      <PageTitle sub={tr("اختر موظفاً لعرض الملف السلوكي.", "Pick an employee to open their behavioral file.")}>
        {tr("ملفات الموظفين", "Employee files")}
      </PageTitle>
      <DataNotice
        error={data.error}
        empty={rows.length === 0}
        emptyHint={tr("لا يوجد موظفون في هذا العرض بعد.", "No employees in this view yet.")}
      />
      {data.error && !data.employees.length ? null : (
        <>
          {/* Phone: stacked cards — table is too wide */}
          <div className="flex flex-col gap-3 lg:hidden">
            {rows.map(({ e, m }) => (
              <button
                key={e.slug}
                type="button"
                onClick={() => nav(`${B}/${e.slug}`)}
                className={`rounded-[16px] border border-i100 bg-white p-4 text-start shadow-[0_1px_2px_rgba(7,59,46,0.06)] ${e.slug === "ahmad" ? "flash-row" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-bold text-ink">{bi(e.name)}</div>
                    <div className="mt-0.5 text-sm text-i500">{bi(e.role)}</div>
                  </div>
                  <div className="shrink-0 text-end">
                    <ScoreCell value={`${m.rounded}%`} />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.criticalMissing.length
                    ? <StatusBadge v="critical" label={tr("فجوة حرجة", "Critical gap")} />
                    : <StatusBadge v="met" label={tr("مستوفى", "Met")} />}
                  <StatusBadge v={m.confidence === "high" ? "highConf" : "lowConf"} />
                  <StatusBadge v={pathV[m.path]} label={bi(PATH_NAME[m.path])} />
                </div>
              </button>
            ))}
          </div>

          <Card className="hidden overflow-x-auto lg:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-i100">
                  {[tr("الموظف", "Employee"), tr("نسبة المطابقة", "Match %"), tr("السلوك الحرج", "Critical behavior"), tr("الثقة", "Confidence"), tr("المسار المقترح", "Suggested path")].map((h) => (
                    <th key={h} className={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ e, m }) => (
                  <tr key={e.slug} onClick={() => nav(`${B}/${e.slug}`)} className={`cursor-pointer border-b border-i100 last:border-0 hover:bg-mist ${e.slug === "ahmad" ? "flash-row" : ""}`}>
                    <td className="px-4 py-4"><div className="text-base font-bold text-ink">{bi(e.name)}</div><div className="text-sm text-i500">{bi(e.role)}</div></td>
                    <td className="px-4 py-4"><ScoreCell value={`${m.rounded}%`} /></td>
                    <td className="px-4 py-4">{m.criticalMissing.length ? <StatusBadge v="critical" label={tr("فجوة حرجة", "Critical gap")} /> : <StatusBadge v="met" label={tr("مستوفى", "Met")} />}</td>
                    <td className="px-4 py-4"><StatusBadge v={m.confidence === "high" ? "highConf" : "lowConf"} /></td>
                    <td className="px-4 py-4"><StatusBadge v={pathV[m.path]} label={bi(PATH_NAME[m.path])} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </>
  )
}

/* ============ Behavior profile ============ */
export function BehaviorProfile() {
  const { tr, bi } = useApp()
  const { id } = useParams()
  const data = useBehaviorData()
  if (data.loading) return <><PageTitle>{tr("ملف الموظف", "Employee profile")}</PageTitle><Skeleton className="h-48" /></>
  const e = data.emp(id ?? "ahmad")
  const back = <BackLink to={`${B}/files`} label={tr("العودة إلى ملفات الموظفين", "Back to employee files")} />
  if (!e) {
    return (
      <>
        {back}
        <DataNotice empty emptyHint={tr("لم يُعثر على هذا الموظف.", "Employee not found.")} />
      </>
    )
  }
  const m = readiness(e.ratings, e.ratingDates, data.roleReqs)
  const quotes = e.evidence ?? {}
  const blinds = m.parts.filter((p) => p.blind)
  return (
    <>
      {back}
      <DataNotice error={data.error} />

      {/* Scorecard first */}
      <Card className="mb-6 flex flex-col gap-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="m-0 text-[28px] font-bold text-ink">{bi(e.name)}</h1>
            <p className="m-0 mt-1 text-base text-i500">{bi(e.role)} → {bi(ROLE)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge v={pathV[m.path]} label={bi(PATH_NAME[m.path])} />
              <StatusBadge v={m.confidence === "high" ? "highConf" : "lowConf"} />
              {m.criticalMissing.length ? <StatusBadge v="critical" label={tr("فجوة حرجة", "Critical gap")} /> : <StatusBadge v="met" label={tr("السلوك الحرج مستوفى", "Critical behavior met")} />}
            </div>
          </div>
          <div>
            <div className="text-sm text-i500">{tr("نسبة المطابقة", "Match %")}</div>
            <ScoreCell value={`${m.rounded}%`} explain={explainReadiness(e)} size={56} />
          </div>
        </div>

        <div>
          <h2 className="m-0 mb-3 text-xl font-bold text-ink">{tr("السلوكيات مقارنة بالمتطلبات", "Behaviors vs. requirements")}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {m.parts.map((p) => (
              <div key={p.id} className="flex flex-col gap-2 rounded-[12px] bg-mist p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <b className="text-base text-ink">{bi(data.behaviors[p.id].name)}</b>
                  <StatusBadge v={p.status as Variant} label={p.status === "critical" ? tr("فجوة حرجة", "Critical gap") : undefined} />
                </div>
                <SkillBar current={p.cur} required={p.required} tone={tone(p.status)} />
                <div className="flex flex-wrap justify-between gap-2 text-sm text-i700">
                  <span>{tr("الحالي", "Current")}: <LevelLabel level={displayLevel(p.cur, p.level)} /></span>
                  <span>{tr("المطلوب", "Required")}: <LevelLabel level={p.required} /></span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge v={p.thin || m.confidence !== "high" ? "lowConf" : "highConf"} label={p.thin ? tr(`أدلة قليلة (${p.sourceCount})`, `Thin evidence (${p.sourceCount})`) : undefined} />
                  {p.blind && <StatusBadge v="highImpact" label={tr("نقطة عمياء", "Blind spot")} />}
                </div>
              </div>
            ))}
          </div>
        </div>

        {blinds.length > 0 && (
          <div className="rounded-[12px] border border-i100 bg-white p-4" role="status">
            <b className="text-base text-ink">{tr("نقطة عمياء", "Blind spot")}</b>
            <p className="m-0 mt-2 text-sm leading-[1.7] text-i700">
              {tr(
                `تقييم الذات أعلى من الآخرين في: ${blinds.map((p) => bi(data.behaviors[p.id].name)).join("، ")}.`,
                `Self-view is higher than others on: ${blinds.map((p) => bi(data.behaviors[p.id].name)).join(", ")}.`,
              )}
            </p>
          </div>
        )}

        <Link to={`${B}/${e.slug}/analysis`}>
          <Btn>{tr("تحليل التطوير والخطة", "Development analysis & plan")}</Btn>
        </Link>
      </Card>

      <ExpandSection
        title={tr("الأدلة والحساب", "Evidence & calculation")}
        summary={tr("مصادر التقييم والاقتباسات لكل سلوك.", "Rating sources and quotes per behavior.")}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {m.parts.map((p) => (
            <div key={p.id} className="flex flex-col gap-3 rounded-[12px] border border-i100 bg-mist p-4">
              <div className="flex items-center justify-between gap-2">
                <b className="text-base text-ink">{bi(data.behaviors[p.id].name)}</b>
                <StatusBadge v={p.status as Variant} />
              </div>
              <p className="m-0 text-sm leading-[1.6] text-i500">{bi(data.behaviors[p.id].anchor)}</p>
              <div className="flex flex-wrap gap-2 text-sm text-i700">
                {(["manager", "peer", "document", "self"] as Rater[]).map((k) => (
                  <span key={k} className="rounded-full border border-i100 bg-white px-3 py-1">{bi(RATER_NAME[k])}: <b className="font-num">{e.ratings[p.id][k] ?? "—"}</b></span>
                ))}
              </div>
              {(quotes[p.id] ?? []).length === 0 && (
                <p className="m-0 text-sm text-i500">{tr("لا توجد اقتباسات أدلة لهذا السلوك.", "No evidence quotes for this behavior.")}</p>
              )}
              {(quotes[p.id] ?? []).map((q, i) => (
                <div key={i} className="rounded-[12px] bg-white p-3 text-sm leading-[1.7] text-i900">
                  <div>{bi(q.text)}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="text-i500">{q.source === "retro" ? tr("مراجعة المشروع", "Project retrospective") : bi(RATER_NAME[q.source])}</span>
                    <AiTag confirmed={q.confirmed} />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </ExpandSection>
    </>
  )
}

/* ============ Individual Development Analysis ============ */
export function Analysis() {
  // Arabic-first demo: load stored on enter (no LLM); Generate forces a new run and saves.
  const { tr, bi, lang, approved, setApproved } = useApp()
  const nav = useNavigate()
  const { id: routeId } = useParams()
  const data = useBehaviorData()
  const slug = routeId && data.employees.some((x) => x.slug === routeId) ? routeId : "ahmad"
  const e = data.emp(slug)
  const m = readiness(e.ratings, e.ratingDates, data.roleReqs)
  const m2 = readiness(whatIf(e.ratings), e.ratingDates, data.roleReqs)
  const [open, setOpen] = useState(false)
  const [analysis, setAnalysis] = useState<AnalysisPayload | null>(null)
  const [plan, setPlan] = useState<PlanPayload | null>(null)
  const [loadingAi, setLoadingAi] = useState(false)
  const [loadingStored, setLoadingStored] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [savedNote, setSavedNote] = useState(false)

  const pickEmployee = (next: string) => {
    if (next === slug) return
    setAnalysis(null)
    setPlan(null)
    setAiError(null)
    setSavedNote(false)
    setApproved(false)
    nav(`${B}/${next}/analysis`)
  }

  async function loadAi(force: boolean, forSlug = slug) {
    if (force) {
      setLoadingAi(true)
      setAiError(null)
    } else {
      setLoadingStored(true)
    }
    try {
      const body = { slug: forSlug, role_slug: "team-manager", language: lang, force }
      const timeoutMs = force ? 25_000 : 12_000
      const [aRes, pRes] = await Promise.all([
        postJson<{
          analysis: AnalysisPayload | null
          source: string
          saved: boolean
          model: string
          latency_ms: number
        }>("/api/analysis", body, { timeoutMs }),
        postJson<{
          plan: PlanPayload | null
          source: string
          saved: boolean
          model: string
          latency_ms: number
        }>("/api/plan", body, { timeoutMs }),
      ])
      if (!aRes.ok) {
        if (force) setAiError(describeApiError(aRes.error, tr))
        return
      }
      if (aRes.data.analysis && typeof aRes.data.analysis === "object") {
        setAnalysis(aRes.data.analysis)
        const stored = aRes.data.source === "cache" || aRes.data.source === "seed" || aRes.data.saved
        setSavedNote(stored)
      } else {
        setAnalysis(null)
        setSavedNote(false)
      }
      if (pRes.ok && pRes.data.plan?.items) {
        setPlan(pRes.data.plan)
        if (pRes.data.saved || pRes.data.source === "seed" || pRes.data.source === "cache") setSavedNote(true)
      } else {
        setPlan(null)
      }
    } catch (err) {
      if (force) setAiError(describeApiError(err instanceof Error ? err.message : "Network error", tr))
    } finally {
      setLoadingAi(false)
      setLoadingStored(false)
    }
  }

  useEffect(() => {
    if (data.loading) return
    setAnalysis(null)
    setPlan(null)
    setAiError(null)
    setSavedNote(false)
    void loadAi(false, slug)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload stored when employee or language changes; no LLM
  }, [data.loading, lang, slug])

  const aiStrengths = asArray<AnalysisPayload["strengths"][number]>(analysis?.strengths)
  const aiGaps = asArray<AnalysisPayload["development_areas"][number]>(analysis?.development_areas)
  const aiBlind = asArray<AnalysisPayload["blind_spots"][number]>(analysis?.blind_spots)
  const pathOptions = asArray<NonNullable<AnalysisPayload["path_options"]>[number]>(analysis?.path_options)
  const missingEvidence = asArray<string>(analysis?.readiness_view?.missing_evidence)
  const evidenceFor = asArray<string>(analysis?.readiness_view?.evidence_for)
  const evidenceAgainst = asArray<string>(analysis?.readiness_view?.evidence_against)
  const planItems = asArray<PlanPayload["items"][number]>(plan?.items)
  const delegPart = m.parts.find((p) => p.id === "delegation") ?? m.parts[0]
  const delegPart2 = m2.parts.find((p) => p.id === "delegation") ?? m2.parts[0]
  const hasAi = Boolean(analysis)
  const name = bi(e.name)

  if (data.loading) return <><PageTitle>{tr("تحليل التطوير الفردي", "Individual development analysis")}</PageTitle><Skeleton className="h-48" /></>

  if (approved)
    return (
      <Card className="pop mx-auto max-w-[640px] p-8 text-center">
        <StatusBadge v="met" label={tr("تم الاعتماد", "Approved")} />
        <p className="mt-4 text-xl font-bold leading-[1.6] text-ink">
          {tr(
            `تم اعتماد المسار: التطوير أولاً ثم إعادة التقييم. أُرسلت الخطة إلى ${name}.`,
            `Path approved: develop first, then re-evaluate. The plan was sent to ${name}.`,
          )}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Btn onClick={() => nav(slug === "ahmad" ? "/app/me/behavior" : `${B}/${slug}`)}>
            {slug === "ahmad"
              ? tr("عرض ملف أحمد وخطته", "View Ahmad's profile and plan")
              : tr("عرض الملف المحدَّث", "View updated profile")}
          </Btn>
          <Btn kind="outline" onClick={() => setApproved(false)}>{tr("عرض التحليل مرة أخرى", "View analysis again")}</Btn>
        </div>
      </Card>
    )
  return (
    <>
      <BackLink to={`${B}/${slug}`} label={tr("العودة إلى الملف", "Back to profile")} />
      <PageTitle sub={tr("شرح مبني على القواعد والأدلة المحسوبة. القرار للمدير.", "An explanation built from rules and calculated evidence. The decision is the manager's.")}>
        {tr("تحليل التطوير والخطة", "Development analysis and plan")}
      </PageTitle>
      <div className="mb-6">
        <EmpPicker
          employees={data.employees}
          value={slug}
          onChange={pickEmployee}
          disabled={loadingAi || loadingStored}
        />
      </div>
      <DataNotice error={data.error} />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Btn disabled={loadingAi || loadingStored} onClick={() => void loadAi(true)}>
          {loadingAi
            ? tr("جارٍ التوليد…", "Generating…")
            : hasAi
              ? tr("تحديث التحليل", "Update analysis")
              : tr("توليد التحليل والخطة", "Generate analysis & plan")}
        </Btn>
        {hasAi && (
          <Btn kind="outline" disabled={loadingAi || loadingStored} onClick={() => setOpen(true)}>
            {tr("اعتماد المسار", "Approve path")}
          </Btn>
        )}
      </div>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <h2 className="m-0 mb-3 text-xl font-bold text-ink">{tr("تأكيد القرار", "Confirm decision")}</h2>
        <p className="m-0 mb-6 text-base leading-[1.7] text-i700">
          {tr(
            `ستعتمد أنت مسار «التطوير أولاً ثم إعادة التقييم» لـ ${name}. هذا القرار قرارك.`,
            `You are approving the path "develop first, then re-evaluate" for ${name}. This is your decision.`,
          )}
        </p>
        <div className="flex gap-2"><Btn onClick={() => { setApproved(true); setOpen(false) }}>{tr("اعتماد", "Approve")}</Btn><Btn kind="outline" onClick={() => setOpen(false)}>{tr("إلغاء", "Cancel")}</Btn></div>
      </Dialog>

      {(loadingAi || loadingStored) && !hasAi && (
        <div className="mb-6 flex flex-col gap-2" role="status">
          <Skeleton className="h-24" /><Skeleton className="h-32" />
        </div>
      )}
      {aiError && (
        <Card className="mb-4 border-crit p-4 text-base leading-[1.7] text-ink" role="alert">
          <p className="m-0 mb-2 font-bold">{tr("تعذّر التوليد", "Could not generate")}</p>
          <p className="m-0">{aiError}</p>
        </Card>
      )}
      {!loadingAi && !loadingStored && !hasAi && !aiError && (
        <Card className="mb-6 border-dashed p-8 text-center">
          <p className="m-0 text-lg font-bold text-ink">{tr("لم يُنشأ تحليل بعد", "No analysis yet")}</p>
          <p className="m-0 mt-2 text-base leading-[1.7] text-i700">
            {tr("اضغط «توليد التحليل والخطة» لبناء الشرح والخطة. بعد التوليد تُحفظ النتيجة وتعود عند العودة لهذه الصفحة.", "Press “Generate analysis & plan” to build the explanation and plan. After generating, the result is saved and returns when you come back to this page.")}
          </p>
        </Card>
      )}

      {hasAi && analysis && (
        <>
          {typeof analysis.summary === "string" && analysis.summary && (
            <Card className="mb-4 p-6">
              <p className="m-0 max-w-[820px] text-base leading-[1.7] text-i900">{analysis.summary}</p>
              {analysis.caution && <p className="m-0 mt-3 text-sm leading-[1.7] text-i500">{analysis.caution}</p>}
            </Card>
          )}

          <ExpandSection
            open
            title={tr("نقاط القوة ومجالات التطوير", "Strengths & development areas")}
            summary={tr(
              `${aiStrengths.length} قوة · ${aiGaps.length} مجال تطوير · ${aiBlind.length} نقطة عمياء`,
              `${aiStrengths.length} strengths · ${aiGaps.length} development areas · ${aiBlind.length} blind spots`,
            )}
          >
            <div className="grid gap-5 md:grid-cols-3">
              <div>
                <div className="mb-2 text-sm font-bold text-flow">{tr("نقاط القوة", "Strengths")}</div>
                {aiStrengths.length === 0 ? <p className="m-0 text-base text-i500">—</p> : (
                  <ul className="m-0 list-disc ps-5 text-base leading-[1.8] text-i900">
                    {aiStrengths.map((s, i) => (
                      <li key={`${s.behavior_key}-${i}`}>
                        {data.behaviors[s.behavior_key as BId] ? bi(data.behaviors[s.behavior_key as BId].name) : s.behavior_key}
                        {s.evidence ? <span className="text-i500"> — {s.evidence}</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="mb-2 text-sm font-bold text-i500">{tr("مجالات التطوير", "Development areas")}</div>
                {aiGaps.length === 0 ? <p className="m-0 text-base text-i500">—</p> : (
                  <ul className="m-0 list-disc ps-5 text-base leading-[1.8] text-i900">
                    {aiGaps.map((g, i) => (
                      <li key={`${g.behavior_key}-${i}`}>
                        {data.behaviors[g.behavior_key as BId] ? bi(data.behaviors[g.behavior_key as BId].name) : g.behavior_key}
                        {"why_it_matters" in g && g.why_it_matters ? <span className="text-i500"> — {g.why_it_matters}</span> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <div className="mb-2 text-sm font-bold text-i500">{tr("النقاط العمياء", "Blind spots")}</div>
                {aiBlind.length === 0 ? <p className="m-0 text-base text-i500">—</p> : aiBlind.map((b, i) => (
                  <p key={`${b.behavior_key}-${i}`} className="m-0 mb-2 text-base leading-[1.7] text-i900">
                    {b.explanation
                      || (data.behaviors[b.behavior_key as BId]
                        ? bi(data.behaviors[b.behavior_key as BId].name)
                        : b.behavior_key)}
                  </p>
                ))}
              </div>
            </div>
          </ExpandSection>

          {(missingEvidence.length > 0 || evidenceFor.length > 0 || evidenceAgainst.length > 0) && (
            <ExpandSection title={tr("الأدلة وما ينقص الملف", "Evidence & what’s missing")}>
              {missingEvidence.length > 0 && (
                <>
                  <div className="mb-2 text-sm font-bold text-i500">{tr("ما الذي سيقوّي الملف؟", "What would strengthen the case?")}</div>
                  <ul className="m-0 mb-4 list-disc ps-5 text-base leading-[1.8] text-i900">
                    {missingEvidence.map((line, i) => <li key={i}>{line}</li>)}
                  </ul>
                </>
              )}
              {(evidenceFor.length > 0 || evidenceAgainst.length > 0) && (
                <div className="grid gap-4 text-sm leading-[1.7] text-i700 md:grid-cols-2">
                  {evidenceFor.length > 0 && (
                    <div>
                      <div className="font-bold text-i500">{tr("ما يدعم الإشارة", "Evidence for")}</div>
                      <ul className="m-0 list-disc ps-5">{evidenceFor.map((x, i) => <li key={i}>{x}</li>)}</ul>
                    </div>
                  )}
                  {evidenceAgainst.length > 0 && (
                    <div>
                      <div className="font-bold text-i500">{tr("ما يعارض الإشارة", "Evidence against")}</div>
                      <ul className="m-0 list-disc ps-5">{evidenceAgainst.map((x, i) => <li key={i}>{x}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}
            </ExpandSection>
          )}

          {pathOptions.length > 0 && (
            <ExpandSection
              open
              title={tr("المسار المقترح", "Suggested path")}
              summary={pathOptions[0]?.option}
            >
              <div className="grid gap-4 md:grid-cols-3">
                {pathOptions.map((opt, i) => {
                  const recommended = opt.option === (analysis.readiness_view?.signal ?? m.signal) || i === 0
                  return (
                    <div key={i} className={`flex flex-col gap-2 rounded-[12px] p-4 ${recommended ? "bg-mist" : "bg-white"}`}>
                      <b className="text-lg text-ink">{opt.option}</b>
                      <span className="text-[13px] font-bold text-i500">
                        {recommended ? tr("التوصية", "Recommended") : tr("بديل", "Alternative")}
                      </span>
                      <p className="m-0 text-base leading-[1.7] text-i700">{opt.rationale}</p>
                    </div>
                  )
                })}
              </div>
            </ExpandSection>
          )}

          {planItems.length > 0 && (
            <ExpandSection
              title={tr("خطة التطوير", "Development plan")}
              summary={tr(`${planItems.length} خطوات`, `${planItems.length} steps`)}
            >
              <ol className="m-0 flex list-none flex-col gap-3 p-0">
                {planItems.map((item, i) => (
                  <li key={i} className="flex flex-wrap items-start gap-3 rounded-[12px] bg-mist p-4">
                    <span className="grid size-7 place-items-center rounded-full bg-ink font-num text-sm font-extrabold text-white">{i + 1}</span>
                    <div className="min-w-[200px] flex-1">
                      <b className="text-base text-ink">{item.title}</b>
                      <div className="text-sm text-i500">{item.duration_weeks} {tr("أسابيع", "weeks")} · {item.type}</div>
                      <p className="m-0 mt-1 text-sm leading-[1.6] text-i700">{item.description}</p>
                      <p className="m-0 mt-1 text-sm leading-[1.6] text-i500">{tr("دليل النجاح", "Success evidence")}: {item.success_evidence}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </ExpandSection>
          )}

          <ExpandSection title={tr("ماذا لو؟", "What if?")} summary={tr("مشروع صغير أولاً", "Small project first")}>
            <p className="m-0 mb-4 text-base font-bold text-ink">{tr("ماذا لو قاد أحمد مشروعاً صغيراً أولاً؟", "What if Ahmad leads a small project first?")}</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="text-sm text-i500">{tr("الآن", "Now")}</div>
                <div className="font-num text-[40px] font-extrabold leading-none text-ink">{m.rounded}%</div>
                <div className="mt-1 text-sm text-i700">{tr("التفويض", "Delegation")}: <LevelLabel level={displayLevel(delegPart?.cur ?? null, delegPart?.level ?? null)} /></div>
              </div>
              <div>
                <div className="text-sm text-i500">{tr("افتراضياً بعد المشروع", "Hypothetically after the project")}</div>
                <div className="font-num text-[40px] font-extrabold leading-none text-ink">{m2.rounded}%</div>
                <div className="mt-1 text-sm text-i700">{tr("التفويض", "Delegation")}: <LevelLabel level={displayLevel(delegPart2?.cur ?? null, delegPart2?.level ?? null)} /></div>
              </div>
            </div>
            <p className="m-0 mt-4 text-sm leading-[1.7] text-i500">{tr("افتراض: يتحقق فقط إذا أظهرت تقييمات المدير والزملاء بعد المشروع مستوى «متمكن» في التفويض. لا يُحفظ ولا يغيّر الدرجات الحالية.", "Assumption: it only holds if the manager's and peers' ratings after the project show Proficient in delegation. It isn't saved and doesn't change current scores.")}</p>
          </ExpandSection>
        </>
      )}
    </>
  )
}

type EmpOption = { slug: string; name: { ar: string; en: string }; role: { ar: string; en: string } }

/** Custom employee picker — native <select> clips RTL labels. */
function EmpPicker({
  employees,
  value,
  onChange,
  disabled,
}: {
  employees: EmpOption[]
  value: string
  onChange: (slug: string) => void
  disabled?: boolean
}) {
  const { tr, bi } = useApp()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const selected = employees.find((e) => e.slug === value) ?? employees[0]

  useEffect(() => {
    if (!open) return
    const close = (ev: MouseEvent) => {
      if (!root.current?.contains(ev.target as Node)) setOpen(false)
    }
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", close)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", close)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  if (!selected) return null

  return (
    <div ref={root} className="w-full">
      <div className="mb-2 text-sm font-bold text-i500">{tr("الموظف", "Employee")}</div>
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-[12px] border border-i100 bg-white px-4 py-3 text-start hover:border-flow disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="min-w-0">
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-xl font-bold text-ink">{bi(selected.name)}</span>
            <span className="text-base text-i500">{bi(selected.role)}</span>
          </span>
        </span>
        <ChevronDown
          size={20}
          className={`shrink-0 text-flow transition-transform duration-300 ease-out ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      <div
        className={`expand-panel grid transition-[grid-template-rows,opacity] duration-300 ease-out ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="min-h-0 overflow-hidden">
          <ul
            role="listbox"
            aria-label={tr("اختر موظفاً", "Choose an employee")}
            className="mt-2 max-h-[240px] overflow-y-auto rounded-[12px] border border-i100 bg-white py-1 shadow-[0_8px_24px_rgba(7,59,46,0.08)]"
          >
            {employees.map((e, i) => {
              const on = e.slug === value
              return (
                <li key={e.slug} className="emp-opt" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={on}
                    disabled={disabled}
                    onClick={() => {
                      onChange(e.slug)
                      setOpen(false)
                    }}
                    className={`flex w-full flex-wrap items-baseline gap-x-3 gap-y-1 border-0 px-4 py-3 text-start transition-colors ${on ? "bg-mist" : "bg-transparent hover:bg-mist/70"}`}
                  >
                    <span className={`text-base font-bold ${on ? "text-flow" : "text-ink"}`}>{bi(e.name)}</span>
                    <span className="text-sm text-i500">{bi(e.role)}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
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
  const rater: Rater = "manager"
  const [empSlug, setEmpSlug] = useState("ahmad")
  const [bid, setBid] = useState<BId>("delegation")
  const [level, setLevel] = useState(50)
  const [example, setExample] = useState("")
  const [error, setError] = useState(false)
  const [saved, setSaved] = useState(false)
  const [text, setText] = useState("")
  const [phase, setPhase] = useState<"idle" | "loading" | "done" | "error">("idle")
  const [found, setFound] = useState<AiProposal[]>([])
  const [aiError, setAiError] = useState<string | null>(null)
  const [confirmAllBusy, setConfirmAllBusy] = useState(false)
  const [allConfirmed, setAllConfirmed] = useState(false)
  const chip = (on: boolean) => `rounded-full border px-3 py-2 text-sm font-bold ${on ? "border-flow bg-flow text-white" : "border-i100 bg-white text-i700"}`
  const sample = lang === "ar" ? SAMPLE_AR : SAMPLE_EN

  const employee = data.emp(empSlug)
  const pending = found.filter((f) => f.ok === null)
  const reviewReady = found.length > 0
  const fullyConfirmed = allConfirmed && found.length > 0 && found.every((f) => f.ok === true)

  const pickEmployee = (slug: string) => {
    if (slug === empSlug) return
    setEmpSlug(slug)
    setFound([])
    setAllConfirmed(false)
    setPhase("idle")
    setAiError(null)
    setSaved(false)
  }

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
    setAllConfirmed(false)
    if (!text.trim()) {
      setAiError(tr("أضف نص الملاحظات أولاً.", "Add feedback text first."))
      setPhase("error")
      return
    }
    if (!supabaseConfigured || !supabase || !employee.uuid) {
      setAiError(tr(
        "يلزم اتصال قاعدة البيانات لاقتراحات الذكاء الاصطناعي. يمكنك إدخال تقييم يدوي أدناه.",
        "Database connection is required for AI suggestions. You can still add a manual rating below.",
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
      setAiError(tr("تعذّر حفظ الملاحظات. جرّب التقييم اليدوي أدناه.", "Could not save the feedback. Try a manual rating below."))
      setPhase("error")
      return
    }

    const result = await postJson<{
      saved: { id: string; behavior_key: string; level: number; quote: string; rationale: string }[]
      dropped: { reason: string; behavior_key?: string }[]
    }>("/api/interpret-feedback", { submission_id: sub.id }, { timeoutMs: INTERPRET_CLIENT_TIMEOUT_MS })

    if (!result.ok) {
      const timedOut = result.error === "timeout"
      setAiError(
        timedOut
          ? tr(
            "استغرق التفسير أكثر من المتوقع. أضف تقييماً يدوياً بالمثال أدناه، أو أعد المحاولة لاحقاً.",
            "Interpretation took longer than expected. Add a manual rating with an example below, or try again later.",
          )
          : describeApiError(result.error, tr),
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
    if (result.data.saved.length === 0 && (result.data.dropped?.length ?? 0) > 0) {
      setAiError(tr(
        "وُجدت إشارات في النص لكن لم تُقبل بعد التحقق (مفتاح سلوك أو اقتباس غير مطابق). جرّب النص التجريبي أو صغ أمثلة أقرب للنص.",
        "Signals were found but none passed validation (behavior key or quote mismatch). Try the sample text or keep quotes closer to the source.",
      ))
    }
    setPhase("done")
  }

  const confirmOrReject = async (ratingId: string, action: "confirm" | "reject") => {
    const result = await postJson<{ status: string }>("/api/ratings-confirm", { rating_id: ratingId, action }, { timeoutMs: 15_000 })
    if (!result.ok) {
      setAiError(tr("تعذّر تحديث الاقتراح.", "Could not update the suggestion."))
      return false
    }
    if (action === "reject") {
      setFound((rows) => rows.filter((x) => x.id !== ratingId))
    } else {
      setFound((rows) => {
        const next = rows.map((x) => (x.id === ratingId ? { ...x, ok: true } : x))
        if (next.length && next.every((x) => x.ok === true)) setAllConfirmed(true)
        return next
      })
      await data.reload()
    }
    return true
  }

  const confirmAll = async () => {
    setConfirmAllBusy(true)
    setAiError(null)
    const ids = found.filter((f) => f.ok === null).map((f) => f.id)
    for (const id of ids) {
      const ok = await confirmOrReject(id, "confirm")
      if (!ok) break
    }
    setConfirmAllBusy(false)
    await data.reload()
  }

  if (data.loading) {
    return (
      <>
        <PageTitle>{tr("جمع الملاحظات", "Collect feedback")}</PageTitle>
        <Skeleton className="mb-4 h-32" /><Skeleton className="h-48" />
      </>
    )
  }

  return (
    <>
      <PageTitle sub={tr("كل تقييم يحتاج مثالاً ملموساً. لا نستنتج السلوك من البريد أو المحادثات.", "Every rating needs a concrete example. We never infer behavior from emails or chats.")}>
        {tr("جمع الملاحظات", "Collect feedback")}
      </PageTitle>
      <DataNotice error={data.error} />

      <Card className="mb-6 flex flex-col gap-5 p-6">
        <div className="border-b border-i100 pb-4">
          <EmpPicker
            employees={data.employees}
            value={employee.slug}
            onChange={pickEmployee}
            disabled={phase === "loading" || confirmAllBusy}
          />
        </div>

        <div>
          <h2 className="m-0 mb-3 text-lg font-bold text-ink">{tr("ملاحظات نصية", "Free-text feedback")}</h2>
          {reviewReady ? (
            <div
              className="box-border h-[160px] w-full min-w-0 overflow-y-auto rounded-[12px] border border-i100 bg-mist p-3 text-base leading-[1.7] text-i900"
              aria-label={tr("الملاحظات مع تمييز الأدلة", "Feedback with evidence highlights")}
            >
              <MultiHighlight text={text} quotes={found.map((f) => f.quote)} />
            </div>
          ) : (
            <textarea
              value={text}
              onChange={(ev) => setText(ev.target.value)}
              rows={6}
              placeholder={tr(
                "الصق ملاحظات المشروع هنا: مواقف ملموسة عن التفويض، الملاحظات، المسؤولية، أو حل الخلافات…",
                "Paste project feedback here: concrete situations about delegation, coaching, ownership, or conflict handling…",
              )}
              className="box-border h-[160px] w-full min-w-0 resize-none overflow-y-auto rounded-[12px] border border-i100 bg-white p-3 text-base leading-[1.7] text-i900 placeholder:text-i500"
              aria-label={tr("ملاحظات المشروع", "Project feedback")}
            />
          )}
          <div className="mt-3 flex flex-nowrap items-stretch gap-2">
            <Btn className="min-w-0 flex-1 px-3 py-2.5 text-sm" disabled={phase === "loading"} onClick={() => void analyze()}>
              {phase === "loading"
                ? tr("جارٍ التفسير…", "Interpreting…")
                : reviewReady
                  ? tr("إعادة الاقتراح", "Suggest again")
                  : tr("اقترح من النص", "Suggest from text")}
            </Btn>
            {!text.trim() && !reviewReady && (
              <Btn kind="outline" className="min-w-0 flex-1 px-3 py-2.5 text-sm" disabled={phase === "loading"} onClick={() => setText(sample)}>
                {tr("نص تجريبي", "Sample text")}
              </Btn>
            )}
            {reviewReady && (
              <Btn
                kind="outline"
                className="min-w-0 flex-1 px-3 py-2.5 text-sm"
                disabled={phase === "loading"}
                onClick={() => {
                  setFound([])
                  setAllConfirmed(false)
                  setPhase("idle")
                  setAiError(null)
                }}
              >
                {tr("تعديل النص", "Edit text")}
              </Btn>
            )}
          </div>
        </div>

        {phase === "loading" && (
          <div className="flex flex-col gap-2" role="status" aria-live="polite">
            <p className="m-0 text-sm text-i700">{tr("قد يستغرق حتى دقيقة", "May take up to a minute")}</p>
            <Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" />
          </div>
        )}

        {aiError && (
          <div role="alert" className="rounded-[12px] border border-i100 bg-mist p-4 text-sm leading-[1.7] text-i900">
            <p className="m-0 mb-2">{aiError}</p>
            <p className="m-0 text-i500">{tr("البديل: استخدم التقييم اليدوي أدناه.", "Fallback: use the manual rating below.")}</p>
          </div>
        )}

        {phase === "done" && found.length === 0 && !aiError && (
          <p className="m-0 text-base text-i700">{tr("لم نجد أدلة كافية قابلة للتحقق في هذا النص.", "We found no verifiable evidence in this text.")}</p>
        )}
      </Card>

      {reviewReady && (
        <Card className="mb-6 flex flex-col gap-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-i100 pb-4">
            <div>
              <h2 className="m-0 text-lg font-bold text-ink">{tr("مراجعة الاقتراحات", "Review suggestions")}</h2>
              <p className="m-0 mt-1 text-sm text-i500">
                {fullyConfirmed
                  ? tr("تم تأكيد الكل — الملف محدَّث.", "All confirmed — profile updated.")
                  : tr(
                    `${pending.length} من ${found.length} بانتظار التأكيد`,
                    `${pending.length} of ${found.length} awaiting confirmation`,
                  )}
              </p>
            </div>
            {pending.length > 0 && (
              <Btn disabled={confirmAllBusy} onClick={() => void confirmAll()}>
                {confirmAllBusy ? tr("جارٍ التأكيد…", "Confirming…") : tr("تأكيد الكل", "Confirm all")}
              </Btn>
            )}
          </div>

          {fullyConfirmed && (
            <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-flow bg-mist px-4 py-3">
              <p className="m-0 text-base font-bold text-ink">{tr("تم تأكيد الاقتراحات وتحديث الملف.", "Suggestions confirmed and the profile was updated.")}</p>
              <Btn className="px-4 py-2 text-sm" onClick={() => nav(`${B}/${employee.slug}`)}>
                {tr("عرض الملف المحدَّث", "View updated profile")}
              </Btn>
            </div>
          )}

          <ul className="m-0 flex list-none flex-col gap-3 p-0">
            {found.map((f, i) => {
              const rub = rubricLine(data.behaviors[f.behavior_key]?.rubric, f.level, lang)
              const color = SUGGEST_COLORS[i % SUGGEST_COLORS.length]!
              return (
                <li
                  key={f.id}
                  className="rounded-[12px] border border-i100 bg-white p-4"
                  style={{ borderInlineStartWidth: 4, borderInlineStartColor: color.edge }}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: color.edge }} aria-hidden />
                    <b className="text-base text-ink">{bi(data.behaviors[f.behavior_key]?.name ?? { ar: f.behavior_key, en: f.behavior_key })}</b>
                    <span className="text-sm text-i700">{tr("المستوى", "Level")}: <LevelLabel level={f.level} /></span>
                    <AiTag confirmed={f.ok === true} />
                  </div>
                  {f.quote && (
                    <p className="m-0 mb-2 text-sm leading-[1.6] text-i700">
                      <span className="font-bold text-i500">{tr("الدليل", "Evidence")}: </span>
                      «{f.quote}»
                    </p>
                  )}
                  {rub && (
                    <p className="m-0 text-sm leading-[1.7] text-i700">
                      <span className="font-bold text-i500">{tr("مرساة المستوى", "Level rubric")}: </span>
                      {rub}
                    </p>
                  )}
                  {f.rationale && <p className="m-0 mt-2 text-sm leading-[1.7] text-i700">{f.rationale}</p>}
                  {f.ok === null ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Btn className="px-4 py-2 text-sm" onClick={() => void confirmOrReject(f.id, "confirm")}>{tr("تأكيد", "Confirm")}</Btn>
                      <Btn kind="outline" className="px-4 py-2 text-sm" onClick={() => void confirmOrReject(f.id, "reject")}>{tr("رفض", "Reject")}</Btn>
                    </div>
                  ) : (
                    <p className="m-0 mt-3 text-sm font-bold text-flow">{tr("أُضيف إلى الملف", "Added to the profile")}</p>
                  )}
                </li>
              )
            })}
          </ul>

          {!fullyConfirmed && (
            <p className="m-0 text-sm leading-[1.7] text-i500">
              {tr(
                "الاقتراحات لا تُحتسب حتى تؤكَّد. الدرجات من قواعد معلنة، ولا يخترع النظام رقماً.",
                "Suggestions don't count until confirmed. Scores come from declared rules; the system never invents a number.",
              )}
            </p>
          )}
        </Card>
      )}

      <ExpandSection
        title={tr("تقييم يدوي (احتياطي)", "Manual rating (fallback)")}
        summary={tr("أدخل سلوكاً ومستوى ومثالاً ملموساً دون الذكاء الاصطناعي.", "Enter a behavior, level, and concrete example without AI.")}
      >
        <div className="flex flex-col gap-4">
          <div className="text-sm font-bold text-i500">{tr("السلوك", "Behavior")}</div>
          <div className="flex flex-wrap gap-2">
            {data.roleReqs.map((q) => (
              <button key={q.id} type="button" className={chip(bid === q.id)} onClick={() => setBid(q.id)}>{bi(data.behaviors[q.id].name)}</button>
            ))}
          </div>
          <div className="text-sm font-bold text-i500">{tr("المستوى", "Level")}</div>
          <div className="flex flex-wrap gap-2">
            {([25, 50, 75, 100] as const).map((l) => (
              <button key={l} type="button" onClick={() => setLevel(l)} className={chip(level === l)}>
                <LevelLabel level={l} />
              </button>
            ))}
          </div>
          <label className="flex flex-col gap-2 text-sm font-bold text-i500">{tr("مثال ملموس (مطلوب)", "A concrete example (required)")}
            <textarea value={example} onChange={(ev) => setExample(ev.target.value)} rows={3} placeholder={tr("مثال: في اجتماع الأسبوع الماضي…", "For example: in last week's meeting…")} className="box-border h-[96px] w-full min-w-0 resize-none overflow-y-auto rounded-[12px] border border-i100 bg-white p-3 text-base font-normal text-i900 placeholder:text-i500" />
          </label>
          {error && <p role="alert" className="m-0 text-sm font-bold text-i900">{tr("أضف مثالاً ملموساً قبل الحفظ.", "Add a concrete example before saving.")}</p>}
          {saved && <StatusBadge v="met" label={tr("تمت إضافة التقييم", "Rating saved")} />}
          <Btn className="self-start" onClick={() => void submitManual()}>{tr("حفظ التقييم", "Save rating")}</Btn>
        </div>
      </ExpandSection>
    </>
  )
}

/* ============ Employee: my behavioral profile + plan ============ */
export function MyBehavior() {
  const { tr, bi, lang } = useApp()
  const data = useBehaviorData()
  const [planItems, setPlanItems] = useState<PlanPayload["items"] | null>(null)
  const [planSaved, setPlanSaved] = useState(false)
  const [planError, setPlanError] = useState<string | null>(null)
  const [planLoading, setPlanLoading] = useState(false)

  useEffect(() => {
    if (data.loading) return
    void (async () => {
      setPlanLoading(true)
      setPlanError(null)
      const res = await postJson<{
        plan: PlanPayload | null
        saved: boolean
        source: string
      }>("/api/plan", { slug: "ahmad", role_slug: "team-manager", language: lang, force: false }, { timeoutMs: 12_000 })
      setPlanLoading(false)
      if (res.ok && res.data.plan?.items) {
        setPlanItems(res.data.plan.items)
        setPlanSaved(Boolean(res.data.saved) || res.data.source === "seed" || res.data.source === "cache")
      } else if (res.ok) {
        setPlanItems(null)
      } else {
        setPlanError(res.error)
      }
    })()
  }, [data.loading, lang])

  if (data.loading) {
    return (
      <>
        <PageTitle>{tr("عرضي", "My view")}</PageTitle>
        <Skeleton className="h-48" />
      </>
    )
  }
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
      <PageTitle sub={tr("ملفك السلوكي كما تراه أنت، مع خطتك للنمو", "Your behavioral profile as you see it, with your growth plan")}>{tr("عرضي", "My view")}</PageTitle>
      <DataNotice error={data.error} />
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-3 p-6"><div className="text-sm text-i500">{tr("نسبة المطابقة لدور مدير فريق", "Match % for team manager")}</div><ScoreCell value={`${m.rounded}%`} explain={explainReadiness(e)} size={56} /><p className="m-0 text-base leading-[1.7] text-i700">{tr("هذه إشارة جاهزية وليست توقّعاً. القرار النهائي لمديرك.", "This is a readiness signal, not a prediction. The final decision is your manager's.")}</p></Card>
        <Card className="flex flex-col gap-3 bg-ink p-6 text-white">
          <div className="text-sm text-mint">{tr("أولويتك الآن", "Your priority now")}</div>
          <div className="text-xl font-bold">{bi(data.behaviors.delegation.name)}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-lg font-bold text-white">
            <LevelLabel level={displayLevel(m.parts[0]?.cur ?? null, m.parts[0]?.level ?? null)} />
            <span className="text-white/50" aria-hidden>→</span>
            <LevelLabel level={m.parts[0]?.required ?? null} />
          </div>
        </Card>
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
      {planLoading && <Skeleton className="mb-4 h-24" />}
      {planError && (
        <DataNotice error={planError} />
      )}
      {!planLoading && !planItems?.length && !planError && (
        <DataNotice empty emptyHint={tr("لا توجد خطة بعد — تُعرض خطوات العرض التجريبية.", "No plan yet — showing demo fallback steps.")} />
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

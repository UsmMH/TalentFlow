import { useState } from "react"
import { Link } from "react-router-dom"
import { Lock } from "lucide-react"
import { useApp } from "./lib/i18n"
import { Num } from "./lib/motion"
import { byId, matchScore } from "./lib/scoring.ts"
import { EMPLOYEE_ID, OTHER_ROLES, PLAN, SKILLS } from "./lib/demo-data.ts"
import { explainMatch } from "./lib/explain.ts"
import { Btn, Card, Dialog, LevelLabel, PageTitle, ScoreCell, SkillBar, StatusBadge } from "./ui"

const rule = (tr: (a: string, e: string) => string) => tr("الدرجة لا ترتفع بإنهاء الدورة وحدها؛ تُحدَّث بعد اختبار أو مشروع جديد.", "A score doesn't rise from finishing the course alone; it updates after a new test or project.")

export function MyReadiness() {
  const { tr, bi } = useApp()
  const c = byId(EMPLOYEE_ID)!
  const m = matchScore(c)
  const gap = m.parts.find((p) => p.status !== "met")!
  return (
    <>
      <PageTitle sub={tr("الوظيفة المستهدفة: محلل بيانات أول · بيانات مهارات تجريبية", "Target role: Senior Data Analyst · sample skills data")}>{tr("جاهزيتي", "My readiness")}</PageTitle>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card className="flex flex-col gap-3 p-6">
          <div className="text-sm text-i500">{tr("الجاهزية", "Readiness")}</div>
          <ScoreCell value={`${m.rounded}%`} explain={explainMatch(c)} size={56} />
          <p className="m-0 text-base leading-[1.7] text-i700">{tr("ملف مهاراتك يغطي 92% من متطلبات الوظيفة الموزونة", "Your skills profile covers 92% of the role's weighted requirements")}</p>
        </Card>
        <Card className="flex flex-col gap-3 bg-ink p-6 text-white">
          <div className="text-sm text-mint">{tr("أولويتك الآن", "Your priority now")}</div>
          <div className="text-xl font-bold">{bi(SKILLS[gap.skill])}</div>
          <div className="font-num text-[40px] font-extrabold leading-none">{gap.cur} → {gap.required}</div>
          <Link to="/app/me/plan" className="mt-2 inline-flex items-center justify-center rounded-[12px] border border-white/40 bg-transparent px-4 py-2 text-sm font-bold text-white no-underline hover:border-mint hover:text-mint">
            {tr("عرض خطة التطوير", "View development plan")}
          </Link>
        </Card>
      </div>
      <h2 className="m-0 mb-3 text-xl font-bold text-ink">{tr("مهاراتي", "My skills")}</h2>
      <Card className="mb-8 flex flex-col gap-4 p-6">
        {m.parts.map((p) => (
          <div key={p.skill} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <b className="text-base text-ink">{bi(SKILLS[p.skill])}</b>
              <div className="flex items-center gap-2 text-sm text-i700"><LevelLabel level={p.cur} />{p.status === "met" ? <StatusBadge v="met" /> : <StatusBadge v="partial" label={tr("جزئي · أولوية", "Partial · priority")} />}</div>
            </div>
            <SkillBar current={p.cur} required={p.required} tone={p.status === "met" ? "met" : "partial"} />
          </div>
        ))}
      </Card>
      <h2 className="m-0 mb-3 text-xl font-bold text-ink">{tr("وظائف أخرى", "Other roles")}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {OTHER_ROLES.map((r) => (
          <Card key={r.title.en} className="flex items-center justify-between gap-4 p-6">
            <b className="text-base text-ink">{bi(r.title)}</b>
            <span className="font-num text-[40px] font-extrabold leading-none text-ink"><Num text={`${r.readiness}%`} /></span>
          </Card>
        ))}
      </div>
    </>
  )
}

export function MyPlan() {
  const { tr, bi, approved } = useApp()
  const [open, setOpen] = useState(false)
  const tone = { progress: "partial", todo: "notAssessed", locked: "notAssessed" } as const
  const label = { progress: tr("قيد التنفيذ", "In progress"), todo: tr("لم تبدأ", "Not started"), locked: tr("مقفلة حتى إنهاء المشروع", "Locked until the project is done") }
  const done = 0
  return (
    <>
      <PageTitle sub={approved ? tr("اعتمد المدير خطتك", "Your manager approved this plan") : tr("الأولوية: باور بي آي 50 → 75", "Priority: Power BI 50 → 75")}>{tr("خطة التطوير", "Development plan")}</PageTitle>
      <Card className="mb-6 p-6">
        <div className="mb-2 flex justify-between text-sm text-i500"><span>{tr("تقدّم الخطة", "Plan progress")}</span><b className="font-num text-i900">{done}/{PLAN.length}</b></div>
        <div className="h-3 rounded-full bg-i100"><div className="bar-fill h-3 rounded-full bg-flow" style={{ width: `${(done / PLAN.length) * 100 + 8}%` }} /></div>
      </Card>
      <ol className="m-0 mb-6 flex list-none flex-col gap-4 p-0">
        {PLAN.map((s, i) => (
          <li key={s.id}>
            <Card className={`flex flex-wrap items-center gap-4 p-6 ${s.status === "locked" ? "bg-mist" : ""}`}>
              <span className="grid size-8 place-items-center rounded-full bg-ink font-num font-extrabold text-white">{i + 1}</span>
              <div className="min-w-[200px] flex-1"><b className="text-base text-ink">{bi(s.title)}</b>{s.duration && <div className="text-sm text-i500">{bi(s.duration)}</div>}</div>
              <span className="flex items-center gap-2">{s.status === "locked" && <Lock size={14} aria-hidden />}<StatusBadge v={tone[s.status]} label={label[s.status]} /></span>
            </Card>
          </li>
        ))}
      </ol>
      <Card className="mb-6 border-flow bg-mist p-6 text-base font-bold leading-[1.7] text-ink">{rule(tr)}</Card>
      <Btn onClick={() => setOpen(true)}>{tr("رفع دليل جديد", "Upload new evidence")}</Btn>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <h2 className="m-0 mb-3 text-xl font-bold text-ink">{tr("رفع دليل جديد", "Upload new evidence")}</h2>
        <p className="m-0 mb-6 text-base leading-[1.7] text-i700">{tr("سيُعاد الحساب بعد مراجعة الدليل", "The score will be recalculated after the evidence is reviewed")}</p>
        <Btn onClick={() => setOpen(false)}>{tr("حسناً", "OK")}</Btn>
      </Dialog>
    </>
  )
}

import { useState } from "react"
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import {
  Briefcase,
  ChevronDown,
  GitBranch,
  LayoutGrid,
  ListOrdered,
  MessageSquarePlus,
  Scale,
  Sparkles,
  User,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { useApp } from "./lib/i18n"
import { postJson } from "./lib/api"
import { Btn, Dialog, ExplainProvider } from "./ui"

export const LogoIcon = ({ h = 32 }: { h?: number }) => (
  <svg height={h} width={h * 1.05} viewBox="50 50 640 610" aria-hidden="true">
    <path className="logo-draw" pathLength="1" d="M178 532 C300 532 330 440 355 340 C375 250 430 190 566 174" fill="none" stroke="#073B2E" strokeWidth="140" strokeLinecap="round" />
    <circle className="logo-dot" cx="178" cy="532" r="120" fill="#073B2E" />
    <circle className="logo-dot b" cx="566" cy="174" r="120" fill="#3DDC97" />
  </svg>
)

export function DeviceToggle({ on, onChange }: { on: "desktop" | "mobile"; onChange: (d: "desktop" | "mobile") => void }) {
  const { tr } = useApp()
  const seg = (v: boolean) => `rounded-[8px] border-0 px-3 py-2 text-sm font-bold ${v ? "bg-ink text-white" : "bg-transparent text-i700"}`
  return (
    <div className="flex gap-1 rounded-[12px] border border-i100 bg-mist p-1" role="group" aria-label={tr("نوع الجهاز", "Device")}>
      <button className={seg(on === "desktop")} onClick={() => onChange("desktop")}>{tr("سطح المكتب", "Desktop")}</button>
      <button className={seg(on === "mobile")} onClick={() => onChange("mobile")}>{tr("الجوال", "Mobile")}</button>
    </div>
  )
}

const R = "/app/roles/senior-data-analyst"

type NavDef = { to: string; label: string; end: boolean; icon: LucideIcon }

function SideNavLink({ to, label, end, icon: Icon }: NavDef) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex min-w-[96px] shrink-0 items-center gap-2.5 rounded-[12px] border-t-[3px] px-3 py-2.5 text-sm font-bold leading-snug no-underline lg:min-w-0 lg:flex-none lg:border-s-[3px] lg:border-t-0 lg:px-3 lg:py-2.5 lg:text-[15px] ${
          isActive ? "border-mint bg-white/10 text-white" : "border-transparent text-white/80 hover:bg-white/5 hover:text-white"
        }`
      }
    >
      <Icon size={18} className="shrink-0 opacity-90" aria-hidden />
      <span className="text-start">{label}</span>
    </NavLink>
  )
}

/** Hub = `/app/behavior` (team readiness list). */
export default function Shell() {
  const { lang, setLang, tr, setDevice } = useApp()
  const embed = new URLSearchParams(window.location.search).has("embed")
  const nav = useNavigate()
  const { pathname } = useLocation()
  const employee = pathname.startsWith("/app/me")
  const [skillsOpen, setSkillsOpen] = useState(() => pathname.startsWith("/app/roles") || pathname === "/app")
  const [resetOpen, setResetOpen] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)
  const [resetMsg, setResetMsg] = useState<string | null>(null)

  const primary: NavDef[] = employee
    ? [
        { to: "/app/me/behavior", label: tr("عرضي", "My view"), end: false, icon: User },
        { to: "/app/me/plan", label: tr("خطتي", "My plan"), end: true, icon: Sparkles },
      ]
    : [
        { to: "/app/behavior", label: tr("نظرة عامة على الفريق", "Team overview"), end: true, icon: LayoutGrid },
        { to: "/app/behavior/ahmad", label: tr("ملف الموظف", "Employee profile"), end: true, icon: User },
        { to: "/app/behavior/rate", label: tr("جمع الملاحظات", "Collect feedback"), end: true, icon: MessageSquarePlus },
        { to: "/app/behavior/ahmad/analysis", label: tr("التحليل والخطة", "Analysis & plan"), end: true, icon: Sparkles },
      ]

  const skillsItems: NavDef[] = [
    { to: "/app", label: tr("نظرة المهارات", "Skills overview"), end: true, icon: Briefcase },
    { to: R, label: tr("ترتيب المرشحين", "Candidate ranking"), end: true, icon: ListOrdered },
    { to: `${R}/chain`, label: tr("سلسلة الشواغر", "Vacancy chain"), end: true, icon: GitBranch },
    { to: `${R}/decision`, label: tr("مقارنة الخيارات", "Compare options"), end: true, icon: Scale },
  ]

  const doReset = async () => {
    setResetBusy(true)
    setResetMsg(null)
    const res = await postJson<{ deleted_ai_ratings: number; deleted_submissions: number; deleted_analyses: number; deleted_plans: number }>(
      "/api/reset-demo",
      {},
      { timeoutMs: 20_000 },
    )
    setResetBusy(false)
    if (!res.ok) {
      setResetMsg(
        res.error.includes("disabled") || res.error.includes("403")
          ? tr("إعادة التعيين غير مفعّلة على الخادم.", "Demo reset is not enabled on the server.")
          : tr(`تعذّرت إعادة التعيين (${res.error}).`, `Could not reset (${res.error}).`),
      )
      return
    }
    setResetOpen(false)
    setResetMsg(tr("أُعيدت بيانات العرض التجريبية.", "Demo data was reset."))
    window.location.reload()
  }

  const seg = (on: boolean) => `rounded-[8px] border-0 px-4 py-2 text-sm font-bold ${on ? "bg-ink text-white" : "bg-transparent text-i700"}`
  return (
    <ExplainProvider>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="flex shrink-0 flex-col gap-5 bg-ink p-4 lg:sticky lg:top-0 lg:h-screen lg:w-[260px] lg:p-5">
          <a href="landing.html" className="flex items-center gap-2 rounded-[12px] bg-white px-4 py-3 no-underline" aria-label="تالنت فلو">
            <LogoIcon />
            <span className={`text-xl text-ink ${lang === "ar" ? "font-bold" : "font-num font-extrabold"}`}>{lang === "ar" ? "تالنت فلو" : "TalentFlow"}</span>
          </a>
          <nav className="nav-in fixed inset-x-0 bottom-0 z-40 flex flex-row gap-1 overflow-x-auto bg-ink p-2 lg:static lg:flex-col lg:gap-1 lg:overflow-visible lg:bg-transparent lg:p-0">
            <div className="flex flex-row gap-1 lg:flex-col lg:gap-1">
              {primary.map((item) => (
                <SideNavLink key={item.to} {...item} />
              ))}
            </div>
            {!employee && (
              <div className="hidden lg:block">
                <button
                  type="button"
                  onClick={() => setSkillsOpen((v) => !v)}
                  className="mt-2 flex w-full items-center justify-between gap-2 rounded-[12px] border border-white/15 bg-white/5 px-3 py-2.5 text-start text-[13px] font-bold leading-snug text-white/75 hover:text-white"
                >
                  <span>{tr("معاينة: المهارات والتوظيف", "Preview: skills & hiring")}</span>
                  <ChevronDown size={16} className={`shrink-0 transition-transform ${skillsOpen ? "rotate-180" : ""}`} aria-hidden />
                </button>
                {skillsOpen && (
                  <div className="mt-1 flex flex-col gap-0.5 border-s border-white/10 ps-2">
                    {skillsItems.map((item) => (
                      <SideNavLink key={item.to} {...item} />
                    ))}
                  </div>
                )}
                <p className="m-0 mt-1 px-1 text-[11px] text-white/45">{tr("بيانات عينة", "Sample data")}</p>
              </div>
            )}
          </nav>
          <div className="mt-auto hidden flex-col gap-2 lg:flex">
            <p className="m-0 text-xs text-white/55">{tr("بيانات تجريبية · شركة نماء للتقنية", "Demo data · Nama Technology Co.")}</p>
            <button
              type="button"
              onClick={() => { setResetMsg(null); setResetOpen(true) }}
              className="rounded-[8px] border border-white/20 bg-transparent px-3 py-2 text-start text-sm font-bold text-white/75 hover:text-white"
            >
              {tr("إعادة تعيين بيانات العرض", "Reset demo data")}
            </button>
            {resetMsg && <p className="m-0 text-xs text-mint">{resetMsg}</p>}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-i100 bg-white px-6 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-i500">{tr("عرض كـ:", "View as:")}</span>
              <div className="flex gap-1 rounded-[12px] border border-i100 bg-mist p-1" role="group">
                <button className={seg(!employee)} onClick={() => nav("/app/behavior")}>{tr("المدير", "Manager")}</button>
                <button className={seg(employee)} onClick={() => nav("/app/me/behavior")}>{tr("الموظف (أحمد)", "Employee (Ahmad)")}</button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-[8px] border border-i100 bg-white px-3 py-2 text-sm font-bold text-i700 lg:hidden"
                onClick={() => { setResetMsg(null); setResetOpen(true) }}
              >
                {tr("إعادة التعيين", "Reset")}
              </button>
              {!embed && <DeviceToggle on="desktop" onChange={setDevice} />}
              <button onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="rounded-[8px] border border-ink bg-white px-4 py-2 text-sm font-bold text-ink">
                {lang === "ar" ? "الإنجليزية" : "عربي"}
              </button>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1200px] flex-1 p-4 pb-24 lg:p-8"><div key={pathname} className="page"><Outlet /></div></main>
        </div>
      </div>

      <Dialog open={resetOpen} onClose={() => !resetBusy && setResetOpen(false)}>
        <h2 className="m-0 mb-3 text-xl font-bold text-ink">{tr("إعادة تعيين بيانات العرض؟", "Reset demo data?")}</h2>
        <p className="m-0 mb-6 text-base leading-[1.7] text-i700">
          {tr(
            "سيُحذف ما أُضيف بعد البذرة: اقتراحات الذكاء الاصطناعي، التقييمات التجريبية، والتحليلات/الخطط المولَّدة. تبقى بيانات العرض الأصلية.",
            "This removes post-seed additions: AI suggestions, test ratings, and generated analyses/plans. Original seed data stays.",
          )}
        </p>
        {resetMsg && <p className="mb-4 text-sm font-bold text-i900">{resetMsg}</p>}
        <div className="flex gap-2">
          <Btn disabled={resetBusy} onClick={() => void doReset()}>{resetBusy ? tr("جارٍ…", "Working…") : tr("تأكيد إعادة التعيين", "Confirm reset")}</Btn>
          <Btn kind="outline" disabled={resetBusy} onClick={() => setResetOpen(false)}>{tr("إلغاء", "Cancel")}</Btn>
        </div>
      </Dialog>
    </ExplainProvider>
  )
}

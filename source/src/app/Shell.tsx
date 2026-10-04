import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { useApp } from "./lib/i18n"
import { ExplainProvider } from "./ui"

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

export default function Shell() {
  const { lang, setLang, tr, setDevice } = useApp()
  const embed = new URLSearchParams(window.location.search).has("embed")
  const nav = useNavigate()
  const { pathname } = useLocation()
  const employee = pathname.startsWith("/app/me")
  const R = "/app/roles/senior-data-analyst"
  const items = employee
    ? [["/app/me", tr("جاهزيتي", "My readiness"), true], ["/app/me/plan", tr("خطتي", "My plan"), false], ["/app/me/behavior", tr("ملفي السلوكي", "My behaviors"), false]]
    : [["/app", tr("نظرة عامة", "Overview"), true], [R, tr("ترتيب المرشحين", "Candidate ranking"), false], [`${R}/chain`, tr("سلسلة الشواغر", "Vacancy chain"), false], [`${R}/decision`, tr("مقارنة الخيارات", "Compare options"), false], ["/app/behavior", tr("الجاهزية السلوكية", "Behavioral readiness"), false], ["/app/behavior/rate", tr("تقييم سلوكي", "Behavior rating"), false]]

  const seg = (on: boolean) => `rounded-[8px] border-0 px-4 py-2 text-sm font-bold ${on ? "bg-ink text-white" : "bg-transparent text-i700"}`
  return (
    <ExplainProvider>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="flex shrink-0 flex-col gap-6 bg-ink p-4 lg:sticky lg:top-0 lg:h-screen lg:w-[256px] lg:p-6">
          {/* brand: white card on Deep Ink */}
          <a href="landing.html" className="flex items-center gap-2 rounded-[12px] bg-white px-4 py-3 no-underline" aria-label="تالنت فلو">
            <LogoIcon />
            <span className={`text-xl text-ink ${lang === "ar" ? "font-bold" : "font-num font-extrabold"}`}>{lang === "ar" ? "تالنت فلو" : "TalentFlow"}</span>
          </a>
          <nav className="nav-in fixed inset-x-0 bottom-0 z-40 flex flex-row gap-1 overflow-x-auto bg-ink p-2 lg:static lg:flex-col lg:gap-2 lg:bg-transparent lg:p-0">
            {items.map(([to, label, end]) => (
              <NavLink key={to as string} to={to as string} end
                className={({ isActive }) => `min-w-[96px] shrink-0 flex-1 rounded-[12px] border-t-[3px] px-2 py-2 text-center text-sm font-bold no-underline lg:min-w-0 lg:flex-none lg:border-s-[3px] lg:border-t-0 lg:px-4 lg:py-3 lg:text-start lg:text-base ${isActive ? "border-mint bg-white/10 text-white" : "border-transparent text-white/80 hover:text-white"}`}>
                {label}
              </NavLink>
            ))}
          </nav>
          <p className="m-0 mt-auto hidden text-sm text-white/70 lg:block">{tr("بيانات تجريبية · شركة نماء للتقنية", "Demo data · Nama Technology Co.")}</p>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-4 border-b border-i100 bg-white px-6 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-i500">{tr("عرض كـ:", "View as:")}</span>
              <div className="flex gap-1 rounded-[12px] border border-i100 bg-mist p-1" role="group">
                <button className={seg(!employee)} onClick={() => nav("/app")}>{tr("المدير", "Manager")}</button>
                <button className={seg(employee)} onClick={() => nav("/app/me")}>{tr("الموظف (أحمد)", "Employee (Ahmad)")}</button>
              </div>
            </div>
            <div className="flex items-center gap-2">
            {!embed && <DeviceToggle on="desktop" onChange={setDevice} />}
            <button onClick={() => setLang(lang === "ar" ? "en" : "ar")} className="rounded-[8px] border border-ink bg-white px-4 py-2 text-sm font-bold text-ink">
              {lang === "ar" ? "الإنجليزية" : "عربي"}
            </button>
            </div>
          </header>
          <main className="mx-auto w-full max-w-[1200px] flex-1 p-4 pb-24 lg:p-8"><div key={pathname} className="page"><Outlet /></div></main>
        </div>
      </div>
    </ExplainProvider>
  )
}

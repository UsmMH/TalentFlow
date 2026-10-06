import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { AlertTriangle, ArrowLeftRight, BarChart3, CheckCircle, ChevronLeft, Clock, Search, ShieldCheck, X, type LucideIcon } from "lucide-react"
import { useApp } from "./lib/i18n"
import { Num } from "./lib/motion"
import { LEVEL_NAME, levelStep } from "./lib/scoring.ts"
import { ASSUMPTION_ROWS, type Explain } from "./lib/explain.ts"

/* ---------- Card / Button ---------- */
export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`card rounded-[20px] border ${className.includes("border-") ? "" : "border-i100"} ${className.includes("bg-") ? "" : "bg-white"} shadow-[0_1px_2px_rgba(7,59,46,0.06)] ${className}`}>{children}</div>
)
export const Btn = ({ kind = "primary", className = "", ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { kind?: "primary" | "outline" }) => (
  <button
    {...p}
    className={`inline-flex items-center justify-center gap-2 rounded-[12px] border border-flow px-6 py-3 text-base font-bold transition-colors ${
      kind === "primary" ? "bg-flow text-white hover:bg-[#085640]" : "bg-transparent text-flow hover:bg-mist"
    } ${className}`}
  />
)
export const Skeleton = ({ className = "" }: { className?: string }) => <div className={`animate-pulse rounded-[12px] bg-i100 ${className}`} />
export const PageTitle = ({ children, sub }: { children: ReactNode; sub?: ReactNode }) => (
  <div className="mb-6">
    <h1 className="m-0 text-[28px] font-bold leading-[1.3] text-ink">{children}</h1>
    {sub && <p className="m-0 mt-1 text-base text-i500">{sub}</p>}
  </div>
)

/* ---------- StatusBadge ---------- */
const V = {
  met: ["#0B6B4F", "#DDF5E9", CheckCircle, ["مستوفى", "Met"]],
  partial: ["#8A5A00", "#FBEFD5", Clock, ["جزئي", "Partial"]],
  critical: ["#A32E2E", "#FBE3E3", AlertTriangle, ["فجوة حرجة", "Critical gap"]], // red ONLY here
  lowConf: ["#4F6B75", "transparent", BarChart3, ["ثقة منخفضة", "Low confidence"]],
  highConf: ["#0B6B4F", "#DDF5E9", ShieldCheck, ["ثقة عالية", "High confidence"]],
  notAssessed: ["#56645F", "#EEF1F0", Search, ["غير مقيّم", "Not assessed"]],
  noImpact: ["#56645F", "#EEF1F0", ArrowLeftRight, ["لا يوجد أثر داخلي", "No internal impact"]],
  highImpact: ["#9A4A00", "#FDEBDD", ArrowLeftRight, ["أثر مرتفع على القسم", "High impact on department"]],
} as const satisfies Record<string, readonly [string, string, LucideIcon, readonly [string, string]]>
export type Variant = keyof typeof V

export function StatusBadge({ v, label }: { v: Variant; label?: string }) {
  const { tr } = useApp()
  const [fg, bg, Icon, [ar, en]] = V[v]
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 text-[13px] font-bold"
      style={{ color: fg, background: bg, border: v === "lowConf" ? `1.5px dashed ${fg}` : undefined }}
    >
      <Icon size={14} aria-hidden />
      {label ?? tr(ar, en)}
    </span>
  )
}

export function CandidateTypeBadge({ type }: { type: "internal" | "external" }) {
  const { tr } = useApp()
  return (
    <span className="inline-flex rounded-full bg-i100 px-3 py-1 text-[13px] font-bold text-i700">
      {type === "internal" ? tr("داخلي", "Internal") : tr("خارجي · سيرة ذاتية", "External · CV")}
    </span>
  )
}

/* ---------- Level / SkillBar ---------- */
export function LevelLabel({ level, className = "" }: { level: number | null; className?: string }) {
  const { tr } = useApp()
  const step = levelStep(level)
  if (step === null || step === 0) return <span className={`text-i500 ${className}`.trim()}>{tr("غير مقيّم", "Not assessed")}</span>
  const [ar, en] = LEVEL_NAME[step]
  return <span className={`whitespace-nowrap font-bold ${className}`.trim()}>{tr(ar, en)}</span>
}

/** Plain divs, RTL-safe (logical inset). Marker = required level. */
export function SkillBar({ current, required, tone = "met" }: { current: number | null; required: number; tone?: "met" | "partial" | "critical" }) {
  const { tr } = useApp()
  const color = { met: "#0B6B4F", partial: "#8A5A00", critical: "#A32E2E" }[tone]
  const curStep = levelStep(current)
  const reqStep = levelStep(required)
  const curWord =
    curStep === null || curStep === 0 ? tr("غير مقيّم", "Not assessed") : tr(LEVEL_NAME[curStep][0], LEVEL_NAME[curStep][1])
  const reqWord =
    reqStep === null || reqStep === 0 ? String(required) : tr(LEVEL_NAME[reqStep][0], LEVEL_NAME[reqStep][1])
  return (
    <div className="relative h-3 w-full rounded-full bg-i100" role="img" aria-label={`${curWord} / ${reqWord}`}>
      <div className="bar-fill h-3 rounded-full" style={{ width: `${current ?? 0}%`, background: color }} />
      <div className="absolute -top-1 h-5 w-[3px] rounded bg-i900" style={{ insetInlineStart: `calc(${required}% - 1px)` }} />
    </div>
  )
}

/* ---------- KpiTile ---------- */
export const KpiTile = ({ label, value, context }: { label: string; value: ReactNode; context: string }) => (
  <Card className="p-6">
    <div className="text-sm text-i500">{label}</div>
    <div className="font-num text-[48px] font-extrabold leading-[1.2] text-ink">{typeof value === "string" ? <Num text={value} /> : value}</div>
    <div className="text-sm text-i700">{context}</div>
  </Card>
)

/* ---------- Sheet (drawer from the end side) & Dialog ---------- */
function useEsc(on: boolean, close: () => void) {
  useEffect(() => {
    if (!on) return
    const f = (e: KeyboardEvent) => e.key === "Escape" && close()
    document.addEventListener("keydown", f)
    return () => document.removeEventListener("keydown", f)
  }, [on, close])
}
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEsc(open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50">
      <div className="sheet-back absolute inset-0 bg-i900/40" onClick={onClose} />
      <aside role="dialog" aria-modal className="sheet-panel absolute inset-y-0 end-0 w-[480px] max-w-full overflow-y-auto bg-white p-6 shadow-xl">
        {children}
      </aside>
    </div>
  )
}
export function Dialog({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEsc(open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="dialog-back absolute inset-0 bg-i900/40" onClick={onClose} />
      <div role="dialog" aria-modal className="dialog-panel relative w-[480px] max-w-full rounded-[20px] bg-white p-8 shadow-xl">
        {children}
      </div>
    </div>
  )
}

/* ---------- ExplainDrawer + ScoreCell ---------- */
const ExplainCtx = createContext<(e: Explain) => void>(() => {})
export const useExplain = () => useContext(ExplainCtx)

export function ExplainProvider({ children }: { children: ReactNode }) {
  const { bi, tr } = useApp()
  const [e, setE] = useState<Explain | null>(null)
  return (
    <ExplainCtx.Provider value={setE}>
      {children}
      <Sheet open={!!e} onClose={() => setE(null)}>
        {e && (
          <div className="flex flex-col gap-6">
            <div className="flex items-start justify-between gap-4">
              <h2 className="m-0 text-xl font-bold text-ink">{bi(e.title)}</h2>
              <button aria-label={tr("إغلاق", "Close")} onClick={() => setE(null)} className="rounded-[12px] border border-i100 bg-white p-2 text-i700"><X size={16} /></button>
            </div>
            <section>
              <div className="mb-2 text-sm font-bold text-i500">{tr("المعادلة", "Formula")}</div>
              <p className="m-0 rounded-[12px] bg-mist p-4 text-base leading-[1.7] text-i900">{bi(e.formula)}</p>
            </section>
            <section>
              <div className="mb-2 text-sm font-bold text-i500">{tr("المدخلات والأوزان", "Inputs and weights")}</div>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {e.inputs.map((r, i) => (
                  <li key={i} className="flex flex-col gap-1 border-b border-i100 pb-2">
                    <div className="flex justify-between gap-4 text-base"><span>{bi(r.label)}</span><b className="font-num font-extrabold" dir="ltr">{typeof r.value === "string" ? r.value : bi(r.value)}</b></div>
                    {r.note && <span className="text-sm text-i500">{bi(r.note)}</span>}
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-[12px] bg-ink p-4 text-white">
              <div className="text-sm text-mint">{tr("النتيجة", "Result")}</div>
              <div className="font-num text-xl font-extrabold">{bi(e.result)}</div>
            </section>
            {e.assumptions && (
              <section>
                <div className="mb-2 text-sm font-bold text-i500">{tr("افتراضات قابلة للتعديل", "Editable assumptions")}</div>
                <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-i700">
                  {ASSUMPTION_ROWS.map((r, i) => <li key={i} className="flex justify-between"><span>{bi(r.label)}</span><span>{bi(r.value)}</span></li>)}
                </ul>
                <p className="m-0 mt-2 text-sm text-i500">{tr("ملف الافتراضات في المشروع", "lib/assumptions.ts")}</p>
              </section>
            )}
          </div>
        )}
      </Sheet>
    </ExplainCtx.Provider>
  )
}

export function HowLink({ explain, label, compact }: { explain: Explain; label?: string; compact?: boolean }) {
  const open = useExplain()
  const { tr } = useApp()
  return (
    <button
      type="button"
      onClick={() => open(explain)}
      className={`inline-flex items-center rounded-[8px] border border-i100 bg-white px-2.5 py-1 font-bold text-flow hover:border-flow ${compact ? "text-[12px]" : "text-sm"}`}
    >
      {label ?? (compact ? tr("الشرح", "Explain") : tr("كيف حُسب؟", "How calculated?"))}
    </button>
  )
}

/** Clear “go back” control — not a bare text link. */
export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="mb-4 inline-flex items-center gap-1.5 rounded-[10px] border border-i100 bg-white px-3 py-2 text-sm font-bold text-ink no-underline hover:border-flow hover:text-flow"
    >
      <ChevronLeft size={16} className="shrink-0 rtl:rotate-180" aria-hidden />
      {label}
    </Link>
  )
}

export function ScoreCell({ value, explain, size = 32, compactExplain }: { value: string; explain?: Explain; size?: number; compactExplain?: boolean }) {
  return (
    <div className="flex flex-col items-start gap-0.5">
      <span className="font-num font-extrabold leading-none text-ink" style={{ fontSize: size }}><Num text={value} /></span>
      {explain && <HowLink explain={explain} compact={compactExplain ?? size <= 56} />}
    </div>
  )
}

/* ---------- Vacancy chain: vertical steps (no wrap / reorder bugs in narrow columns) ---------- */
export function FlowChain({ nodes }: { nodes: { title: string; sub: string }[]; bi?: never }) {
  return (
    <div className="rounded-[20px] bg-ink p-6">
      <ol className="m-0 flex list-none flex-col gap-0 p-0">
        {nodes.map((n, i) => (
          <li key={i} className="flex gap-3" style={{ ["--d" as string]: `${i * 0.35}s` }}>
            <div className="flex w-4 shrink-0 flex-col items-center">
              <span
                className={`flow-dot size-4 shrink-0 rounded-full ${i === 0 ? "bg-mint" : "bg-white"}`}
                style={{ animationDelay: `${i * 0.35}s` }}
              />
              {i < nodes.length - 1 && (
                <span
                  className="flow-line-v mt-1 w-[3px] flex-1 min-h-[28px] bg-white/70"
                  style={{ animationDelay: `${i * 0.35 + 0.2}s` }}
                />
              )}
            </div>
            <div className={`min-w-0 flex-1 ${i < nodes.length - 1 ? "pb-5" : ""}`}>
              <div className="flow-text text-base font-bold text-white" style={{ animationDelay: `${i * 0.35 + 0.1}s` }}>{n.title}</div>
              <div className="flow-text mt-1 text-sm leading-[1.6] text-white/85" style={{ animationDelay: `${i * 0.35 + 0.2}s` }}>{n.sub}</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

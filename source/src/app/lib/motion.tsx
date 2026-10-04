// Small, purposeful motion helpers (CSS does the rest). No glows or sparkles: brand guidelines forbid "AI magic" effects.
import { useEffect, useRef, useState, type ReactNode } from "react"


function useInView<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || !("IntersectionObserver" in window)) return setSeen(true)
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, seen] as const
}

/** Fades/slides in when scrolled into view. */
export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const [ref, seen] = useInView<HTMLDivElement>()
  return <div ref={ref} className={`reveal ${seen ? "in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>
}

/** Counts a number up once visible. Only animates plain "92%" / "19,000 ريال" style text; keeps final width so nothing jumps. */
export function Num({ text, duration = 900 }: { text: string; duration?: number }) {
  const m = text.match(/^(\D*)([\d,]+)(\D*)$/)
  const [ref, seen] = useInView<HTMLSpanElement>()
  const target = m ? Number(m[2].replace(/,/g, "")) : 0
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!m || !seen) return setV(target)
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min((t - t0) / duration, 1)
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [seen, target, duration])
  if (!m) return <>{text}</>
  const shown = text.includes(",") ? v.toLocaleString("en-US") : String(v)
  return (
    <span ref={ref} className="relative inline-block" style={{ position: "relative", display: "inline-block" }}>
      <span style={{ visibility: "hidden" }}>{text}</span>
      <span style={{ position: "absolute", insetInlineStart: 0, top: 0, whiteSpace: "nowrap" }}>{m[1]}{shown}{m[3]}</span>
    </span>
  )
}

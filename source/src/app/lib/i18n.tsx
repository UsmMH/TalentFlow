// Tiny i18n: every string is an (ar, en) pair next to where it is used; names/data are {ar,en} objects.
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { B } from "./demo-data"

export type Lang = "ar" | "en"
type Ctx = {
  lang: Lang; setLang: (l: Lang) => void
  tr: (ar: string, en: string) => string
  bi: (x: B) => string
  n: (x: number) => string // Western digits in both languages
  device: "desktop" | "mobile"; setDevice: (d: "desktop" | "mobile") => void
  approved: boolean; setApproved: (v: boolean) => void
}
const C = createContext<Ctx>(null!)
export const useApp = () => useContext(C)

export function AppProvider({ children }: { children: ReactNode }) {
  const qs = new URLSearchParams(window.location.search)
  const [lang, setLang] = useState<Lang>(qs.get("lang") === "en" ? "en" : "ar")
  const [device, setDevice] = useState<"desktop" | "mobile">(qs.get("device") === "mobile" && !qs.has("embed") ? "mobile" : "desktop")
  const [approved, setApproved] = useState(false)
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"
    document.title = lang === "ar" ? "تالنت فلو" : "TalentFlow"
  }, [lang])
  const v: Ctx = {
    lang, setLang, device, setDevice, approved, setApproved,
    tr: (ar, en) => (lang === "ar" ? ar : en),
    bi: (x) => x[lang],
    n: (x) => x.toLocaleString("en-US"),
  }
  return <C.Provider value={v}>{children}</C.Provider>
}

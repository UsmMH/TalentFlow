import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { b } from "./demo-data"
import {
  BEHAVIOR_IDS,
  BEHAVIORS,
  EMPLOYEES,
  ROLE_REQ,
  emptyRatings,
  type BId,
  type Employee,
  type EvidenceQuote,
  type Rating,
  type Rater,
  type Rubric,
} from "./behavior"
import { supabase, supabaseConfigured } from "./supabase"

type BehaviorMeta = { id: BId; name: { ar: string; en: string }; anchor: { ar: string; en: string }; rubric: Rubric }
type RoleReq = typeof ROLE_REQ

type Store = {
  loading: boolean
  source: "supabase" | "local"
  error: string | null
  employees: Employee[]
  roleReqs: RoleReq
  behaviors: Record<BId, BehaviorMeta>
  emp: (slug: string) => Employee
}

const LOCAL: Store = {
  loading: false,
  source: "local",
  error: null,
  employees: EMPLOYEES,
  roleReqs: ROLE_REQ,
  behaviors: Object.fromEntries(
    BEHAVIOR_IDS.map((id) => [id, { id, name: BEHAVIORS[id].name, anchor: BEHAVIORS[id].anchor, rubric: BEHAVIORS[id].rubric }]),
  ) as Record<BId, BehaviorMeta>,
  emp: (slug) => EMPLOYEES.find((e) => e.slug === slug || e.id === slug) ?? EMPLOYEES[0],
}

const Ctx = createContext<Store>(LOCAL)
export const useBehaviorData = () => useContext(Ctx)

type DbEmployee = {
  id: string
  slug: string
  full_name_en: string
  full_name_ar: string | null
  title_en: string | null
  title_ar: string | null
  department_en: string | null
  department_ar: string | null
}
type DbBehavior = { id: string; key: string; name_en: string; name_ar: string | null; rubric: Rubric }
type DbReq = { behavior_id: string; required_level: number; weight: number; is_critical: boolean }
type DbRating = {
  employee_id: string
  behavior_id: string
  level: number
  example: string | null
  source: string
  status: string
  ai_quote: string | null
  created_at: string
  submission_id: string
}
type DbSubmission = { id: string; employee_id: string; rater_type: string }

async function fetchFromSupabase(): Promise<Omit<Store, "loading" | "emp">> {
  const sb = supabase!
  const [emps, behs, role, reqs, ratings, submissions] = await Promise.all([
    sb.from("employees").select("id,slug,full_name_en,full_name_ar,title_en,title_ar,department_en,department_ar").order("full_name_en"),
    sb.from("behaviors").select("id,key,name_en,name_ar,rubric"),
    sb.from("roles").select("id,slug").eq("slug", "team-manager").maybeSingle(),
    sb.from("role_behavior_requirements").select("behavior_id,required_level,weight,is_critical"),
    sb.from("behavior_ratings").select("employee_id,behavior_id,level,example,source,status,ai_quote,created_at,submission_id").eq("status", "confirmed"),
    sb.from("feedback_submissions").select("id,employee_id,rater_type"),
  ])

  for (const r of [emps, behs, reqs, ratings, submissions]) {
    if (r.error) throw new Error(r.error.message)
  }
  if (role.error) throw new Error(role.error.message)

  const behaviorRows = behs.data as DbBehavior[]
  const byBehId = Object.fromEntries(behaviorRows.map((x) => [x.id, x.key as BId]))
  const behaviors = Object.fromEntries(
    behaviorRows.map((row) => {
      const id = row.key as BId
      const r75 = row.rubric?.["75"]
      return [id, {
        id,
        name: b(row.name_ar ?? row.name_en, row.name_en),
        anchor: b(r75?.ar ?? BEHAVIORS[id]?.anchor.ar ?? "", r75?.en ?? BEHAVIORS[id]?.anchor.en ?? ""),
        rubric: row.rubric,
      }]
    }),
  ) as Record<BId, BehaviorMeta>

  const subById = Object.fromEntries(((submissions.data ?? []) as DbSubmission[]).map((s) => [s.id, s]))
  const roleReqs: RoleReq = ((reqs.data ?? []) as DbReq[])
    .map((q) => ({
      id: byBehId[q.behavior_id],
      required: q.required_level,
      weight: Number(q.weight),
      critical: q.is_critical,
    }))
    .filter((q) => q.id)
    .sort((a, z) => BEHAVIOR_IDS.indexOf(a.id) - BEHAVIOR_IDS.indexOf(z.id)) as RoleReq

  // Average confirmed ratings per (employee, behavior, rater_type)
  const buckets = new Map<string, { sum: number; n: number; examples: EvidenceQuote[]; dates: string[] }>()
  for (const row of (ratings.data ?? []) as DbRating[]) {
    const sub = subById[row.submission_id]
    if (!sub) continue
    const bid = byBehId[row.behavior_id]
    if (!bid) continue
    const rater = sub.rater_type as Rater
    const key = `${row.employee_id}|${bid}|${rater}`
    const cur = buckets.get(key) ?? { sum: 0, n: 0, examples: [], dates: [] }
    cur.sum += row.level
    cur.n += 1
    cur.dates.push(row.created_at)
    if (row.example || row.ai_quote) {
      cur.examples.push({
        text: b(row.example ?? row.ai_quote ?? "", row.example ?? row.ai_quote ?? ""),
        source: rater,
        confirmed: row.source === "human" || row.status === "confirmed",
      })
    }
    buckets.set(key, cur)
  }

  const employees: Employee[] = ((emps.data ?? []) as DbEmployee[]).map((e) => {
    const ratingsMap = emptyRatings()
    const evidence: Partial<Record<BId, EvidenceQuote[]>> = {}
    const dates: string[] = []
    for (const bid of BEHAVIOR_IDS) {
      const rating: Rating = { manager: null, peer: null, document: null, self: null }
      for (const rater of ["manager", "peer", "document", "self"] as Rater[]) {
        const hit = buckets.get(`${e.id}|${bid}|${rater}`)
        if (!hit) continue
        rating[rater] = Math.round((hit.sum / hit.n) * 100) / 100
        dates.push(...hit.dates)
        evidence[bid] = [...(evidence[bid] ?? []), ...hit.examples]
      }
      ratingsMap[bid] = rating
    }
    return {
      id: e.slug,
      slug: e.slug,
      name: b(e.full_name_ar ?? e.full_name_en, e.full_name_en),
      role: b(e.title_ar ?? e.title_en ?? "", e.title_en ?? ""),
      department: b(e.department_ar ?? e.department_en ?? "", e.department_en ?? ""),
      ratings: ratingsMap,
      evidence,
      ratingDates: dates,
    }
  })

  // Prefer DB role reqs when present; else keep local §6.7 constants
  return {
    source: "supabase",
    error: null,
    employees,
    roleReqs: roleReqs.length ? roleReqs : ROLE_REQ,
    behaviors: Object.keys(behaviors).length ? behaviors : LOCAL.behaviors,
  }
}

export function BehaviorDataProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<Store>({ ...LOCAL, loading: supabaseConfigured })

  useEffect(() => {
    if (!supabaseConfigured) return
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchFromSupabase()
        if (cancelled) return
        setStore({
          ...data,
          loading: false,
          emp: (slug) => data.employees.find((e) => e.slug === slug || e.id === slug) ?? data.employees[0] ?? LOCAL.employees[0],
        })
      } catch (err) {
        if (cancelled) return
        console.warn("Supabase load failed; using local §6 fallback", err)
        setStore({
          ...LOCAL,
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load from Supabase",
        })
      }
    })()
    return () => { cancelled = true }
  }, [])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

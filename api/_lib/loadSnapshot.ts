/** Load employee/role + engine snapshot for /api/analysis and /api/plan. */

import {
  BEHAVIOR_KEYS,
  computeReadiness,
  emptyRatings,
  type BehaviorSourceScores,
  type RatingsByBehavior,
  type ReadinessSnapshot,
} from "../../shared/engine.ts"
import type { BehaviorKey } from "../../shared/types.ts"
import type { RoleRequirement, ScoreSource } from "../../shared/policy.ts"
import { getSupabaseAdmin } from "./supabaseAdmin.ts"

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

export type LoadedContext = {
  employee: {
    id: string
    slug: string
    full_name_en: string
    full_name_ar: string | null
  }
  role: {
    id: string
    slug: string
    title_en: string
    title_ar: string | null
  }
  snapshot: ReadinessSnapshot
}

export async function loadEmployeeRoleSnapshot(opts: {
  employeeRef: string
  roleRef: string
}): Promise<{ ok: true; data: LoadedContext } | { ok: false; status: number; error: string }> {
  const sb = getSupabaseAdmin()

  const empQuery = sb.from("employees").select("id,slug,full_name_en,full_name_ar")
  const { data: employee, error: empErr } = isUuid(opts.employeeRef)
    ? await empQuery.eq("id", opts.employeeRef).maybeSingle()
    : await empQuery.eq("slug", opts.employeeRef).maybeSingle()
  if (empErr) return { ok: false, status: 500, error: empErr.message }
  if (!employee) return { ok: false, status: 404, error: "Employee not found" }

  const roleQuery = sb.from("roles").select("id,slug,title_en,title_ar")
  const { data: role, error: roleErr } = isUuid(opts.roleRef)
    ? await roleQuery.eq("id", opts.roleRef).maybeSingle()
    : await roleQuery.eq("slug", opts.roleRef).maybeSingle()
  if (roleErr) return { ok: false, status: 500, error: roleErr.message }
  if (!role) return { ok: false, status: 404, error: "Role not found" }

  const { data: behaviors, error: behErr } = await sb.from("behaviors").select("id,key")
  if (behErr) return { ok: false, status: 500, error: behErr.message }
  const keyById = Object.fromEntries((behaviors ?? []).map((b) => [b.id, b.key as BehaviorKey]))

  const { data: reqRows, error: reqErr } = await sb
    .from("role_behavior_requirements")
    .select("behavior_id,required_level,weight,is_critical")
    .eq("role_id", role.id)
  if (reqErr) return { ok: false, status: 500, error: reqErr.message }

  const requirements: RoleRequirement[] = (reqRows ?? [])
    .map((row) => ({
      id: keyById[row.behavior_id],
      required: row.required_level as number,
      weight: Number(row.weight),
      critical: Boolean(row.is_critical),
    }))
    .filter((q) => q.id && BEHAVIOR_KEYS.includes(q.id))

  if (!requirements.length) return { ok: false, status: 400, error: "Role has no behavior requirements" }

  const { data: submissions, error: subErr } = await sb
    .from("feedback_submissions")
    .select("id,rater_type")
    .eq("employee_id", employee.id)
  if (subErr) return { ok: false, status: 500, error: subErr.message }
  const raterBySub = Object.fromEntries((submissions ?? []).map((s) => [s.id, s.rater_type as string]))

  const { data: ratingRows, error: ratErr } = await sb
    .from("behavior_ratings")
    .select("behavior_id,level,submission_id,created_at,status")
    .eq("employee_id", employee.id)
    .eq("status", "confirmed")
  if (ratErr) return { ok: false, status: 500, error: ratErr.message }

  type Acc = { sum: number; n: number; dates: string[] }
  const buckets = new Map<string, Acc>()
  for (const row of ratingRows ?? []) {
    const bid = keyById[row.behavior_id]
    const rater = raterBySub[row.submission_id]
    if (!bid || !rater) continue
    const key = `${bid}|${rater}`
    const cur = buckets.get(key) ?? { sum: 0, n: 0, dates: [] }
    cur.sum += row.level
    cur.n += 1
    cur.dates.push(row.created_at)
    buckets.set(key, cur)
  }

  const ratings: RatingsByBehavior = emptyRatings()
  const metaByBehavior: NonNullable<Parameters<typeof computeReadiness>[0]["metaByBehavior"]> = {}

  for (const bid of BEHAVIOR_KEYS) {
    const scores: BehaviorSourceScores = { manager: null, peer: null, document: null, self: null }
    const individualCounts: Partial<Record<ScoreSource, number>> = {}
    const dates: string[] = []
    for (const rater of ["manager", "peer", "document", "self"] as const) {
      const hit = buckets.get(`${bid}|${rater}`)
      if (!hit) continue
      scores[rater] = Math.round((hit.sum / hit.n) * 100) / 100
      dates.push(...hit.dates)
      if (rater !== "self") individualCounts[rater] = hit.n
    }
    ratings[bid] = scores
    metaByBehavior[bid] = { dates, individualCounts }
  }

  const snapshot = computeReadiness({ ratings, requirements, metaByBehavior })
  return { ok: true, data: { employee, role, snapshot } }
}

export function displayName(
  row: { full_name_en?: string; full_name_ar?: string | null; title_en?: string; title_ar?: string | null },
  language: "en" | "ar",
  kind: "employee" | "role",
): string {
  if (kind === "employee") {
    return language === "ar" ? (row.full_name_ar || row.full_name_en || "") : (row.full_name_en || "")
  }
  return language === "ar" ? (row.title_ar || row.title_en || "") : (row.title_en || "")
}

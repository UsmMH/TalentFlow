import type { VercelRequest, VercelResponse } from "@vercel/node"
import {
  BEHAVIOR_KEYS,
  computeReadiness,
  emptyRatings,
  type BehaviorSourceScores,
  type RatingsByBehavior,
} from "../shared/engine.ts"
import type { BehaviorKey } from "../shared/types.ts"
import type { RoleRequirement, ScoreSource } from "../shared/policy.ts"
import { getSupabaseAdmin } from "./_lib/supabaseAdmin.ts"

type Body = {
  employee_id?: string
  role_id?: string
  slug?: string
  role_slug?: string
}

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

function bad(res: VercelResponse, status: number, error: string) {
  return res.status(status).json({ ok: false, error })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return bad(res, 405, "Method not allowed")
  }

  let body: Body
  try {
    body = (typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {}) as Body
  } catch {
    return bad(res, 400, "Invalid JSON body")
  }

  const employeeRef = body.employee_id ?? body.slug
  const roleRef = body.role_id ?? body.role_slug ?? "team-manager"

  if (!employeeRef || typeof employeeRef !== "string") {
    return bad(res, 400, "employee_id or slug is required")
  }
  if (typeof roleRef !== "string" || !roleRef) {
    return bad(res, 400, "role_id or role_slug is required")
  }

  try {
    const sb = getSupabaseAdmin()

    const empQuery = sb.from("employees").select("id,slug,full_name_en,full_name_ar,title_en,title_ar")
    const { data: employee, error: empErr } = isUuid(employeeRef)
      ? await empQuery.eq("id", employeeRef).maybeSingle()
      : await empQuery.eq("slug", employeeRef).maybeSingle()
    if (empErr) return bad(res, 500, empErr.message)
    if (!employee) return bad(res, 404, "Employee not found")

    const roleQuery = sb.from("roles").select("id,slug,title_en,title_ar")
    const { data: role, error: roleErr } = isUuid(roleRef)
      ? await roleQuery.eq("id", roleRef).maybeSingle()
      : await roleQuery.eq("slug", roleRef).maybeSingle()
    if (roleErr) return bad(res, 500, roleErr.message)
    if (!role) return bad(res, 404, "Role not found")

    const { data: behaviors, error: behErr } = await sb.from("behaviors").select("id,key")
    if (behErr) return bad(res, 500, behErr.message)
    const keyById = Object.fromEntries((behaviors ?? []).map((b) => [b.id, b.key as BehaviorKey]))

    const { data: reqRows, error: reqErr } = await sb
      .from("role_behavior_requirements")
      .select("behavior_id,required_level,weight,is_critical")
      .eq("role_id", role.id)
    if (reqErr) return bad(res, 500, reqErr.message)

    const requirements: RoleRequirement[] = (reqRows ?? [])
      .map((row) => ({
        id: keyById[row.behavior_id],
        required: row.required_level as number,
        weight: Number(row.weight),
        critical: Boolean(row.is_critical),
      }))
      .filter((q) => q.id && BEHAVIOR_KEYS.includes(q.id))

    if (!requirements.length) return bad(res, 400, "Role has no behavior requirements")

    const { data: submissions, error: subErr } = await sb
      .from("feedback_submissions")
      .select("id,rater_type")
      .eq("employee_id", employee.id)
    if (subErr) return bad(res, 500, subErr.message)
    const raterBySub = Object.fromEntries((submissions ?? []).map((s) => [s.id, s.rater_type as string]))

    const { data: ratingRows, error: ratErr } = await sb
      .from("behavior_ratings")
      .select("behavior_id,level,submission_id,created_at,status")
      .eq("employee_id", employee.id)
      .eq("status", "confirmed")
    if (ratErr) return bad(res, 500, ratErr.message)

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

    return res.status(200).json({
      ok: true,
      data: {
        employee_id: employee.id,
        employee_slug: employee.slug,
        role_id: role.id,
        role_slug: role.slug,
        role_match: snapshot.exact,
        rounded: snapshot.rounded,
        coverage: snapshot.coverage,
        signal: snapshot.signal,
        confidence: snapshot.confidence,
        overall_confidence: snapshot.overallConfidence,
        parts: snapshot.parts,
        critical_missing: snapshot.criticalMissing.map((p) => p.id),
        blind_spots: snapshot.parts
          .filter((p) => p.blind_spot)
          .map((p) => ({ behavior_key: p.id, kind: p.blind_spot })),
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error"
    return bad(res, 500, message)
  }
}

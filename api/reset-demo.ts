import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getSupabaseAdmin } from "./_lib/supabaseAdmin"

/** Seeded feedback_submissions ids from supabase/seed.sql — keep these, drop the rest. */
const SEED_SUBMISSION_IDS = [
  "d1000000-0000-4000-8000-000000000011",
  "d1000000-0000-4000-8000-000000000012",
  "d1000000-0000-4000-8000-000000000013",
  "d1000000-0000-4000-8000-000000000014",
  "d1000000-0000-4000-8000-000000000015",
  "d1000000-0000-4000-8000-000000000016",
  "d1000000-0000-4000-8000-000000000021",
  "d1000000-0000-4000-8000-000000000022",
  "d1000000-0000-4000-8000-000000000023",
  "d1000000-0000-4000-8000-000000000024",
  "d1000000-0000-4000-8000-000000000031",
  "d1000000-0000-4000-8000-000000000032",
  "d1000000-0000-4000-8000-000000000041",
  "d1000000-0000-4000-8000-000000000051",
  "d1000000-0000-4000-8000-000000000052",
]

function bad(res: VercelResponse, status: number, error: string) {
  return res.status(status).json({ ok: false, error })
}

/**
 * POST /api/reset-demo — demo safety only (no OpenRouter).
 * Enabled only when ALLOW_DEMO_RESET=true; otherwise 403.
 * Removes post-seed ratings / submissions / generated analyses & plans.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return bad(res, 405, "Method not allowed")
  }

  if (process.env.ALLOW_DEMO_RESET !== "true") {
    return bad(res, 403, "Demo reset is disabled")
  }

  try {
    const sb = getSupabaseAdmin()

    // 1) AI-suggested ratings (never part of seed)
    const { data: aiRows, error: aiErr } = await sb
      .from("behavior_ratings")
      .delete()
      .eq("source", "ai_suggested")
      .select("id")
    if (aiErr) return bad(res, 500, aiErr.message)

    // 2) Non-seed submissions (cascades human test ratings on them)
    const { data: allSubs, error: subListErr } = await sb.from("feedback_submissions").select("id")
    if (subListErr) return bad(res, 500, subListErr.message)
    const seedSet = new Set(SEED_SUBMISSION_IDS)
    const extraIds = (allSubs ?? []).map((r) => r.id as string).filter((id) => !seedSet.has(id))
    let deletedSubmissions = 0
    if (extraIds.length) {
      const { data: delSubs, error: delSubErr } = await sb
        .from("feedback_submissions")
        .delete()
        .in("id", extraIds)
        .select("id")
      if (delSubErr) return bad(res, 500, delSubErr.message)
      deletedSubmissions = delSubs?.length ?? 0
    }

    // 3) Generated analyses — seed rows use model='seed' and null snapshot_hash
    const { data: analysisRows, error: anListErr } = await sb
      .from("development_analyses")
      .select("id,model,snapshot_hash")
    if (anListErr) return bad(res, 500, anListErr.message)
    const analysisDeleteIds = (analysisRows ?? [])
      .filter((r) => r.model !== "seed" || r.snapshot_hash != null)
      .map((r) => r.id as string)
    let deletedAnalyses = 0
    if (analysisDeleteIds.length) {
      const { data: delA, error: delAErr } = await sb
        .from("development_analyses")
        .delete()
        .in("id", analysisDeleteIds)
        .select("id")
      if (delAErr) return bad(res, 500, delAErr.message)
      deletedAnalyses = delA?.length ?? 0
    }

    // 4) Generated plans — seed rows have null model and null snapshot_hash
    const { data: planRows, error: planListErr } = await sb
      .from("development_plans")
      .select("id,model,snapshot_hash")
    if (planListErr) return bad(res, 500, planListErr.message)
    const planDeleteIds = (planRows ?? [])
      .filter((r) => r.snapshot_hash != null || r.model != null)
      .map((r) => r.id as string)
    let deletedPlans = 0
    if (planDeleteIds.length) {
      const { data: delP, error: delPErr } = await sb
        .from("development_plans")
        .delete()
        .in("id", planDeleteIds)
        .select("id")
      if (delPErr) return bad(res, 500, delPErr.message)
      deletedPlans = delP?.length ?? 0
    }

    return res.status(200).json({
      ok: true,
      data: {
        deleted_ai_ratings: aiRows?.length ?? 0,
        deleted_submissions: deletedSubmissions,
        deleted_analyses: deletedAnalyses,
        deleted_plans: deletedPlans,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error"
    return bad(res, 500, message)
  }
}

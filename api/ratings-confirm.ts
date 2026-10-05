import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getSupabaseAdmin } from "./_lib/supabaseAdmin"

function bad(res: VercelResponse, status: number, error: string) {
  return res.status(status).json({ ok: false, error })
}

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

/** POST { rating_id, action: 'confirm' | 'reject' } — PROJECT_SPEC §8 `/api/ratings/confirm` */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return bad(res, 405, "Method not allowed")
  }

  let body: { rating_id?: string; action?: string }
  try {
    body = (typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {}) as {
      rating_id?: string
      action?: string
    }
  } catch {
    return bad(res, 400, "Invalid JSON body")
  }

  const ratingId = body.rating_id
  const action = body.action
  if (!ratingId || typeof ratingId !== "string" || !isUuid(ratingId)) {
    return bad(res, 400, "rating_id (uuid) is required")
  }
  if (action !== "confirm" && action !== "reject") {
    return bad(res, 400, "action must be 'confirm' or 'reject'")
  }

  const status = action === "confirm" ? "confirmed" : "rejected"

  try {
    const sb = getSupabaseAdmin()
    const { data: existing, error: findErr } = await sb
      .from("behavior_ratings")
      .select("id,source,status")
      .eq("id", ratingId)
      .maybeSingle()
    if (findErr) return bad(res, 500, findErr.message)
    if (!existing) return bad(res, 404, "Rating not found")

    const { data: updated, error: updErr } = await sb
      .from("behavior_ratings")
      .update({ status })
      .eq("id", ratingId)
      .select("id,status,source,behavior_id,level")
      .single()
    if (updErr) return bad(res, 500, updErr.message)

    return res.status(200).json({
      ok: true,
      data: {
        rating_id: updated.id,
        status: updated.status,
        source: updated.source,
        // Only confirmed ratings are used by the scoring engine.
        counts_in_engine: updated.status === "confirmed",
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error"
    return bad(res, 500, message)
  }
}

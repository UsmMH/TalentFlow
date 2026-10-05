import type { VercelRequest, VercelResponse } from "@vercel/node"
import { chatJson } from "./_lib/llm.ts"
import { INTERPRET_SCHEMA, interpretSystemPrompt, interpretUserPrompt } from "./_lib/prompts/interpret.ts"
import { getSupabaseAdmin } from "./_lib/supabaseAdmin.ts"
import { validateProposals, type InterpretProposal } from "../shared/validateInterpret.ts"

function bad(res: VercelResponse, status: number, error: string) {
  return res.status(status).json({ ok: false, error })
}

function isUuid(s: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
}

function detectLang(text: string, stored?: string | null): "en" | "ar" {
  if (stored === "ar" || stored === "en") return stored
  return /[\u0600-\u06FF]/.test(text) ? "ar" : "en"
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return bad(res, 405, "Method not allowed")
  }

  let body: { submission_id?: string }
  try {
    body = (typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {}) as {
      submission_id?: string
    }
  } catch {
    return bad(res, 400, "Invalid JSON body")
  }

  const submissionId = body.submission_id
  if (!submissionId || typeof submissionId !== "string" || !isUuid(submissionId)) {
    return bad(res, 400, "submission_id (uuid) is required")
  }

  try {
    const sb = getSupabaseAdmin()

    const { data: submission, error: subErr } = await sb
      .from("feedback_submissions")
      .select("id,employee_id,rater_type,free_text,language")
      .eq("id", submissionId)
      .maybeSingle()
    if (subErr) return bad(res, 500, subErr.message)
    if (!submission) return bad(res, 404, "Submission not found")
    if (!submission.free_text?.trim()) return bad(res, 400, "Submission has no free_text")

    const { data: behaviors, error: behErr } = await sb
      .from("behaviors")
      .select("id,key,name_en,name_ar,rubric")
      .order("key")
    if (behErr) return bad(res, 500, behErr.message)
    if (!behaviors?.length) return bad(res, 500, "No behaviors configured")

    const language = detectLang(submission.free_text, submission.language)
    const messages = [
      { role: "system" as const, content: interpretSystemPrompt(language) },
      {
        role: "user" as const,
        content: interpretUserPrompt({
          freeText: submission.free_text,
          behaviors: behaviors.map((b) => ({
            key: b.key,
            name_en: b.name_en,
            name_ar: b.name_ar,
            rubric: b.rubric,
          })),
          language,
        }),
      },
    ]

    const llm = await chatJson<{ proposals?: InterpretProposal[] }>({
      messages,
      jsonSchema: INTERPRET_SCHEMA,
      timeoutMs: 20_000,
    })

    if (!llm.ok) {
      console.warn("[interpret-feedback] llm_failed", { model: llm.model, latency_ms: llm.latency_ms, error: llm.error })
      return bad(res, 502, llm.error)
    }

    const raw = Array.isArray(llm.data.proposals) ? llm.data.proposals : []
    const { valid, dropped } = validateProposals(submission.free_text, raw)
    console.info("[interpret-feedback] validated", {
      model: llm.model,
      latency_ms: llm.latency_ms,
      raw_count: raw.length,
      saved_count: valid.length,
      dropped_count: dropped.length,
      drop_reasons: dropped.map((d) => d.reason),
    })

    const idByKey = Object.fromEntries(behaviors.map((b) => [b.key, b.id]))
    const saved: {
      id: string
      behavior_key: string
      level: number
      quote: string
      rationale: string
      status: "pending"
    }[] = []

    for (const p of valid) {
      const behavior_id = idByKey[p.behavior_key]
      if (!behavior_id) continue
      const { data: row, error: insErr } = await sb
        .from("behavior_ratings")
        .insert({
          submission_id: submission.id,
          employee_id: submission.employee_id,
          behavior_id,
          level: p.level,
          example: p.quote,
          source: "ai_suggested",
          status: "pending",
          ai_quote: p.quote,
          ai_rationale: p.rationale,
        })
        .select("id")
        .single()
      if (insErr) {
        console.warn("[interpret-feedback] insert_failed", { reason: insErr.message })
        continue
      }
      saved.push({
        id: row.id,
        behavior_key: p.behavior_key,
        level: p.level,
        quote: p.quote,
        rationale: p.rationale,
        status: "pending",
      })
    }

    return res.status(200).json({
      ok: true,
      data: {
        saved,
        dropped: dropped.map((d) => ({
          behavior_key: d.behavior_key,
          level: d.level,
          reason: d.reason,
        })),
        model: llm.model,
        latency_ms: llm.latency_ms,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error"
    console.warn("[interpret-feedback] error", { error: message })
    return bad(res, 500, message)
  }
}

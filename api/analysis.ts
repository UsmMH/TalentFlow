import type { VercelRequest, VercelResponse } from "@vercel/node"
import { chatJson } from "./_lib/llm.ts"
import { ANALYSIS_SCHEMA, analysisSystemPrompt, analysisUserPrompt } from "./_lib/prompts/analysis.ts"
import { displayName, loadEmployeeRoleSnapshot } from "./_lib/loadSnapshot.ts"
import { getSupabaseAdmin } from "./_lib/supabaseAdmin.ts"
import {
  snapshotHash,
  templateAnalysis,
  toSnapshotPayload,
  validateAnalysis,
  type Analysis,
} from "../shared/validateAnalysis.ts"

const DEMO_BUDGET_MS = 20_000

function bad(res: VercelResponse, status: number, error: string) {
  return res.status(status).json({ ok: false, error })
}

function parseLang(v: unknown): "en" | "ar" {
  return v === "en" ? "en" : "ar"
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST")
    return bad(res, 405, "Method not allowed")
  }

  let body: {
    employee_id?: string
    slug?: string
    role_id?: string
    role_slug?: string
    language?: string
    force?: boolean
  }
  try {
    body = (typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body ?? {}) as typeof body
  } catch {
    return bad(res, 400, "Invalid JSON body")
  }

  const employeeRef = body.employee_id ?? body.slug
  const roleRef = body.role_id ?? body.role_slug ?? "team-manager"
  const language = parseLang(body.language)
  if (!employeeRef || typeof employeeRef !== "string") {
    return bad(res, 400, "employee_id or slug is required")
  }

  const wallStart = Date.now()

  try {
    const loaded = await loadEmployeeRoleSnapshot({ employeeRef, roleRef })
    if (!loaded.ok) return bad(res, loaded.status, loaded.error)

    const { employee, role, snapshot } = loaded.data
    const payload = toSnapshotPayload(snapshot)
    const hash = snapshotHash(payload)
    const employeeName = displayName(employee, language, "employee")
    const roleName = displayName(role, language, "role")
    const sb = getSupabaseAdmin()

    // Cache hit: same snapshot hash + language → skip LLM
    if (!body.force) {
      const { data: cached } = await sb
        .from("development_analyses")
        .select("id,narrative,model,snapshot_hash,created_at")
        .eq("employee_id", employee.id)
        .eq("role_id", role.id)
        .eq("language", language)
        .eq("snapshot_hash", hash)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cached?.narrative) {
        return res.status(200).json({
          ok: true,
          data: {
            analysis: cached.narrative as Analysis,
            source: "cache",
            saved: false,
            model: cached.model ?? "cache",
            latency_ms: Date.now() - wallStart,
            snapshot_hash: hash,
            signal: payload.signal,
            role_match: payload.exact,
          },
        })
      }
    }

    const messages = [
      { role: "system" as const, content: analysisSystemPrompt(language) },
      {
        role: "user" as const,
        content: analysisUserPrompt({ snapshot: payload, employeeName, roleName, language }),
      },
    ]

    const remaining = Math.max(1_000, DEMO_BUDGET_MS - (Date.now() - wallStart))
    // Analysis JSON often needs >10s; use the full demo budget per attempt (failover only on fast errors).
    const llm = await chatJson<Analysis>({
      messages,
      jsonSchema: ANALYSIS_SCHEMA,
      timeoutMs: remaining,
      totalCapMs: remaining,
      validate: (data) => {
        const v = validateAnalysis(data, payload)
        if (!v.ok) {
          return { ok: false, error: v.failures.map((f) => f.reason).join(",") }
        }
        return { ok: true }
      },
    })

    let analysis: Analysis
    let source: "llm" | "template" | "seed" = "template"
    let model = "template"
    let saved = false

    if (llm.ok) {
      const v = validateAnalysis(llm.data, payload)
      if (v.ok) {
        analysis = v.data
        source = "llm"
        model = llm.model
      } else {
        analysis = templateAnalysis(payload, { employee: employeeName, role: roleName }, language)
        source = "template"
        model = "template"
      }
    } else {
      // Demo safety: prefer stored seed when live gen fails / times out
      const { data: seed } = await sb
        .from("development_analyses")
        .select("narrative,model")
        .eq("employee_id", employee.id)
        .eq("role_id", role.id)
        .eq("language", language)
        .eq("model", "seed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (seed?.narrative) {
        analysis = seed.narrative as Analysis
        source = "seed"
        model = "seed"
        saved = true
      } else {
        // Any language seed, then template
        const { data: anySeed } = await sb
          .from("development_analyses")
          .select("narrative,model,language")
          .eq("employee_id", employee.id)
          .eq("role_id", role.id)
          .eq("model", "seed")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
        if (anySeed?.narrative && anySeed.language === language) {
          analysis = anySeed.narrative as Analysis
          source = "seed"
          model = "seed"
          saved = true
        } else {
          analysis = templateAnalysis(payload, { employee: employeeName, role: roleName }, language)
          source = "template"
          model = "template"
        }
      }
    }

    // Also treat wall-clock over budget as demo-safety seed if we somehow still have LLM path unfinished
    if (Date.now() - wallStart >= DEMO_BUDGET_MS && source === "llm") {
      // keep LLM result if we already have it; budget already enforced in chatJson
    }

    if (source !== "seed") {
      const { error: insErr } = await sb.from("development_analyses").insert({
        employee_id: employee.id,
        role_id: role.id,
        engine_snapshot: payload,
        narrative: analysis,
        language,
        model,
        snapshot_hash: hash,
      })
      if (insErr) {
        console.warn("[analysis] store_failed", { error: insErr.message })
        // Retry without snapshot_hash if column missing on older DB
        if (insErr.message.includes("snapshot_hash")) {
          await sb.from("development_analyses").insert({
            employee_id: employee.id,
            role_id: role.id,
            engine_snapshot: { ...payload, snapshot_hash: hash },
            narrative: analysis,
            language,
            model,
          })
        }
      }
    }

    return res.status(200).json({
      ok: true,
      data: {
        analysis,
        source,
        saved,
        model,
        latency_ms: Date.now() - wallStart,
        snapshot_hash: hash,
        signal: payload.signal,
        role_match: payload.exact,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error"
    console.warn("[analysis] error", { error: message })
    return bad(res, 500, message)
  }
}

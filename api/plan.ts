import type { VercelRequest, VercelResponse } from "@vercel/node"
import { chatJson } from "./_lib/llm"
import { PLAN_SCHEMA, planSystemPrompt, planUserPrompt } from "./_lib/prompts/plan"
import { displayName, loadEmployeeRoleSnapshot } from "./_lib/loadSnapshot"
import { getSupabaseAdmin } from "./_lib/supabaseAdmin"
import {
  snapshotHash,
  templateAnalysis,
  templatePlan,
  toSnapshotPayload,
  validateAnalysis,
  validatePlan,
  type Analysis,
  type Plan,
} from "../shared/validateAnalysis"

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
    analysis?: Analysis
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

    if (!body.force) {
      const { data: cached } = await sb
        .from("development_plans")
        .select("id,items,snapshot_hash,created_at")
        .eq("employee_id", employee.id)
        .eq("role_id", role.id)
        .eq("language", language)
        .eq("snapshot_hash", hash)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (cached?.items) {
        const items = Array.isArray(cached.items) ? cached.items : (cached.items as Plan).items
        return res.status(200).json({
          ok: true,
          data: {
            plan: { items } as Plan,
            source: "cache",
            saved: false,
            model: "cache",
            latency_ms: Date.now() - wallStart,
            snapshot_hash: hash,
          },
        })
      }
    }

    // Prefer provided analysis; else latest stored; else template
    let analysis: Analysis
    if (body.analysis) {
      const v = validateAnalysis(body.analysis, payload)
      analysis = v.ok
        ? v.data
        : templateAnalysis(payload, { employee: employeeName, role: roleName }, language)
    } else {
      const { data: row } = await sb
        .from("development_analyses")
        .select("narrative")
        .eq("employee_id", employee.id)
        .eq("role_id", role.id)
        .eq("language", language)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      analysis = (row?.narrative as Analysis | undefined)
        ?? templateAnalysis(payload, { employee: employeeName, role: roleName }, language)
    }

    const messages = [
      { role: "system" as const, content: planSystemPrompt(language) },
      {
        role: "user" as const,
        content: planUserPrompt({
          snapshot: payload,
          analysis,
          employeeName,
          roleName,
          language,
        }),
      },
    ]

    const remaining = Math.max(1_000, DEMO_BUDGET_MS - (Date.now() - wallStart))
    const llm = await chatJson<Plan>({
      messages,
      jsonSchema: PLAN_SCHEMA,
      timeoutMs: remaining,
      totalCapMs: remaining,
      validate: (data) => {
        const v = validatePlan(data, payload)
        if (!v.ok) return { ok: false, error: v.failures.map((f) => f.reason).join(",") }
        return { ok: true }
      },
    })

    let plan: Plan
    let source: "llm" | "template" | "seed" = "template"
    let model = "template"
    let saved = false

    if (llm.ok) {
      const v = validatePlan(llm.data, payload)
      if (v.ok) {
        plan = v.data
        source = "llm"
        model = llm.model
      } else {
        plan = templatePlan(payload, language)
      }
    } else {
      // Demo safety: stored seed plan (no snapshot_hash / oldest rows)
      const { data: seedRows } = await sb
        .from("development_plans")
        .select("items,snapshot_hash")
        .eq("employee_id", employee.id)
        .eq("role_id", role.id)
        .eq("language", language)
        .order("created_at", { ascending: true })
        .limit(5)

      const seedRow = (seedRows ?? []).find((r) => !r.snapshot_hash)
        ?? (seedRows ?? [])[0]
      const seedItems = seedRow?.items
      const items = Array.isArray(seedItems) ? seedItems : (seedItems as Plan | undefined)?.items
      if (Array.isArray(items) && items.length) {
        plan = { items }
        source = "seed"
        model = "seed"
        saved = true
      } else {
        plan = templatePlan(payload, language)
      }
    }

    if (source !== "seed") {
      const row: Record<string, unknown> = {
        employee_id: employee.id,
        role_id: role.id,
        items: plan.items,
        language,
        snapshot_hash: hash,
        model,
      }
      const { error: insErr } = await sb.from("development_plans").insert(row)
      if (insErr) {
        console.warn("[plan] store_failed", { error: insErr.message })
        const slim = { employee_id: employee.id, role_id: role.id, items: plan.items, language }
        await sb.from("development_plans").insert(slim)
      }
    }

    return res.status(200).json({
      ok: true,
      data: {
        plan,
        source,
        saved,
        model,
        latency_ms: Date.now() - wallStart,
        snapshot_hash: hash,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error"
    console.warn("[plan] error", { error: message })
    return bad(res, 500, message)
  }
}

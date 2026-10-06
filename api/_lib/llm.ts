/** OpenRouter LLM wrapper (PROJECT_SPEC §7.0). Server-only. */

import { loadLocalEnv } from "./loadLocalEnv"

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

export type JsonSchema = {
  name: string
  strict?: boolean
  schema: Record<string, unknown>
}

export type LlmResult<T> = {
  ok: true
  data: T
  model: string
  latency_ms: number
} | {
  ok: false
  error: string
  model: string
  latency_ms: number
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
/** Per-model attempt. On timeout / invalid JSON → next model (no same-model retry). */
const FIRST_ATTEMPT_TIMEOUT_MS = 10_000
/** Wall-clock budget across all models. */
const TOTAL_CAP_MS = 25_000

function parseFallbackModels(raw: string | undefined): string[] {
  if (!raw?.trim()) return []
  return raw.split(",").map((s) => s.trim()).filter(Boolean)
}

function modelsToTry(): string[] {
  const primary = process.env.LLM_MODEL
  if (!primary) throw new Error("Missing LLM_MODEL")
  const fallbacks = parseFallbackModels(process.env.LLM_FALLBACK_MODELS)
  return [primary, ...fallbacks.filter((m) => m !== primary)]
}

async function once<T>(
  messages: ChatMessage[],
  jsonSchema: JsonSchema,
  model: string,
  timeoutMs: number,
  format: "json_schema" | "json_object",
): Promise<{ data: T; latency_ms: number; model: string }> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new Error("Missing OPENROUTER_API_KEY")

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const started = Date.now()

  const response_format =
    format === "json_object"
      ? { type: "json_object" as const }
      : {
          type: "json_schema" as const,
          json_schema: {
            name: jsonSchema.name,
            strict: jsonSchema.strict ?? true,
            schema: jsonSchema.schema,
          },
        }

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "https://talent-flow-buildx.vercel.app",
        "X-Title": process.env.OPENROUTER_APP_NAME ?? "TalentFlow",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        // json_object: don't require provider-side schema (flash-lite returns empty {} under json_schema+strict)
        ...(format === "json_schema" ? { provider: { require_parameters: true } } : {}),
        response_format,
      }),
    })

    const latency_ms = Date.now() - started
    if (!res.ok) {
      const body = await res.text().catch(() => "")
      console.warn("[llm] http_error", { model, latency_ms, status: res.status, body_len: body.length })
      throw new Error(`OpenRouter HTTP ${res.status}`)
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[]
      model?: string
    }
    const content = json.choices?.[0]?.message?.content
    if (!content || typeof content !== "string") {
      console.warn("[llm] empty_content", { model, latency_ms })
      throw new Error("Empty LLM content")
    }

    let parsed: T
    try {
      parsed = JSON.parse(content) as T
    } catch {
      console.warn("[llm] invalid_json", { model, latency_ms, content_len: content.length })
      throw new Error("Invalid JSON from LLM")
    }

    const answered = json.model ?? model
    console.info("[llm] ok", { model: answered, latency_ms, format })
    return { data: parsed, latency_ms, model: answered }
  } catch (err) {
    const latency_ms = Date.now() - started
    if (err instanceof Error && err.name === "AbortError") {
      console.warn("[llm] timeout", { model, latency_ms, timeout_ms: timeoutMs })
      throw new Error("LLM timeout")
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Call OpenRouter with structured JSON output.
 * First attempt 10s; on timeout, invalid JSON, or failed `validate`, advance to the next model
 * (no same-model retry). Total wall-clock cap ~25s.
 * Never logs message content (may contain personal/synthetic free text).
 */
export async function chatJson<T>(opts: {
  messages: ChatMessage[]
  jsonSchema: JsonSchema
  /** Override per-attempt timeout (default 10s). Total cap remains ~25s. */
  timeoutMs?: number
  /** Override total wall-clock budget (default 25s). */
  totalCapMs?: number
  /**
   * json_schema (default) = provider-enforced schema.
   * json_object = free JSON object (better for flash-lite interpret; we validate server-side).
   */
  format?: "json_schema" | "json_object"
  /** If provided, invalid results advance to the next model. */
  validate?: (data: T) => { ok: true } | { ok: false; error: string }
}): Promise<LlmResult<T>> {
  loadLocalEnv()
  const perAttempt = opts.timeoutMs ?? FIRST_ATTEMPT_TIMEOUT_MS
  const totalCap = opts.totalCapMs ?? TOTAL_CAP_MS
  const format = opts.format ?? "json_schema"
  const models = modelsToTry()
  let lastError = "LLM failed"
  let lastModel = models[0] ?? "unknown"
  let lastLatency = 0
  const wallStart = Date.now()

  for (const model of models) {
    const elapsed = Date.now() - wallStart
    const remaining = totalCap - elapsed
    if (remaining <= 0) {
      lastError = "LLM total timeout"
      break
    }
    lastModel = model
    const budget = Math.min(perAttempt, remaining)
    try {
      const { data, latency_ms, model: answered } = await once<T>(
        opts.messages,
        opts.jsonSchema,
        model,
        budget,
        format,
      )
      if (opts.validate) {
        const v = opts.validate(data)
        if (!v.ok) {
          console.warn("[llm] validation_failed", { model: answered, error: v.error })
          lastError = v.error
          lastLatency = Date.now() - wallStart
          continue
        }
      }
      lastLatency = latency_ms
      console.info("[llm] answered_by", { model: answered })
      return { ok: true, data, model: answered, latency_ms }
    } catch (err) {
      lastError = err instanceof Error ? err.message : "LLM failed"
      lastLatency = Date.now() - wallStart
      console.warn("[llm] model_failed", { model, error: lastError, elapsed_ms: lastLatency })
      continue
    }
  }

  const latency_ms = Date.now() - wallStart
  console.warn("[llm] all_models_failed", { model: lastModel, latency_ms, error: lastError })
  return { ok: false, error: lastError, model: lastModel, latency_ms }
}

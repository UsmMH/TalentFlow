/** OpenRouter LLM wrapper (PROJECT_SPEC §7.0). Server-only. */

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
const DEFAULT_TIMEOUT_MS = 20_000

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
): Promise<{ data: T; latency_ms: number }> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new Error("Missing OPENROUTER_API_KEY")

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const started = Date.now()

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
        provider: { require_parameters: true },
        response_format: {
          type: "json_schema",
          json_schema: {
            name: jsonSchema.name,
            strict: jsonSchema.strict ?? true,
            schema: jsonSchema.schema,
          },
        },
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

    console.info("[llm] ok", { model: json.model ?? model, latency_ms })
    return { data: parsed, latency_ms }
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
 * Retries once on invalid JSON or timeout (same model, then tries fallbacks).
 * Never logs message content (may contain personal/synthetic free text).
 */
export async function chatJson<T>(opts: {
  messages: ChatMessage[]
  jsonSchema: JsonSchema
  timeoutMs?: number
}): Promise<LlmResult<T>> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const models = modelsToTry()
  let lastError = "LLM failed"
  let lastModel = models[0] ?? "unknown"
  let lastLatency = 0

  for (const model of models) {
    lastModel = model
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { data, latency_ms } = await once<T>(opts.messages, opts.jsonSchema, model, timeoutMs)
        lastLatency = latency_ms
        return { ok: true, data, model, latency_ms }
      } catch (err) {
        lastError = err instanceof Error ? err.message : "LLM failed"
        lastLatency = timeoutMs
        console.warn("[llm] attempt_failed", { model, attempt, error: lastError })
        // retry once on invalid JSON / timeout; then try next model
        if (attempt === 0 && (lastError.includes("Invalid JSON") || lastError.includes("timeout"))) {
          continue
        }
        break
      }
    }
  }

  console.warn("[llm] validation_or_call_failed", { model: lastModel, latency_ms: lastLatency, error: lastError })
  return { ok: false, error: lastError, model: lastModel, latency_ms: lastLatency }
}

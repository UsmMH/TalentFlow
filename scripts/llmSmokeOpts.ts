/** Longer budgets for local OpenRouter smoke scripts (not used by /api interpret). */

export function llmSmokeOpts(): { timeoutMs: number; totalCapMs: number } {
  const timeoutMs = Number(process.env.LLM_SMOKE_ATTEMPT_MS ?? 60_000)
  const totalCapMs = Number(process.env.LLM_SMOKE_TOTAL_CAP_MS ?? 120_000)
  return { timeoutMs, totalCapMs }
}

/** Browser calls to /api/* (Vercel). Optional VITE_API_BASE for split local dev. */
export function apiUrl(path: string): string {
  const base = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, "") ?? ""
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}

export async function postJson<T>(
  path: string,
  body: unknown,
  opts?: { timeoutMs?: number; signal?: AbortSignal },
): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  const timeoutMs = opts?.timeoutMs ?? 20_000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const onAbort = () => controller.abort()
  opts?.signal?.addEventListener("abort", onAbort)

  try {
    const res = await fetch(apiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const json = (await res.json().catch(() => null)) as { ok?: boolean; data?: T; error?: string } | null
    if (!res.ok || !json?.ok) {
      return { ok: false, error: json?.error ?? `HTTP ${res.status}` }
    }
    return { ok: true, data: json.data as T }
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: "timeout" }
    }
    return { ok: false, error: err instanceof Error ? err.message : "Network error" }
  } finally {
    clearTimeout(timer)
    opts?.signal?.removeEventListener("abort", onAbort)
  }
}

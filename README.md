# TalentFlow (تالنت فلو) — BUILDx demo

Behavioral readiness demo: evidence-based profiles, deterministic scoring, AI that **proposes** (human confirms), Individual Development Analysis and a development plan — before a promotion decision.

## Stack
| Layer | Location |
|---|---|
| Frontend | `source/` — Vite + React 19 + Tailwind 4 + HashRouter |
| API | `/api` — Vercel Functions (TypeScript) |
| Engine | `/shared` — pure scoring (no I/O) |
| Database | Supabase (schema + seed in `/supabase`) |
| AI | OpenRouter via `api/_lib/llm.ts` |

## Run locally

**UI only** (engine fallback / local mocks; AI routes return 502 without the API):
```bash
cd source
npm install
npm run dev      # http://localhost:5173 — landing.html / app.html
npm run build
npm test
```

**Full demo (UI + AI + Supabase writes):** two terminals.
```bash
# Terminal 1 — API (repo root). Needs root .env.local (see .env.example)
npx vercel dev --listen 3000

# Terminal 2 — Vite (proxies /api → :3000)
cd source
npm run dev
```

Open e.g. `http://localhost:5173/app.html?device=desktop&lang=ar#/app/behavior`.

Copy env from `.env.example` → root `.env.local`, and `source/.env.example` → `source/.env.local`. Never commit secrets.

Optional: set `ALLOW_DEMO_RESET=true` to enable **Reset demo data** in the app shell (`POST /api/reset-demo`).

## What the demo shows
- **Landing:** product preview, about, pricing by **services per tier** (FlowStart / FlowGrow / FlowScale), not company size.
- **Manager (behavioral primary):** team overview, Ahmad profile/scorecard, collect feedback (AI suggest → confirm), readiness, **analysis & plan** (Generate on click), path / cost / always-on What-if.
- **Employee (Ahmad):** behavioral profile and plan.
- **Secondary:** skills & hiring screens under a collapsed nav group (sample data).
- **Arabic (RTL) default;** English toggle for chrome. **Presentation: rehearse in Arabic.**

## Demo path (Arabic)
1. Team overview → Ahmad profile  
2. Collect feedback → Suggest ratings → Confirm  
3. Readiness  
4. Analysis & plan → **توليد التحليل والخطة** → Approve path  
5. Switch to Employee view  

Scores come from the engine (Ahmed ≈ **79.17**, signal **Develop first**). AI never invents the number.

## Docs
- `PROJECT_SPEC.md` — product, engine, AI, API, phases, **current status**
- `FRONTEND_MAP.md` — frontend audit (Task 0; some notes are historical)

## Notes
- Synthetic demo data only.
- Editable cost assumptions: `source/src/app/lib/assumptions.ts`.
- If `vercel dev` omits Sensitive secrets, `api/_lib/loadLocalEnv.ts` loads missing keys from root `.env.local` in local/dev only.

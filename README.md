# TalentFlow (تالنت فلو) — BUILDx demo

**Status as of 2026-10-06.** Arabic-first behavioral readiness demo for BUILDx. Ready for **presentation rehearsal** on the P0 path; skills/hiring is a light preview only.

---

## One-liner (pitch)

Companies promote high performers into management and then discover the person lacks the **behaviors** the new role needs. TalentFlow builds an evidence-based behavioral profile, compares it to the target role, and produces an explainable **Individual Development Analysis** and **development plan** — *before* the promotion decision.

**Demo hook:** Ahmed is a strong Senior Data Analyst. Promote him to Team Manager without behavioral evidence → team suffers, he fails. TalentFlow shows **Develop first** (not “ready now”) grounded in ratings and gaps — especially **delegation** and a self vs. others **blind spot**.

**Non-negotiable principles (use in slides):**
- AI **proposes**; the **engine calculates**; the **human decides**.
- Output is **readiness signals** (evidence for / against / missing) — never success predictions.
- Observable behaviors only. No personality types. No HR-system scraping. No protected attributes.
- AI-suggested ratings **do not count** until a human confirms them.

---

## What we have today

### Done (demo-ready)

| Area | What exists |
|---|---|
| **Landing** | Product preview, about, pricing by services (FlowStart / FlowGrow / FlowScale). Arabic default, English toggle. CTA → app. |
| **P0 behavioral path** | Full manager + employee flow wired to engine + API + Supabase. |
| **Team home** | `/app` redirects to **لمحة عن الفريق** — KPI tiles + sorted readiness list (not empty KPIs-only). |
| **Employee files & profiles** | List → profile/scorecard with evidence, confidence, blind spots, critical gaps. |
| **Collect feedback** | Rater form; AI interpret → suggested ratings with quotes → human confirm. |
| **Analysis & plan** | Generate **on button click**; reload stored results on enter; path / cost / What-if UI. |
| **Employee view** | Switch “عرض باسم” → أحمد: own behavioral view + plan. |
| **Scoring engine** | Pure functions in `/shared` — Ahmed ≈ **79.17**, signal **Develop first**. UI never invents the %. |
| **API** | readiness, interpret-feedback, ratings-confirm, analysis, plan, health, reset-demo. |
| **i18n / RTL** | Arabic-first chrome; English toggle. Brand wordmark stays **TalentFlow** (Latin); logo icon stays **left** of text even in RTL. |
| **Shell / mobile** | Desktop sidebar; mobile icon nav + compact layout pass. |
| **Demo reset** | Shell button → `POST /api/reset-demo` when `ALLOW_DEMO_RESET=true`. |
| **P2 skills preview** | Collapsed nav **معاينة · مهارات وتوظيف**: ملخص المهارات, ranking, vacancy chain, compare options. Local/sample data only — **not** the demo path. |

### Explicitly light / not the pitch spine

- Skills matching, vacancy chain, compare options, create-role modal → **preview UI + mocks**.
- No real auth, no HR integrations, no attrition/success prediction.
- Production deploy rehearsal + pinned stage fallbacks still the main **next** ops item (see below).

### Recent product decisions (UI)

- Home = behavioral **لمحة عن الفريق**, not skills.
- Skills page title = **ملخص المهارات** (no “صباح الخير، نورة”).
- Critical gap badge copy: **فجوة حرجة**.
- Skills nav lives under preview group; `/app/skills` route.

---

## Recommended Arabic demo path (~8–12 min)

Open: `http://localhost:5173/app.html?lang=ar#/app/behavior`  
(or landing → CTA; full stack needs Vite + `vercel dev` — see Run).

1. **لمحة عن الفريق** — KPIs + who is Ready / Develop / Alternative / Insufficient; open أحمد.
2. **ملف أحمد** — behaviors, evidence, critical gap, blind spot on delegation.
3. **جمع الملاحظات** — paste/use feedback → **اقتراح التقييم** → review quotes → **تأكيد**.
4. **التحليل والخطة** — **توليد التحليل والخطة** → walk narrative + plan; path/cost/What-if.
5. Toggle **عرض باسم → الموظف (أحمد)** — نفس الحقيقة من زاوية الموظف.

**Talking points:** score comes from confirmed ratings via the engine; AI never invents 79%; signal is Develop first because of critical shortfall (delegation), not “bad performer.”

Company framing in UI: demo org **شركة نماء للتقنية** / Namaa Technology; manager persona نورة; protagonist **أحمد**.

---

## App map (routes)

| Route | Role |
|---|---|
| `landing.html` | Marketing / pitch site |
| `#/app` | → redirects to `#/app/behavior` |
| `#/app/behavior` | Team at a glance (home) |
| `#/app/behavior/files` | Employee files |
| `#/app/behavior/rate` | Collect feedback |
| `#/app/behavior/ahmad` | Ahmad profile |
| `#/app/behavior/ahmad/analysis` | Analysis & plan |
| `#/app/me/behavior`, `#/app/me/plan` | Employee view |
| `#/app/skills` | Skills summary (preview) |
| `#/app/roles/senior-data-analyst…` | Ranking / chain / decision (preview) |

---

## Stack

| Layer | Location |
|---|---|
| Frontend | `source/` — Vite + React 19 + Tailwind 4 + HashRouter (`app.html` / `landing.html`) |
| API | `/api` — Vercel Functions (TypeScript) |
| Engine | `/shared` — pure scoring + validation (no I/O) |
| Database | Supabase (`/supabase` schema + seed) |
| AI | OpenRouter via `api/_lib/llm.ts` |

```
Browser ──reads/writes──► Supabase (anon + RLS)
       ──/api/*─────────► Vercel Functions
                              ├── shared/engine
                              ├── Supabase service role
                              └── OpenRouter
```

Secrets stay server-side. Never put LLM or service-role keys in the frontend.

---

## Run locally

**UI only** (engine/local fallbacks; AI routes fail without API):
```bash
cd source
npm install
npm run dev      # http://localhost:5173 — landing.html / app.html
npm run build
npm test
```

**Full demo (UI + AI + Supabase):**
```bash
# Terminal 1 — API (repo root). Needs root .env.local (see .env.example)
npx vercel dev --listen 3000

# Terminal 2 — Vite (proxies /api → :3000)
cd source
npm run dev
```

Env: copy `.env.example` → root `.env.local`, and `source/.env.example` → `source/.env.local`. Never commit secrets.

Optional: `ALLOW_DEMO_RESET=true` enables **إعادة تعيين بيانات العرض** in the shell.

If `vercel dev` omits Sensitive secrets, `api/_lib/loadLocalEnv.ts` fills missing keys from root `.env.local` in local/dev only.

---

## For presentation / next Claude handoff

**Use this README + `PROJECT_SPEC.md` as source of truth.** When asking for slides, script, or pitch polish, state:

1. **Primary story** = behavioral readiness for Team Manager (Ahmed / Develop first / 79.17).
2. **Secondary** = skills & hiring preview (mention in pitch, do not live-demo unless asked).
3. **Language** = rehearse and present in **Arabic**; English is a toggle for judges who prefer it.
4. **Live risks** = OpenRouter latency/cold start on interpret + analysis generate; have a reset path and know the stored analysis reload behavior.
5. **Still open for ops** = production Vercel deploy rehearsal; confirm Arabic generate on the deployed URL; pin fallbacks if needed for stage.

**Do not** present skills screens as the product home. **Do not** claim prediction or automated promotion decisions.

---

## Docs

| File | Use |
|---|---|
| `README.md` (this file) | Current state + demo handoff |
| `PROJECT_SPEC.md` | Product, engine rules, AI schemas, API, phases, decisions log |
| `FRONTEND_MAP.md` | Frontend audit (Task 0; some notes may be historical) |

## Notes

- Synthetic demo data only.
- Editable cost assumptions: `source/src/app/lib/assumptions.ts`.
- Working agreements for agents: prefer polish of the demo path over redesign; see `PROJECT_SPEC.md` §14 and `.cursor/rules`.

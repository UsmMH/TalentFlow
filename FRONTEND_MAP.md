# FRONTEND_MAP.md

Audit of the existing Claude Code frontend (Task 0). No code changes yet.

---

## 1. Stack

| Concern | Choice |
|---|---|
| Framework | **React 19** + TypeScript |
| Build tool | **Vite 8** (`source/vite.config.ts`) |
| Multi-page entries | `landing.html` → landing; `app.html` → app |
| Router | **react-router-dom v7** with **`HashRouter`** (`#/app/...`) |
| State | React Context only (`AppProvider` in `lib/i18n.tsx`; `ExplainProvider` in `ui.tsx`). No Redux/Zustand/TanStack Query. |
| UI | Custom components in `ui.tsx` + **Tailwind CSS v4** (`@tailwindcss/vite`) + **lucide-react** icons |
| Motion | Tiny helpers in `lib/motion.tsx` + `motion.css` (no Framer Motion package) |
| Tests | `npm test` → `node src/app/lib/scoring.test.ts` (assert, no Vitest yet) |
| Backend today | **None.** No `fetch`, no Supabase, no OpenRouter. |

**Repo layout**
- `source/` — editable app
- `site/` — prebuilt static output (landing + app bundles)
- Root: `PROJECT_SPEC.md`, `README.md`, `.cursor/`

---

## 2. How to run / build / test

```bash
cd source
npm install
npm run dev      # Vite; open landing + app HTML entries
npm run build    # → source/dist (landing + app)
npm test         # skills + behavior scoring asserts
```

Live static demo (per README): Netlify URL; upload `site/` as-is.

---

## 3. Language / RTL

| Piece | Behavior |
|---|---|
| Default | **Arabic** (`lang=ar`), `dir=rtl` on `<html>` |
| Toggle | Header button in `Shell.tsx`; landing has its own toggle |
| Query | `?lang=en` forces English |
| Strings | Inline `tr(ar, en)` and `bi({ar,en})` — no i18n library or JSON catalogs |
| Digits | Always Western via `n()` / `toLocaleString("en-US")` |
| Landing | Separate copy object in `Landing.tsx` (not shared with app i18n) |

---

## 4. Direct AI / external API calls

**None.** Grep found no `fetch`, OpenRouter, OpenAI, Anthropic, or Supabase.

Pseudo-AI (client-side only):
- **RateForm** (`Behavior.tsx`): keyword/regex `RULES` + `setTimeout` fake latency
- **CreateRole** (`Manager.tsx`): fake JD → skills extraction from `REQUIREMENTS` after 1.5s
- **Decision** “AI explanation”: static bilingual string + `explainAI()` from `explain.ts`

These must move behind `/api` when wired (spec §7–8).

---

## 5. Mock / hard-coded data (file paths)

| File | Contents |
|---|---|
| `source/src/app/lib/demo-data.ts` | Company, skills, skill requirements, candidates, roles, vacancy chains, employee skill plan, other roles |
| `source/src/app/lib/behavior.ts` | 6 behaviors (one anchor each), Team Manager `ROLE_REQ`, employee ratings, Ahmad evidence quotes, local readiness/what-if scoring |
| `source/src/app/lib/assumptions.ts` | Skill time/cost assumptions + failed-promotion / plan costs |
| `source/src/app/lib/scoring.ts` | Deterministic **skills** match engine (uses demo-data) |
| `source/src/app/lib/explain.ts` | “How calculated?” drawer payloads for skills + assumptions rows |
| `source/src/app/Behavior.tsx` | Hard-coded analysis narrative, cost UI defaults, sample free-text, regex AI rules, employee plan steps in `MyBehavior` |
| `source/src/landing/Landing.tsx` | Pricing, hero copy, sample ranking rows |

---

## 6. Screens → data used → future source

P0 focus in the spec is **behavioral** readiness. Skills / vacancy / decision screens already exist (spec marks them **P2 — do not build**); map them but Phase 1 should not expand them unless asked.

### Shell / chrome

| Screen | File | Data today | Future source |
|---|---|---|---|
| Landing | `landing/Landing.tsx` | Local copy | Keep static (no DB) |
| App shell + Manager/Employee switcher | `Shell.tsx` | Path-based view; bilingual nav | Keep; employee still “Ahmad” for demo (F1) |
| Device / lang | `i18n.tsx`, `App.tsx` PhonePreview | Local state | Keep |

### Manager — skills track (existing UI; P2 in spec)

| Route | Component | Data today | Future source (if ever) |
|---|---|---|---|
| `/app` | `Overview` | `ROLES`, `CANDIDATES`, `options()` | Leave on mocks for demo, **or** later `employees` + skills JSON. Not Phase 1. |
| `/app/roles/new` | `CreateRole` | Fake extract → `REQUIREMENTS` | Out of P0 scope (P2) |
| `/app/roles/senior-data-analyst` | `Ranking` | `CANDIDATES`, `REQUIREMENTS`, `matchScore` | P2 — keep mocks |
| `.../candidates/:id` | `CandidateDetail` | Candidate + `CHAINS` | P2 — keep mocks |
| `.../chain` | `Chain` | `CHAINS` | P2 — keep mocks |
| `.../decision` | `Decision` | `options()`, `approved` context | P2 — keep mocks |

### Manager — behavioral track (P0)

| Route | Component | Data today | Future source |
|---|---|---|---|
| `/app/behavior` | `BehaviorOverview` | `EMPLOYEES` + client `readiness()` | **Read:** `employees` + ratings; **scores:** `POST /api/readiness` (or client call after engine exists). Phase 1: list from `employees`. |
| `/app/behavior/:id` | `BehaviorProfile` | `emp(id)`, `ROLE_REQ`, `AHMAD_EVIDENCE` | **Read:** `employees`, `behaviors`, `role_behavior_requirements`, `behavior_ratings` (+ evidence text); readiness via `/api/readiness`. Phase 1: profile fields from DB. |
| `/app/behavior/ahmad/analysis` | `Analysis` | Hard-coded narrative from `readiness()` + `whatIf` + `PROMOTION_COST` | **Read:** `development_analyses`; generate via `POST /api/analysis`. Cost: `assumptions` + `POST /api/cost` (P1). What-if: `POST /api/whatif` (P1). |
| `/app/behavior/rate` | `RateForm` | Local state; regex “AI”; no persist | **Write:** `feedback_submissions` + `behavior_ratings` (anon insert OK per spec). **AI:** `POST /api/interpret-feedback`. Confirm: `POST /api/ratings/confirm`. |

### Employee view (P0 F10 + leftover skills views)

| Route | Component | Data today | Future source |
|---|---|---|---|
| `/app/me` | `MyReadiness` | Skills: `EMPLOYEE_ID`, `matchScore`, `OTHER_ROLES` | Skills = P2. Prefer behavioral readiness for demo; leave skills mocks or later drop from nav. |
| `/app/me/plan` | `MyPlan` | Skills `PLAN` from demo-data | Behavioral plan: `development_plans` / `POST /api/plan`. Skills plan stays mock if screen kept. |
| `/app/me/behavior` | `MyBehavior` | `emp("ahmad")` + hard-coded plan steps | Same as BehaviorProfile (own employee) + `development_plans` |

---

## 7. Components (shared UI)

File: `source/src/app/ui.tsx`

`Card`, `Btn`, `Skeleton`, `PageTitle`, `StatusBadge`, `CandidateTypeBadge`, `LevelLabel`, `SkillBar`, `ScoreCell`, `KpiTile`, `HowLink`, `FlowChain`, `Dialog`, `ExplainProvider` / explain drawer.

No data fetching; consume props / explain callbacks.

---

## 8. Local scoring vs spec engine (important)

Client engines live in:
- `lib/scoring.ts` — **skills** matching (not in P0 backend)
- `lib/behavior.ts` — **behavior** readiness (must be replaced by `shared/engine.ts` per spec §6)

Differences that affect seed + demo numbers are listed in the Task 0 reply (role requirement swap, self included in score, weights, thresholds, Ahmed scores).

---

## 9. Phase 1 replace targets (read-only)

Without changing markup:

1. `BehaviorOverview` — employee list from `employees`
2. `BehaviorProfile` / `MyBehavior` header — name, title, department from `employees`
3. Optionally behaviors + role requirements from `behaviors` / `role_behavior_requirements` / `roles` (still compute scores client-side until Phase 2)

Leave skills screens on `demo-data.ts` unless the team says otherwise.

# PROJECT_SPEC.md: Behavioral Readiness Platform (working name: TalentFlow)

> **For Cursor:** read this whole file before writing code. The **frontend is already built** (with Claude Code). Your job is to connect it to a real backend (Supabase), add the scoring engine and AI endpoints, and deploy to Vercel. **Do not redesign or restyle the UI.** Items marked **[confirm]** need a decision from the team before you rely on them.

## Contents
1. Product summary
2. Features, sorted by priority
3. Tech stack and architecture
4. Task 0: audit the existing frontend
5. Data model (Supabase)
6. Scoring engine (deterministic rules)
7. AI features (endpoints, schemas, guardrails)
8. API routes
9. Seed data (the demo story)
10. Environment variables and deployment
11. Security and privacy
12. Implementation order
13. Definition of done
14. Working agreements for Cursor
15. Open questions
16. Decisions log

---

## 1. Product summary

**Problem.** Companies promote people on past performance or tenure, but a new role (for example, team manager) needs different **behaviors**. Promotions fail, teams suffer, and the company and the employee both lose.

**Hook (used in the pitch).** Ahmed is skilled and performs well. He is promoted to manager. His team complains, his performance declines, and he is fired. He lost his job even though he did well before.

**Solution.** An AI-assisted platform for **internal employees**. It builds an evidence-based **behavioral profile**, compares it with the behaviors a target role requires, and produces an explainable **Individual Development Analysis** and a **development plan**, *before* the promotion decision.

**Principles (non-negotiable):**
- **AI proposes, the engine calculates, the human decides.** Scores, readiness and cost come from deterministic code. The AI interprets text, explains and plans.
- We output **readiness signals**, never predictions ("evidence for and against, and what is missing", never "78% chance of success").
- Observable behaviors only. No personality types. No inferring behavior from emails or chats. No protected attributes.
- AI-suggested ratings never count until a human confirms them.

**Focus:** the behavioral part is the main spot. Skills, hiring and ROI are secondary and kept minimal.

---

## 2. Features, sorted by priority

### P0: must work in the demo
| ID | Feature | Notes |
|---|---|---|
| F1 | **Demo user switcher** (Manager / Employee view) | No real auth needed for the demo |
| F2 | **Employee list and profile** | Header, compact skills, behavior scores with evidence and confidence |
| F3 | **Behavior rubric** | 6 behaviors, each with anchors at 25/50/75/100, stored in the DB |
| F4 | **Feedback form** | A rater (manager, peer, self) rates behaviors, each rating with a concrete example, plus optional free text |
| F5 | **AI evidence interpretation** | Free text becomes proposed ratings with exact quotes, shown as "AI-suggested" until confirmed |
| F6 | **Behavior scoring** | Combines confirmed ratings into score, confidence and blind-spot flag per behavior (section 6) |
| F7 | **Role behavior requirements and readiness comparison** | Required level, weight, critical flag; readiness signal and match % |
| F8 | **Individual Development Analysis (AI)** | Narrative grounded in the engine output (section 7) |
| F9 | **Development plan (AI)** | Plan items tied to behavior gaps, stored and viewable |
| F10 | **Employee view** | The employee sees their own profile, analysis and plan |

### P1: if time allows
| ID | Feature |
|---|---|
| F11 | **Audit flags** (deterministic): few raters, stale evidence, low confidence, self vs. others gap |
| F12 | **What-if copilot:** a manager asks a question, the AI turns it into engine inputs, the engine reruns, the AI explains the difference |
| F13 | **Cost comparison:** cost of a failed promotion vs. cost of a development plan, with a breakeven percentage (section 6.5) |
| F14 | **Path recommendation view:** ready now / develop first / explore alternative path (already produced by the engine, this is UI polish) |

### P2: only mention in the pitch, do not build
Compact skills matching, external hiring comparison, vacancy chain, decision memo, succession map, attrition or potential prediction, real authentication, integrations with HR systems.

---

## 3. Tech stack and architecture

| Layer | Choice |
|---|---|
| Frontend | Existing app built with Claude Code **[confirm the framework: Vite + React or Next.js, and the router in use]**. Keep it. |
| Backend | **Vercel Functions** in `/api` (TypeScript). If the frontend is Next.js, use its API routes or route handlers instead and keep the same route names. |
| Database | **Supabase** (Postgres) |
| AI | **OpenRouter** behind a small wrapper `api/_lib/llm.ts` (see 7.0) |
| Deployment | **Vercel**, connected to the GitHub repo (do not commit `dist`) |
| Dev tool | Cursor |

```
Browser (existing UI)
   |-- reads/writes simple data ---> Supabase (anon key + RLS)
   |-- calls /api/* --------------> Vercel Functions
                                      |-- shared/engine (pure functions)
                                      |-- Supabase (service role key, server only)
                                      |-- LLM provider (API key, server only)
```

**Rule:** the LLM key and the Supabase service role key must **never** appear in frontend code. If any existing frontend code calls an AI provider directly from the browser, move that call to an `/api` function.

Suggested structure (adapt to what exists):
```
/api                 serverless functions
  /_lib              llm.ts, supabaseAdmin.ts, validate.ts
  readiness.ts  interpret-feedback.ts  analysis.ts  plan.ts  audit.ts  whatif.ts  cost.ts
/shared
  engine.ts          pure scoring functions (no I/O)
  policy.ts          weights, thresholds (editable constants)
  types.ts           shared types
  engine.test.ts     unit tests (Vitest)
/src                 existing frontend
/supabase
  schema.sql  seed.sql
```

---

## 4. Task 0: audit the existing frontend (do this first)

Before changing anything, scan the repo and write `FRONTEND_MAP.md` listing:
1. Framework, build tool, routing, state management, UI library.
2. Every screen and component, and what data each uses.
3. Where mock or hard-coded data lives (file paths).
4. Any direct calls to an AI or external API (these must move to `/api`).
5. Existing language handling (Arabic/English, RTL).

Then **map each screen to a data source** (Supabase table or API route). Replace mock data with real calls **without changing markup or styling**. If a screen needs data the UI doesn't show yet, ask before adding UI.

---

## 5. Data model (Supabase)

Put this in `supabase/schema.sql`.

```sql
create extension if not exists "pgcrypto";

create table employees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  title text,
  department text,
  tenure_months int,
  skills jsonb default '[]',            -- compact, e.g. [{"name":"SQL","level":75}]
  created_at timestamptz default now()
);

create table behaviors (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,              -- 'delegation', 'coaching', ...
  name_en text not null,
  name_ar text,
  description text,
  rubric jsonb not null                  -- {"25":"...","50":"...","75":"...","100":"..."}
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  department text
);

create table role_behavior_requirements (
  role_id uuid references roles(id) on delete cascade,
  behavior_id uuid references behaviors(id),
  required_level int check (required_level in (25,50,75,100)),
  weight numeric not null,               -- weights per role sum to 100
  is_critical boolean default false,
  primary key (role_id, behavior_id)
);

create table feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  rater_type text check (rater_type in ('manager','peer','document','self')) not null,
  rater_name text,
  free_text text,
  submitted_at timestamptz default now()
);

create table behavior_ratings (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references feedback_submissions(id) on delete cascade,
  employee_id uuid references employees(id) on delete cascade,
  behavior_id uuid references behaviors(id),
  level int check (level in (25,50,75,100)),
  example text,                          -- required for human ratings
  source text check (source in ('human','ai_suggested')) default 'human',
  status text check (status in ('pending','confirmed','rejected')) default 'confirmed',
  ai_quote text,                         -- exact substring of free_text
  ai_rationale text,
  created_at timestamptz default now()
);

create table development_analyses (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  role_id uuid references roles(id),
  engine_snapshot jsonb not null,
  narrative jsonb not null,
  language text default 'en',
  model text,
  created_at timestamptz default now()
);

create table development_plans (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  role_id uuid references roles(id),
  items jsonb not null,
  created_at timestamptz default now()
);

create table assumptions (               -- for cost comparison (P1)
  key text primary key,
  value numeric not null,
  label text
);
```

**RLS:** enable it on all tables. For the demo, allow `select` for the anon role on all tables, and do all **writes through `/api`** (service role) except the feedback form, which can insert into `feedback_submissions` and `behavior_ratings` via the anon key. Never expose the service role key to the browser.

---

## 6. Scoring engine (deterministic rules)

Implement as **pure functions** in `shared/engine.ts` with constants in `shared/policy.ts`. All numbers below are **editable policy values**, not scientific constants. The AI never changes them.

### 6.1 Scale
Behavior levels are anchored at **25 / 50 / 75 / 100** (beginner, developing, proficient, exemplary), each with a rubric text. Computed scores are 0 to 100 and may fall between anchors.

### 6.2 Behavior score
Only **confirmed** ratings count (`status = 'confirmed'`).

Source weights: **manager 0.45, peer 0.35, document 0.20.** If several raters share a source (for example, two peers), average them first.
`score = sum(weight_i * source_score_i) / sum(weight_i of available sources)`

**Self ratings are excluded from the score** and used only for blind-spot detection.

### 6.3 Confidence per behavior
- **High:** at least 3 distinct sources (manager, peer, document) or at least 2 sources with 3 or more individual ratings, and the most recent evidence is at most 12 months old.
- **Medium:** 2 sources.
- **Low:** 1 source, or evidence older than 12 months.
- **Not assessed:** no confirmed ratings. This is **not zero**; exclude it from the match and report it as missing evidence.

### 6.4 Blind spot
`gap = self_level - others_score`. If `gap >= 25` flag **overestimates**; if `gap <= -25` flag **underestimates**.

### 6.5 Role readiness
For each required behavior: `fulfilment = min(score / required_level, 1)`, `contribution = fulfilment * weight`.
`role_match = sum(contribution) / sum(weight of assessed behaviors) * 100` (weights of "not assessed" behaviors are excluded from both sums, and `coverage` = assessed weight / total weight is reported).

**Critical behaviors:** if any critical behavior has `score < required_level`, the person cannot be "Ready now".

**Readiness signal** (check in this order):
1. `coverage < 0.5` → **Insufficient evidence**
2. `role_match >= 85` and all critical met and overall confidence is not Low → **Ready now**
3. `role_match >= 60` and every critical shortfall is at most 25 points → **Develop first**
4. otherwise → **Explore alternative path** (for example, a senior specialist track)

Labels are wording for decision support. They are not predictions. The UI must show the evidence behind each one.

### 6.6 Cost comparison (P1)
Using editable `assumptions`:
`breakeven = development_plan_cost / failed_promotion_cost`
Display: "The plan pays off if it prevents a failed promotion in at least X% of cases." This avoids claiming a probability we cannot measure.

### 6.7 Worked example (use as unit test)
Role "Team Manager" requirements:

| Behavior | Required | Weight | Critical |
|---|---|---|---|
| Delegation and trust | 75 | 20 | yes |
| Coaching and feedback | 75 | 20 | no |
| Accountability | 75 | 15 | no |
| Fairness | 75 | 15 | no |
| Conflict handling | 50 | 15 | no |
| Communication | 75 | 15 | no |

**Ahmed's** scores: delegation 50, coaching 50, accountability 100, fairness 75, conflict 25, communication 75.
Contributions: 13.33 + 13.33 + 15 + 15 + 7.5 + 15 = **79.17** → critical shortfall on delegation is 25 → **Develop first**. Self-rating for delegation is 100 against others at 50 → **blind spot (overestimates)**.

Also test: **Sara** (75, 75, 75, 75, 50, 75) → 100 → **Ready now**; **Khaled** (25, 25, 75, 50, 25, 50) → 55.83 → **Explore alternative path**.

---

## 7. AI features

All AI calls run on the server. Use structured JSON output, validate every response, and retry once on invalid JSON. Log model, latency and validation failures.

### 7.0 OpenRouter notes
- Call `POST https://openrouter.ai/api/v1/chat/completions` from `api/_lib/llm.ts` only, with the key in an `Authorization: Bearer` header. The request format is OpenAI-compatible, and the model is chosen with a string such as `provider/model-name`. Read the model from `LLM_MODEL`, never hard-code it.
- **Structured output:** send `response_format: { type: "json_schema", json_schema: {...} }`. Support depends on the model and even on the provider serving it, so set `provider: { require_parameters: true }` to avoid being routed to an endpoint that ignores the schema, and **test the chosen model on every schema before relying on it**. Check the model's page on OpenRouter for structured-output support.
- Keep our own validation (sections 7.2 to 7.4) even when the schema is enforced. The schema checks shape, and our code checks truth (exact quotes, numbers that match the engine snapshot).
- Optionally pass a `models` list as fallbacks (`LLM_FALLBACK_MODELS`) so one provider outage does not break the demo.
- Do not send real personal data to any model. The demo data is synthetic.
- Keep prompts and schemas in one folder (`api/_lib/prompts/`) so they are easy to tune.

### 7.1 Global system rules (include in every prompt)
- You are a decision-support assistant for HR. The human decides.
- Use **only** the data provided. Never invent facts or numbers.
- Describe **readiness signals**, never predictions or probabilities of success.
- Use observable behaviors. No personality typing. No judgments about protected attributes.
- Be specific, balanced and kind. Show evidence for and against.
- Respond in the requested language (`en` or `ar`).

### 7.2 Interpret feedback (F5)
Input: the free text, the behavior list with rubrics. Output:
```ts
type Proposal = {
  behavior_key: string;
  level: 25 | 50 | 75 | 100;
  quote: string;        // must be an EXACT substring of the free text
  rationale: string;    // one or two sentences
}
type InterpretOutput = { proposals: Proposal[] }
```
**Server validation:** drop any proposal whose `behavior_key` is unknown, whose `level` is not allowed, or whose `quote` is not an exact substring of the input text. Save the rest as `source = 'ai_suggested'`, `status = 'pending'`. A manager confirms or rejects each one in the UI.

### 7.3 Individual Development Analysis (F8)
Input: the **engine snapshot** (scores, confidence, blind spots, match, signal, critical gaps) and the employee and role names. Output:
```ts
type Analysis = {
  summary: string;
  strengths: { behavior_key: string; evidence: string }[];
  development_areas: { behavior_key: string; evidence: string; why_it_matters: string }[];
  blind_spots: { behavior_key: string; explanation: string }[];
  readiness_view: {
    signal: 'Ready now' | 'Develop first' | 'Explore alternative path' | 'Insufficient evidence';
    evidence_for: string[];
    evidence_against: string[];
    missing_evidence: string[];
  };
  path_options: { option: string; rationale: string }[];   // includes specialist track where relevant
  caution: string;                                         // reminder that a human decides
}
```
**Server validation:** `signal` must equal the engine's signal. Every `behavior_key` must exist in the snapshot. Any number quoted in text must match the snapshot (check with a regex pass). Otherwise retry once, then fall back to a template-based analysis built directly from the snapshot.

### 7.4 Development plan (F9)
Input: the analysis and development areas. Output:
```ts
type Plan = { items: {
  behavior_key: string;
  type: 'stretch_assignment' | 'mentoring' | 'course' | 'practice';
  title: string;
  description: string;
  duration_weeks: number;
  success_evidence: string;   // what new evidence would show progress
}[] }
```
Progress must come from **new evidence** (new ratings), never from "completed a course".

### 7.5 What-if (F12, P1)
Step 1: the LLM converts the question into overrides: `{ overrides: [{ behavior_key, new_score }] | [{ assumption_key, value }] }` (validated). Step 2: the engine reruns with the overrides. Step 3: the LLM explains the difference between the two snapshots. Show the inputs used.

### 7.6 Demo safety
Pre-generate and store the analysis and plan for the three seed employees (`development_analyses`, `development_plans`). If a live call fails or exceeds 15 seconds, show the stored version with a small "saved result" note.

---

## 8. API routes

| Route | Method | Purpose | AI? |
|---|---|---|---|
| `/api/readiness` | POST `{employee_id, role_id}` | Run the engine, return the snapshot | No |
| `/api/interpret-feedback` | POST `{submission_id}` | Propose ratings from free text | Yes |
| `/api/ratings/confirm` | POST `{rating_id, action}` | Confirm or reject an AI-suggested rating | No |
| `/api/analysis` | POST `{employee_id, role_id, language}` | Generate and store the analysis | Yes |
| `/api/plan` | POST `{employee_id, role_id, language}` | Generate and store the plan | Yes |
| `/api/audit` | GET `?employee_id=` | Deterministic flags (P1) | No |
| `/api/whatif` | POST `{employee_id, role_id, question}` | What-if (P1) | Yes |
| `/api/cost` | POST `{...}` | Cost comparison and breakeven (P1) | No |

Return `{ ok: boolean, data?, error? }` consistently. Validate all inputs.

---

## 9. Seed data (the demo story)

Create `supabase/seed.sql` with:
- **6 behaviors** with Arabic and English names and rubrics: Delegation and trust, Coaching and feedback, Accountability, Fairness, Conflict handling, Communication.
- **Role:** Team Manager, with the requirements from 6.7.
- **Employees:** Ahmed (Senior Data Analyst), Sara (Senior Business Analyst), Khaled (Senior Developer), plus 3 filler employees.
- **Submissions and ratings** for Ahmed, Sara and Khaled that reproduce the scores in 6.7, including a self submission where Ahmed rates delegation at 100.
- **Free-text feedback for Ahmed** to feed the AI. Use text like this, so the exact-quote validation has something to match:

> Manager: "Ahmed delivers excellent analysis and rarely misses a deadline. When team members hand in their work, he often redoes it himself overnight instead of giving feedback. He took ownership when the dashboard failed last quarter."
>
> Peer: "Great to work with on technical problems. In a disagreement about priorities he went quiet and the issue stayed unresolved for weeks."

Expected AI proposals: delegation about 50 (quote "redoes it himself overnight"), accountability about 100 (quote "took ownership when the dashboard failed"), conflict handling about 25 (quote "went quiet and the issue stayed unresolved").

- **Assumptions** for the cost comparison (clearly labelled as sample estimates).
- Store pre-generated analyses and plans for the three employees (7.6).

All data is **synthetic**. Say so in the UI footer or demo notes.

---

## 10. Environment variables and deployment

| Variable | Where | Public? |
|---|---|---|
| `VITE_SUPABASE_URL` (or the framework's equivalent) | Frontend | Yes |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Yes (protected by RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | `/api` only | **No** |
| `SUPABASE_URL` | `/api` | No |
| `OPENROUTER_API_KEY` | `/api` only | **No** |
| `LLM_MODEL`, `LLM_FALLBACK_MODELS` (optional) | `/api` only | No |

**Vercel:**
1. Push the repo to GitHub and import it in Vercel. Vercel builds it, so **do not commit `dist`**.
2. Add the environment variables in the Vercel project settings (Production and Preview).
3. For a client-side-routed SPA, add `vercel.json` so deep links work and `/api` is excluded:
```json
{ "rewrites": [{ "source": "/((?!api/).*)", "destination": "/index.html" }] }
```
4. Use a cheaper model while developing and the best one for demo day. Check rate limits beforehand.

---

## 11. Security and privacy

- No secrets in the frontend or in the repo. Add `.env*` to `.gitignore`.
- Synthetic data only. No real employee data in the demo.
- Do not store or use protected attributes in scoring.
- Employees can see their own profile and plan (F10).
- Every AI output is labelled as AI-generated, and every AI-suggested rating is labelled until confirmed.
- Treat user-entered text as untrusted when building prompts (keep it separate from instructions).

---

## 12. Implementation order

| Phase | Work | Done when |
|---|---|---|
| 0 | Task 0 audit and `FRONTEND_MAP.md`; create Supabase project; run `schema.sql` | Map committed, tables exist |
| 1 | Seed data; Supabase client in the frontend; replace mock data for the employee list and profile (read-only) | Profile screens show DB data |
| 2 | `shared/engine.ts` with unit tests; `/api/readiness`; connect the readiness view | Ahmed = 79.17, Develop first; Sara and Khaled tests pass |
| 3 | Feedback form writes ratings; `/api/interpret-feedback` with quote validation; confirm and reject UI | Ahmed's free text produces valid pending proposals |
| 4 | `/api/analysis` and `/api/plan` with validation and fallback; store results | Analysis and plan render for all three employees |
| 5 | Employee view; Arabic/English handling for AI output | Employee sees own plan |
| 6 | P1 as time allows, in order: audit flags, cost comparison, what-if | Each behind its own route |
| 7 | Deploy to Vercel; test on the deployed URL; rehearse the demo path; confirm stored fallbacks | Full demo passes on production |

---

## 13. Definition of done

- [ ] The full demo path works on the deployed URL: profile → feedback → AI interpretation → confirm → readiness → analysis → plan → employee view.
- [ ] Engine unit tests pass for Ahmed, Sara and Khaled.
- [ ] AI outputs are validated, and the fallback works when the AI call fails.
- [ ] No secret appears in frontend code or the Git history.
- [ ] Every score has a "how was this calculated?" path.
- [ ] No loading state hangs for more than 15 seconds.
- [ ] Demo data is labelled synthetic.

---

## 14. Working agreements for Cursor

- Make small, focused changes and commit often. Explain what you changed.
- Do not change the UI design, layout or copy unless asked.
- Keep engine code pure and tested. No I/O in `shared/`.
- Prefer simple solutions. Do not add libraries without saying why.
- When something is ambiguous, ask rather than guess.
- Never let the AI compute or override a score. It only reads, explains and plans.
- Before finishing a task, run the type check, the tests and a build.
- **Precedence:** if a general minimalism rule (for example YAGNI-style rules) conflicts with this file, **this file wins**. Minimalism applies to extra features and abstractions, never to the engine unit tests, AI output validation, the stored fallbacks, or the security rules above.
- Rule files must be `.mdc` files in `.cursor/rules/`. Keep them short.

---

## 16. Decisions log

Recorded during Phase 0 / Phase 1 kickoff:

1. **Scoring truth:** PROJECT_SPEC §6 wins. Ahmed = **79.17** / **Develop first**. Seed and UI must match. Scores are never hard-coded in the UI; they are computed from confirmed ratings.
2. **Skills screens:** stay on local mocks, labelled as sample data. Do not wire them to Supabase for the hackathon.
3. **Supabase credentials:** the team creates the project and puts `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in `source/.env.local`. Never commit secrets. Service role key is server-only (Phase 2+).
4. **Language:** Arabic default, English toggle. AI output follows the current UI language. Seed free-text feedback in **both** Arabic and English.
5. **Repo layout:** `/api`, `/shared`, `/supabase` at repo root; Vite app stays in `source/`.
6. **Vercel:** build from `source` → `source/dist`. `/` → landing (`landing.html`), `/app.html` → app. Leave `/api/*` alone. **No** SPA catch-all rewrite (HashRouter). Keep `site/` until Vercel builds correctly, then remove it from tracking.
7. **Slugs:** `employees.slug` and `roles.slug` so routes like `ahmad` keep working.
8. **Rubrics:** full 25/50/75/100 anchors in the DB; the UI may keep showing one line (the 75 anchor).
9. **Phase 3 note (exact-quote check):** before comparing AI `quote` to free text, normalize Arabic on both sides (strip diacritics, unify alef variants, remove tatweel, collapse whitespace).

---

## 15. Open questions

1. ~~Which framework…~~ → **Vite + React** (`source/`). Mocks: `demo-data.ts` (skills), `behavior.ts` / Supabase (behavioral).
2. Which OpenRouter model(s) will we use, do they support structured outputs for our schemas, and what are the cost and rate limits?
3. Final list of 6 behaviors and their rubric wording (to review with the mentors). Seeded draft is in `supabase/seed.sql`.
4. ~~Arabic, English or both…~~ → **Both**; Arabic default; AI follows UI language.
5. ~~Is real authentication needed…~~ → **Demo switcher is enough** for the hackathon.
6. Final project name.

-- TalentFlow schema (PROJECT_SPEC §5 + slug columns for existing routes)
create extension if not exists "pgcrypto";

create table employees (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  full_name_en text not null,
  full_name_ar text,
  title_en text,
  title_ar text,
  department_en text,
  department_ar text,
  tenure_months int,
  skills jsonb default '[]',
  created_at timestamptz default now()
);

create table behaviors (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  name_en text not null,
  name_ar text,
  description text,
  -- Full anchors: {"25":{"en":"...","ar":"..."}, "50":{...}, "75":{...}, "100":{...}}
  rubric jsonb not null
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title_en text not null,
  title_ar text,
  department_en text,
  department_ar text
);

create table role_behavior_requirements (
  role_id uuid references roles(id) on delete cascade,
  behavior_id uuid references behaviors(id),
  required_level int check (required_level in (25, 50, 75, 100)),
  weight numeric not null,
  is_critical boolean default false,
  primary key (role_id, behavior_id)
);

create table feedback_submissions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  rater_type text check (rater_type in ('manager', 'peer', 'document', 'self')) not null,
  rater_name text,
  free_text text,
  language text check (language in ('en', 'ar')) default 'en',
  submitted_at timestamptz default now()
);

create table behavior_ratings (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid references feedback_submissions(id) on delete cascade,
  employee_id uuid references employees(id) on delete cascade,
  behavior_id uuid references behaviors(id),
  level int check (level in (25, 50, 75, 100)),
  example text,
  source text check (source in ('human', 'ai_suggested')) default 'human',
  status text check (status in ('pending', 'confirmed', 'rejected')) default 'confirmed',
  ai_quote text,
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
  language text default 'en',
  created_at timestamptz default now()
);

create table assumptions (
  key text primary key,
  value numeric not null,
  label text
);

-- RLS: anon can read everything; writes for feedback tables only (demo).
-- Service-role writes for other tables go through /api (Phase 2+).
alter table employees enable row level security;
alter table behaviors enable row level security;
alter table roles enable row level security;
alter table role_behavior_requirements enable row level security;
alter table feedback_submissions enable row level security;
alter table behavior_ratings enable row level security;
alter table development_analyses enable row level security;
alter table development_plans enable row level security;
alter table assumptions enable row level security;

create policy "anon_select_employees" on employees for select to anon using (true);
create policy "anon_select_behaviors" on behaviors for select to anon using (true);
create policy "anon_select_roles" on roles for select to anon using (true);
create policy "anon_select_role_reqs" on role_behavior_requirements for select to anon using (true);
create policy "anon_select_submissions" on feedback_submissions for select to anon using (true);
create policy "anon_select_ratings" on behavior_ratings for select to anon using (true);
create policy "anon_select_analyses" on development_analyses for select to anon using (true);
create policy "anon_select_plans" on development_plans for select to anon using (true);
create policy "anon_select_assumptions" on assumptions for select to anon using (true);

create policy "anon_insert_submissions" on feedback_submissions for insert to anon with check (true);
create policy "anon_insert_ratings" on behavior_ratings for insert to anon with check (true);

grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert on feedback_submissions, behavior_ratings to anon, authenticated;

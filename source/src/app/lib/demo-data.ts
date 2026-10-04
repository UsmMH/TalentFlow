// Single source of truth for the demo. Fictional company, fictional people.
export type B = { ar: string; en: string }
export const b = (ar: string, en: string): B => ({ ar, en })

export type SkillId = "sql" | "powerbi" | "python" | "stats" | "comm"
export const SKILLS: Record<SkillId, B> = {
  sql: b("إس كيو إل", "SQL"),
  powerbi: b("باور بي آي", "Power BI"),
  python: b("بايثون", "Python"),
  stats: b("الإحصاء", "Statistics"),
  comm: b("التواصل", "Communication"),
}

export const COMPANY = b("شركة نماء للتقنية", "Nama Technology Co.")

export type Req = { skill: SkillId; required: number; weight: number; critical: boolean }
export const REQUIREMENTS: Req[] = [
  { skill: "sql", required: 75, weight: 30, critical: true },
  { skill: "powerbi", required: 75, weight: 25, critical: false },
  { skill: "python", required: 50, weight: 20, critical: true },
  { skill: "stats", required: 75, weight: 15, critical: false },
  { skill: "comm", required: 50, weight: 10, critical: false },
]

export type Source = "test" | "projects" | "manager" | "cert" | "cv"
export type Evidence = Partial<Record<Source, number>>
export const SOURCE_NAME: Record<Source, B> = {
  test: b("اختبار", "Test"),
  projects: b("مشاريع", "Projects"),
  manager: b("تقييم المدير", "Manager rating"),
  cert: b("شهادة", "Certificate"),
  cv: b("سيرة ذاتية", "CV"),
}
export const SOURCE_DATE: Record<Source, string> = {
  test: "2026-06", projects: "2026-05", manager: "2026-08", cert: "2025-11", cv: "2026-09",
}

export type Candidate = {
  id: string
  name: B
  type: "internal" | "external"
  currentRole: B
  confidence: "high" | "low"
  evidence: Record<SkillId, Evidence | null>
  /** Who/what fills the vacancy this move leaves (internal only) */
  backfill?: "junior" | "dataEngineer"
  impact: "low" | "high" | "none"
}

// For CV-only / uniform candidates every source reports the same level.
const u = (n: number, srcs: Source[] = ["test", "manager"]): Evidence =>
  Object.fromEntries(srcs.map((s) => [s, n]))
const cv = (n: number): Evidence => ({ cv: n })

export const CANDIDATES: Candidate[] = [
  {
    id: "ahmad", name: b("أحمد العتيبي", "Ahmad Al-Otaibi"), type: "internal",
    currentRole: b("أخصائي تقارير", "Reporting Specialist"), confidence: "high",
    evidence: {
      sql: { test: 82, projects: 75, manager: 75, cert: 50 },
      powerbi: { projects: 55, manager: 50 },
      python: { test: 55, projects: 50 },
      stats: { test: 78, manager: 75 },
      comm: { manager: 50 },
    },
    backfill: "junior", impact: "low",
  },
  {
    id: "sara", name: b("سارة القحطاني", "Sara Al-Qahtani"), type: "internal",
    currentRole: b("مهندسة بيانات", "Data Engineer"), confidence: "high",
    evidence: { sql: u(100), powerbi: u(75), python: u(75), stats: u(75), comm: u(25) },
    backfill: "dataEngineer", impact: "high",
  },
  {
    id: "faisal", name: b("فيصل الدوسري", "Faisal Al-Dosari"), type: "external",
    currentRole: b("متقدم خارجي", "External applicant"), confidence: "low",
    evidence: { sql: cv(75), powerbi: cv(50), python: cv(50), stats: cv(75), comm: null },
    impact: "none",
  },
  {
    id: "lina", name: b("لينا الحربي", "Lina Al-Harbi"), type: "external",
    currentRole: b("متقدمة خارجية", "External applicant"), confidence: "low",
    evidence: { sql: cv(75), powerbi: cv(75), python: cv(25), stats: cv(50), comm: cv(50) },
    impact: "none",
  },
]

// Long-name layout test: open the ranking with ?demo=long
export const LONG_NAME_CANDIDATE: Candidate = {
  ...CANDIDATES[2], id: "long",
  name: b("عبدالرحمن بن عبدالعزيز الشهراني", "Abdulrahman bin Abdulaziz Al-Shahrani"),
}

export type Role = { id: string; title: B; dept: B; status: B; statusTone: "review" | "draft" | "done"; topMatch: number | null }
export const ROLES: Role[] = [
  { id: "senior-data-analyst", title: b("محلل بيانات أول", "Senior Data Analyst"), dept: b("قسم التحليلات", "Analytics"), status: b("قيد المراجعة", "In review"), statusTone: "review", topMatch: null },
  { id: "product-designer", title: b("مصمم منتجات", "Product Designer"), dept: b("قسم المنتج", "Product"), status: b("مسودة", "Draft"), statusTone: "draft", topMatch: null },
  { id: "cloud-engineer", title: b("مهندس حلول سحابية", "Cloud Engineer"), dept: b("قسم البنية التحتية", "Infrastructure"), status: b("مكتمل", "Completed"), statusTone: "done", topMatch: 90 },
]

// Vacancy chains (flow line, first node gets the Mint dot)
export type ChainNode = { title: B; sub: B }
export const CHAINS: Record<"ahmad" | "sara", { nodes: ChainNode[]; impact: "low" | "high"; summary: B }> = {
  ahmad: {
    impact: "low",
    nodes: [
      { title: b("محلل بيانات أول", "Senior Data Analyst"), sub: b("ينتقل إليه أحمد · 92%", "Ahmad moves in · 92%") },
      { title: b("أخصائي تقارير", "Reporting Specialist"), sub: b("شاغرة · يغطيها خالد · 88%", "Vacant · Khalid covers · 88%") },
      { title: b("محلل تقارير مبتدئ", "Junior Reporting Analyst"), sub: b("شاغرة · توظيف خارجي سهل", "Vacant · easy external hire") },
    ],
    summary: b("انتقال أحمد له بديل داخلي (خالد 88%)، وتنتهي السلسلة بوظيفة مبتدئة يسهل توظيفها.", "Ahmad's role has an internal cover (Khalid 88%), and the chain ends at a junior role that is easy to hire."),
  },
  sara: {
    impact: "high",
    nodes: [
      { title: b("محلل بيانات أول", "Senior Data Analyst"), sub: b("تنتقل إليه سارة · 95%", "Sara moves in · 95%") },
      { title: b("مهندس بيانات", "Data Engineer"), sub: b("شاغرة · لا يوجد بديل داخلي (أعلى مرشح 58%)", "Vacant · no internal cover (top candidate 58%)") },
    ],
    summary: b("انتقال سارة يترك مهندس بيانات بلا بديل داخلي؛ التوظيف الخارجي يستغرق نحو 14 أسبوعاً.", "Sara's move leaves Data Engineer without an internal cover; an external hire takes about 14 weeks."),
  },
}

// ---- Employee (view as Ahmad) ----
export const EMPLOYEE_ID = "ahmad"
export const OTHER_ROLES = [
  { title: b("مطوّر ذكاء الأعمال", "BI Developer"), readiness: 78 },
  { title: b("مهندس بيانات", "Data Engineer"), readiness: 61 },
]
export type PlanStep = { id: string; title: B; duration: B | null; status: "progress" | "todo" | "locked" }
export const PLAN: PlanStep[] = [
  { id: "course", title: b("دورة \"باور بي آي المتقدم\"", "Course: Advanced Power BI"), duration: b("3 أسابيع", "3 weeks"), status: "progress" },
  { id: "project", title: b("مشروع تطبيقي: لوحة مبيعات ربع سنوية", "Applied project: quarterly sales dashboard"), duration: b("أسبوع", "1 week"), status: "todo" },
  { id: "test", title: b("اختبار عملي باور بي آي", "Practical Power BI test"), duration: null, status: "locked" },
]

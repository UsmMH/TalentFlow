import { useEffect, useState } from "react"
import { Num, Reveal } from "../app/lib/motion"

type Lang = "ar" | "en"

const copy = {
  ar: {
    nav: ["الرئيسية", "عن المنصة", "الأسعار"],
    pricingTitle: "الأسعار حسب الخدمات",
    pricingSub: "اختر مستوى الخدمات الذي يناسبك. جميع الباقات تبدأ بتجربة مجانية لمدة 3 أشهر، دون بطاقة دفع.",
    trial: "تجربة مجانية 3 أشهر",
    perMonth: "ريال / شهر",
    from: "من",
    pricingNote: "أسعار تجريبية للعرض. تُحدَّد الأسعار النهائية مع كل شركة.",
    trialCta: "ابدأ التجربة المجانية",
    plans: [
      { name: "فلو انطلاقة", size: "الملف السلوكي والجاهزية الأساسية", price: "1,500", features: ["الملف السلوكي لكل موظف", "نموذج دور واحد جاهز", "شرح «كيف حُسب؟» لكل رقم", "خطة تطوير للموظف"] },
      { name: "فلو نمو", size: "جاهزية الدور وقرارات الترقية", price: "4,500", tag: "الأنسب لمعظم الشركات", features: ["كل ما في فلو انطلاقة", "أدوار غير محدودة", "كشف النقاط العمياء بين الرأيين", "مقارنة تكلفة الترقية الفاشلة بخطة التطوير"] },
      { name: "فلو توسّع", size: "حوكمة وتقييم متعدد المقيّمين", price: "9,500", from: true, features: ["كل ما في فلو نمو", "تقييم من عدة مقيّمين على نطاق واسع", "تسجيل المراجعات والتدقيق", "دعم مخصص للموارد البشرية"] },
    ],
    h1: ["ابحث في الداخل أولاً عن ", "موهبتك القادمة"],
    sub: "قارن موظفيك بالمتقدمين الخارجيين، وافهم أثر كل نقل قبل أن تقرر.",
    cta: "جرّب العرض",
    cta2: "كيف نحسب الأرقام؟",
    switchTo: "الإنجليزية",
    rankTitle: "ترتيب المرشحين · محلل بيانات أول",
    rows: [
      { name: "سارة", tag: "داخلي", score: 96, status: "met", conf: "ثقة عالية", note: "أثر مرتفع على القسم", noteTone: "amber" },
      { name: "أحمد", tag: "داخلي · موصى به", score: 92, status: "met", conf: "ثقة عالية", note: "يغطيها خالد 88%", noteTone: "green", hl: true },
      { name: "متقدم خارجي", tag: "سيرة ذاتية", score: 78, status: "met", conf: "ثقة منخفضة", note: "لا يوجد أثر داخلي", noteTone: "gray", low: true },
    ],
    met: "متحقق",
    how: "كيف حُسبت هذه الأرقام؟",
    sample: "بيانات تجريبية",
    aboutTitle: "عن تالنت فلو",
    aboutText:
      "نساعد المنظمات على اكتشاف المواهب داخلها قبل أن تبحث خارجها، بقرارات مفسّرة تراعي أثر كل نقل على المنظمة كلها.",
    principles: [
      ["كل رقم مفسَّر", "Explainable", "كل درجة لها صفحة كيف حُسبت، بأدلتها وأوزانها المعلنة", "doc"],
      ["الدليل أولاً", "Evidence first", "الدرجة لا ترتفع بإنهاء دورة، بل بدليل جديد على المهارة", "check"],
      ["المنظمة ككل", "The whole organization", "أفضل قرار ليس دائماً أعلى درجة، بل أقل ضرر على المنظمة", "nodes"],
      ["الإنسان يقرّر", "Humans decide", "النظام يشرح ويوصي، والمدير هو من يعتمد القرار", "user"],
    ],
    stats: [
      ["25/50/75/100", "سلّم مهارات واضح"],
      ["1–2", "خطوات في سلسلة الشواغر"],
      ["100%", "قرار بشري"],
    ],
  },
  en: {
    nav: ["Home", "About", "Pricing"],
    pricingTitle: "Pricing by services",
    pricingSub: "Pick the service level that fits you. Every plan starts with a free 3-month trial. No payment card needed.",
    trial: "3-month free trial",
    perMonth: "SAR / month",
    from: "From",
    pricingNote: "Sample prices for the demo. Final pricing is set with each company.",
    trialCta: "Start the free trial",
    plans: [
      { name: "FlowStart", size: "Behavioral profiles & core readiness", price: "1,500", features: ["A behavioral profile for every employee", "One ready-made role model", "A \"How is this calculated?\" page for every number", "A development plan for the employee"] },
      { name: "FlowGrow", size: "Role readiness & promotion decisions", price: "4,500", tag: "Best fit for most companies", features: ["Everything in FlowStart", "Unlimited roles", "Blind-spot detection between self-view and others' view", "Failed-promotion cost vs. development-plan cost"] },
      { name: "FlowScale", size: "Governance & multi-rater at scale", price: "9,500", from: true, features: ["Everything in FlowGrow", "Multi-rater evaluation at scale", "Review log and audit trail", "Dedicated HR support"] },
    ],
    h1: ["Look inside first for ", "your next hire"],
    sub: "Compare your employees with external applicants, and understand what each move does before you decide.",
    cta: "Try the demo",
    cta2: "How do we calculate?",
    switchTo: "عربي",
    rankTitle: "Candidate ranking · Senior Data Analyst",
    rows: [
      { name: "Sara", tag: "Internal", score: 96, status: "met", conf: "High confidence", note: "High impact on department", noteTone: "amber" },
      { name: "Ahmed", tag: "Internal · Recommended", score: 92, status: "met", conf: "High confidence", note: "Khaled covers 88%", noteTone: "green", hl: true },
      { name: "External applicant", tag: "CV only", score: 78, status: "met", conf: "Low confidence", note: "No internal impact", noteTone: "gray", low: true },
    ],
    met: "Met",
    how: "How were these numbers calculated?",
    sample: "Sample data",
    aboutTitle: "About TalentFlow",
    aboutText:
      "We help organizations find the talent they already have before looking outside, with explained decisions that weigh what every move does to the whole organization.",
    principles: [
      ["Explainable", "كل رقم مفسَّر", "Every score has a page showing how it was calculated, with its evidence and declared weights.", "doc"],
      ["Evidence first", "الدليل أولاً", "A score doesn't rise by finishing a course, only by new evidence of the skill.", "check"],
      ["The whole organization", "المنظمة ككل", "The best decision isn't always the highest score, but the least harm to the organization.", "nodes"],
      ["Humans decide", "الإنسان يقرّر", "The system explains and recommends; the manager approves the decision.", "user"],
    ],
    stats: [
      ["25/50/75/100", "A clear skill scale"],
      ["1–2", "Steps in the vacancy chain"],
      ["100%", "Human decision"],
    ],
  },
}

const paths: Record<string, string> = {
  doc: "M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5",
  check: "M5 12l5 5 9-10",
  nodes: "M12 7L6 17M12 7l6 10M6 17h12",
  user: "M12 4a4 4 0 110 8 4 4 0 010-8M4 21c0-4 3.5-6 8-6s8 2 8 6",
}
const Icon = ({ n, size = 20 }: { n: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={paths[n]} />
    {n === "nodes" && [[12, 6], [6, 17], [18, 17]].map(([x, y]) => <circle key={x} cx={x} cy={y} r="2.5" fill="currentColor" />)}
  </svg>
)

/** Icon: two nodes joined by a flow line. Mint node = destination. */
const LogoIcon = () => (
  <svg width="42" height="40" viewBox="50 50 640 610" aria-hidden="true">
    <path className="logo-draw" pathLength="1" d="M178 532 C300 532 330 440 355 340 C375 250 430 190 566 174" fill="none" stroke="#073B2E" strokeWidth="140" strokeLinecap="round" />
    <circle className="logo-dot" cx="178" cy="532" r="120" fill="#073B2E" />
    <circle className="logo-dot b" cx="566" cy="174" r="120" fill="#3DDC97" />
  </svg>
)

type Device = "desktop" | "mobile"
const qs = new URLSearchParams(window.location.search)
const embed = qs.has("embed")

function DeviceToggle({ lang, on, onChange }: { lang: Lang; on: Device; onChange: (d: Device) => void }) {
  return (
    <div className="seg" role="group" aria-label={lang === "ar" ? "نوع الجهاز" : "Device"}>
      <button className={on === "desktop" ? "on" : ""} onClick={() => onChange("desktop")}>{lang === "ar" ? "سطح المكتب" : "Desktop"}</button>
      <button className={on === "mobile" ? "on" : ""} onClick={() => onChange("mobile")}>{lang === "ar" ? "الجوال" : "Mobile"}</button>
    </div>
  )
}

export default function Landing() {
  const [lang, setLang] = useState<Lang>(qs.get("lang") === "en" ? "en" : "ar")
  const [device, setDevice] = useState<Device>(qs.get("device") === "mobile" ? "mobile" : "desktop")
  const t = copy[lang]
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"
    document.title = lang === "ar" ? "تالنت فلو" : "TalentFlow"
  }, [lang])

  // Mobile preview = this page in a 390px iframe, so the real responsive CSS applies.
  if (device === "mobile" && !embed)
    return (
      <div className="phone-stage">
        <DeviceToggle lang={lang} on="mobile" onChange={setDevice} />
        <iframe title="mobile" src={`landing.html?embed=1&lang=${lang}&device=mobile`} className="phone" />
      </div>
    )

  return (
    <>
      <header className="hero" id="top">
        <nav className="nav">
          <a href="#top" className="logo" aria-label={lang === "ar" ? "تالنت فلو" : "TalentFlow"}>
            <LogoIcon />
            <span className={lang === "ar" ? "logo-ar" : "logo-word"}>{lang === "ar" ? "تالنت فلو" : "TalentFlow"}</span>
          </a>
          <div className="nav-links">
            <a href="#top">{t.nav[0]}</a>
            <a href="#about">{t.nav[1]}</a>
            <a href="#pricing">{t.nav[2]}</a>
          </div>
          {!embed && <DeviceToggle lang={lang} on={device} onChange={setDevice} />}
          <button className="lang" onClick={() => setLang(lang === "ar" ? "en" : "ar")}>{t.switchTo}</button>
        </nav>

        <div className="hero-grid">
          <div className="hero-text">
            <h1>
              {t.h1[0]}
              <span className="accent">{t.h1[1]}</span>
            </h1>
            <p className="sub">{t.sub}</p>
            <div className="actions">
              <a href={`app.html?device=${device}&lang=${lang}#/app`} className="btn primary">{t.cta}</a>
              <a href="#about" className="btn outline">{t.cta2}</a>
            </div>
          </div>

          <div className="card rank" id="ranking">
            <div className="rank-head">
              <b>{t.rankTitle}</b>
              <span className="muted">{t.sample}</span>
            </div>
            {t.rows.map((r) => (
              <div key={r.name} className={`row ${r.hl ? "hl" : ""}`}>
                <div className="who">
                  <b>{r.name}</b>
                  <span className="muted">{r.tag}</span>
                </div>
                <b className="score">{r.score}%</b>
                <div className="badges">
                  <span className="pill met">
                    <Icon n="check" size={12} />
                    {t.met}
                  </span>
                  <span className={`pill ${r.low ? "dashed" : "plain"}`}>{r.conf}</span>
                  <span className={`pill ${r.noteTone}`}>{r.note}</span>
                </div>
              </div>
            ))}
            <a href="#about" className="how">{t.how}</a>
          </div>
        </div>
      </header>

      <section className="about" id="about">
        <Reveal><h2>{t.aboutTitle}</h2></Reveal>
        <Reveal delay={100}><p className="mission">{t.aboutText}</p></Reveal>
        <div className="principles">
          {t.principles.map(([title, alt, body, ic], i) => (
            <Reveal key={title} delay={i * 100} className="pr-wrap"><div className={`card pr ${i === 3 ? "inv" : ""}`}>
              <span className="ic"><Icon n={ic} /></span>
              <h3>{title}</h3>
              {lang === "en" && <span className="alt">{alt}</span>}
              <p>{body}</p>
            </div></Reveal>
          ))}
        </div>
        <div className="stats">
          {t.stats.map(([n, l]) => (
            <Reveal key={n} delay={150}>
              <b><bdi dir="ltr"><Num text={n} /></bdi></b>
              <span>{l}</span>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="pricing" id="pricing">
        <Reveal><h2>{t.pricingTitle}</h2></Reveal>
        <Reveal delay={100}><p className="mission">{t.pricingSub}</p></Reveal>
        <div className="plans">
          {t.plans.map((p, i) => (
            <Reveal key={p.name} delay={i * 100} className="pr-wrap">
              <div className={`card plan ${i === 1 ? "feat" : ""}`}>
                <div className="plan-top">
                  <b className="plan-name">{p.name}</b>
                  {"tag" in p && p.tag ? <span className="plan-tag">{p.tag}</span> : <span />}
                </div>
                <span className="muted">{p.size}</span>
                <div className="plan-price">
                  {"from" in p && p.from && <span className="muted">{t.from}</span>}
                  <b><bdi dir="ltr"><Num text={p.price} /></bdi></b>
                  <span className="muted">{t.perMonth}</span>
                </div>
                <span className="pill green"><Icon n="check" size={12} />{t.trial}</span>
                <ul>{p.features.map((f) => <li key={f}><Icon n="check" size={16} />{f}</li>)}</ul>
                <a href={`app.html?device=${device}&lang=${lang}#/app`} className={`btn ${i === 1 ? "primary" : "outline"}`}>{t.trialCta}</a>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="muted plan-note">{t.pricingNote}</p>
      </section>
    </>
  )
}

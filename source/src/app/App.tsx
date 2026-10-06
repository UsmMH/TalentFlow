import { useRef } from "react"
import { Navigate, Route, Routes, useNavigate } from "react-router-dom"
import Shell, { DeviceToggle } from "./Shell"
import { useApp } from "./lib/i18n"
import { CandidateDetail, Chain, CreateRole, Decision, Overview, Ranking } from "./Manager"
import { MyPlan, MyReadiness } from "./Employee"
import { Analysis, BehaviorOverview, BehaviorProfile, EmployeeFiles, MyBehavior, RateForm } from "./Behavior"

/** Mobile preview = the same app in a 390px iframe, so real responsive CSS applies. */
function PhonePreview() {
  const { lang, setDevice } = useApp()
  const nav = useNavigate()
  const ref = useRef<HTMLIFrameElement>(null)
  const back = (d: "desktop" | "mobile") => {
    const h = ref.current?.contentWindow?.location.hash // keep the screen the user was on
    if (h) nav(h.slice(1))
    setDevice(d)
  }
  return (
    <div className="flex min-h-screen flex-col items-center gap-4 bg-mist p-4">
      <DeviceToggle on="mobile" onChange={back} />
      <iframe ref={ref} title="mobile" src={`app.html?embed=1&lang=${lang}#${window.location.hash.slice(1) || "/app"}`}
        className="h-[min(844px,calc(100vh-96px))] w-[390px] max-w-full rounded-[40px] border-[12px] border-ink bg-white" />
    </div>
  )
}

export default function App() {
  const { device } = useApp()
  if (device === "mobile" && !window.location.search.includes("embed")) return <PhonePreview />
  return (
    <Routes>
      <Route path="/app" element={<Shell />}>
        <Route index element={<Overview />} />
        <Route path="roles/new" element={<CreateRole />} />
        <Route path="roles/senior-data-analyst" element={<Ranking />} />
        <Route path="roles/senior-data-analyst/candidates/:id" element={<CandidateDetail />} />
        <Route path="roles/senior-data-analyst/chain" element={<Chain />} />
        <Route path="roles/senior-data-analyst/decision" element={<Decision />} />
        <Route path="behavior" element={<BehaviorOverview />} />
        <Route path="behavior/files" element={<EmployeeFiles />} />
        <Route path="behavior/rate" element={<RateForm />} />
        <Route path="behavior/:id/analysis" element={<Analysis />} />
        <Route path="behavior/:id" element={<BehaviorProfile />} />
        <Route path="me/behavior" element={<MyBehavior />} />
        <Route path="me" element={<MyReadiness />} />
        <Route path="me/plan" element={<MyPlan />} />
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  )
}

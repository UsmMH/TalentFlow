import { Navigate, Route, Routes } from "react-router-dom"
import Shell from "./Shell"
import { CandidateDetail, Chain, Decision, Overview, Ranking } from "./Manager"
import { MyPlan, MyReadiness } from "./Employee"
import { Analysis, BehaviorOverview, BehaviorProfile, EmployeeFiles, MyBehavior, RateForm } from "./Behavior"

export default function App() {
  return (
    <Routes>
      <Route path="/app" element={<Shell />}>
        <Route index element={<Navigate to="behavior" replace />} />
        <Route path="skills" element={<Overview />} />
        <Route path="roles/senior-data-analyst" element={<Ranking />} />
        <Route path="roles/senior-data-analyst/candidates/:id" element={<CandidateDetail />} />
        <Route path="roles/senior-data-analyst/chain" element={<Chain />} />
        <Route path="roles/senior-data-analyst/decision" element={<Decision />} />
        <Route path="roles/new" element={<Navigate to="/app/skills" replace />} />
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

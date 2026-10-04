import { createRoot } from "react-dom/client"
import { HashRouter } from "react-router-dom"
import "./app.css"
import "./lib/motion.css"
import { AppProvider } from "./lib/i18n"
import { BehaviorDataProvider } from "./lib/behavior-data"
import App from "./App"

createRoot(document.getElementById("root")!).render(
  <HashRouter>
    <AppProvider>
      <BehaviorDataProvider>
        <App />
      </BehaviorDataProvider>
    </AppProvider>
  </HashRouter>,
)

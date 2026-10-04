import { createRoot } from "react-dom/client"
import "./landing.css"
import "../app/lib/motion.css"
import Landing from "./Landing"

createRoot(document.getElementById("root")!).render(<Landing />)

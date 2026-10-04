import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  build: { rollupOptions: { input: { landing: path.resolve(__dirname, "landing.html"), app: path.resolve(__dirname, "app.html") } } },
})

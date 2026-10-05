import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)))
const repoRoot = path.resolve(root, "..")
const sharedDir = path.resolve(repoRoot, "shared")

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@shared": sharedDir,
    },
  },
  server: {
    fs: {
      allow: [repoRoot],
    },
    // When using `vercel dev` on :3000 and `vite` on :5173, proxy API calls.
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        landing: path.resolve(root, "landing.html"),
        app: path.resolve(root, "app.html"),
      },
    },
  },
})

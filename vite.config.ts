import react from "@vitejs/plugin-react"
import * as fs from "node:fs"
import * as path from "node:path"
import { defineConfig } from "vitest/config"
import tailwindcss from "@tailwindcss/vite"
import packageJson from "./package.json" with { type: "json" }

const pyproject = fs.readFileSync(path.join(import.meta.dirname, "../pyproject.toml"), "utf-8")
const versionMatch = /^version\s*=\s*"([^"]+)"/m.exec(pyproject)
const openrvdasVersion = versionMatch?.[1] ?? "unknown"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    "import.meta.env.VITE_OPENRVDAS_VERSION": JSON.stringify(openrvdasVersion),
  },
  server: {
    open: false,
  },

  test: {
    root: import.meta.dirname,
    name: packageJson.name,
    environment: "jsdom",

    typecheck: {
      enabled: true,
      tsconfig: path.join(import.meta.dirname, "tsconfig.json"),
    },

    globals: true,
    watch: false,
    setupFiles: ["./src/setupTests.ts"],
  },
})

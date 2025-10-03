import { z } from "zod"

const EnvSchema = z.object({
  VITE_SERVER_API_BASE_URL: z.url().default("http://localhost:8000"),
  VITE_DEFAULT_THEME: z.enum(["light", "dark"]).default("light"),
  VITE_ALLOW_SELF_REGISTER: z.enum(["true", "false"]).default("true"),
  VITE_PROJECT: z.string().default("Project"),
  VITE_LOGO: z.string().default("./src/assets/nautilus.svg"),
})

const parsed = EnvSchema.parse(import.meta.env)

export const AppConfig = {
  apiBaseUrl: parsed.VITE_SERVER_API_BASE_URL,
  defaultTheme: parsed.VITE_DEFAULT_THEME,
  allowSelfRegister: parsed.VITE_ALLOW_SELF_REGISTER === "true",
  project: parsed.VITE_PROJECT,
  logo: parsed.VITE_LOGO,
} as const

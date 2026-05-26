import { z } from "zod"
import packageJson from "../package.json" with { type: "json" }

const BREAKPOINT_PX = { sm: 640, md: 768, lg: 1024, xl: 1280, "2xl": 1536 } as const

const EnvSchema = z.object({
  VITE_SERVER_API_BASE_URL: z.string().url().or(z.literal("")).default(""),
  VITE_DEFAULT_THEME: z.enum(["light", "dark"]).default("light"),
  VITE_ALLOW_SELF_REGISTER: z.enum(["true", "false"]).default("true"),
  VITE_PROJECT: z.string().default("Project"),
  VITE_LOGO: z.string().default("./src/assets/nautilus.svg"),
  VITE_VERSION: z.string().default(packageJson.version),
  VITE_LAYOUT: z.enum(["topnav", "drawer"]).default("topnav"),
  VITE_DRAWER_BREAKPOINT: z.enum(["sm", "md", "lg", "xl", "2xl"]).default("xl"),
  VITE_DRAWER_COLLAPSIBLE: z.enum(["true", "false"]).default("true"),
})

const parsed = EnvSchema.parse(import.meta.env)

export const AppConfig = {
  apiBaseUrl: parsed.VITE_SERVER_API_BASE_URL,
  defaultTheme: parsed.VITE_DEFAULT_THEME,
  allowSelfRegister: parsed.VITE_ALLOW_SELF_REGISTER === "true",
  project: parsed.VITE_PROJECT,
  logo: parsed.VITE_LOGO,
  version: parsed.VITE_VERSION,
  layout: parsed.VITE_LAYOUT,
  drawerBreakpoint: BREAKPOINT_PX[parsed.VITE_DRAWER_BREAKPOINT],
  drawerCollapsible: parsed.VITE_DRAWER_COLLAPSIBLE === "true",
} as const

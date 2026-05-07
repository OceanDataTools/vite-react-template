import type { ComponentType } from "react"
import ApiKeyManager from "./pages/ApiKeyManager"
import ProfileForm from "./pages/ProfileForm"
import type { User } from "./features/auth/authThunks"

export type NavRoute = {
  label: string
  path: string
  isPublic?: boolean
  required_roles?: string[]
  element?: ComponentType
  navGroup?: "top" | "side" | "topbar"
}

export const navRoutes: NavRoute[] = [
  { label: "API Keys", path: "/apikeys", element: ApiKeyManager, navGroup: "top" },
  { label: "Profile",  path: "/profile", element: ProfileForm,   navGroup: "top" },
]

// Filter routes by nav group and user role, preserving navRoutes order.
export function getNavRoutes(group: "top" | "side" | "topbar", user?: User | null): NavRoute[] {
  return navRoutes
    .filter(r => r.navGroup === group)
    .filter(r => {
      if (r.isPublic) return true
      if (!user) return false
      if (r.required_roles && !r.required_roles.some(role => user.roles?.includes(role) ?? false)) return false
      return true
    })
}

export function filterAndSortRoutes(
  routes: NavRoute[],
  labelOrder: string[],
  user?: User | null,
): NavRoute[] {
  let returned_routes = labelOrder
    .map(label => routes.find(r => r.label === label))
    .filter((r): r is NavRoute => r !== undefined)

  if (user) {
    returned_routes = returned_routes.filter(
      ({ isPublic = false, required_roles }) => {
        if (isPublic) return true
        if (required_roles && !required_roles.some(role => user.roles?.includes(role) ?? false)) return false
        return true
      },
    )
  }

  return returned_routes
}

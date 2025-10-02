import type { ComponentType } from "react";
import ApiKeyManager from "./pages/ApiKeyManager";
import ProfileForm from "./pages/ProfileForm";
// import type { User } from "./features/auth/authThunk"

type NavRoute = {
  label: string;
  path: string;
  isPublic?: boolean;         // optional
  required_roles?: string[];  // optional
  element?: ComponentType;      // optional component to render
}

export const navRoutes: NavRoute[] = [
  { label: "Admin Only", path: "/private", required_roles: ["admin"] },
  { label: "API Keys", path: "/apikeys", element: ApiKeyManager},
  { label: "Private", path: "/private" },
  { label: "Profile", path: "/profile", element: ProfileForm },
  { label: "Public", path: "/public", isPublic: true},
]

export function filterAndSortRoutes(
  routes: NavRoute[],
  labelOrder: string[],
  user?: User,
): NavRoute[] {

  let returned_routes = labelOrder
    .map(label => routes.find(r => r.label === label))
    .filter((r): r is NavRoute => r !== undefined); // remove any labels not found

  if(user) {
    returned_routes = returned_routes.filter(({ isPublic = false, required_roles }) => {
      if (isPublic) return true;
       
      if (!user) return false; // private link requires user
       
      if (required_roles && !required_roles.some(role => user.roles.includes(role))) return false;

      return true;
    })
  }

  return returned_routes
}
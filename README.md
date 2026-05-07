# vite-react-template

## Goals

- Easy migration from Create React App or Vite
- As beginner friendly as Create React App
- Optimized performance compared to Create React App
- Customizable without ejecting

## Scripts

- `dev`/`start` - start dev server and open browser
- `build` - build for production
- `preview` - locally preview production build
- `test` - launch test runner

## Inspiration

- [Create React App](https://github.com/facebook/create-react-app/tree/main/packages/cra-template)
- [Vite](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react)
- [Vitest](https://github.com/vitest-dev/vitest/tree/main/examples/react-testing-lib)

## Install

1. clone the repository
2. run `npm install`

## Environment Variables

Defined in `.env` and validated at startup via Zod in `src/config.ts`:

| Variable | Default | Purpose |
|---|---|---|
| `VITE_SERVER_API_BASE_URL` | `http://localhost:8000` | Backend API base URL |
| `VITE_DEFAULT_THEME` | `light` | UI theme (`light` or `dark`) |
| `VITE_ALLOW_SELF_REGISTER` | `true` | Show registration link on login page |
| `VITE_PROJECT` | `Project` | Project name shown in header |
| `VITE_LOGO` | `./src/assets/nautilus.svg` | Path to logo shown in header |
| `VITE_VERSION` | from `package.json` | Version string shown in header |
| `VITE_LAYOUT` | `topnav` | Navigation layout (`topnav` or `drawer`) |
| `VITE_DRAWER_BREAKPOINT` | `xl` | Breakpoint at which the drawer auto-opens/closes (`sm`, `md`, `lg`, `xl`, `2xl`) |
| `VITE_DRAWER_COLLAPSIBLE` | `true` | If `false`, hides the toggle button and keeps the drawer permanently open |

## Navigation Layout

The app supports two layout modes controlled by `VITE_LAYOUT` in `.env`.

### `topnav` (default)

A single top navigation bar. Routes with `navGroup: "side"` appear as inline buttons in the nav bar. Routes with `navGroup: "top"` appear in the user dropdown menu.

### `drawer`

A responsive sidebar drawer alongside the top navigation bar. On `xl` screens the sidebar is always visible; on smaller screens a hamburger button in the top bar toggles it. The sidebar logo and footer replace the standalone footer used in topnav mode.

- Routes with `navGroup: "side"` appear in the sidebar.
- Routes with `navGroup: "top"` appear in the user dropdown in the top bar.

### Adding routes

Routes are defined in `src/routes.ts`. Each route has a `navGroup` field that controls where its link appears:

```ts
export const navRoutes: NavRoute[] = [
  { label: "Dashboard", path: "/dashboard", element: Dashboard, navGroup: "side" },
  { label: "Settings",  path: "/settings",  element: Settings,  navGroup: "top" },
]
```

- `navGroup: "side"` — primary navigation; shown in the sidebar (drawer mode) or topnav bar (topnav mode)
- `navGroup: "top"` — user-account links; always in the user dropdown regardless of layout mode
- `navGroup: "topbar"` — always shown as inline buttons in the topnav bar regardless of layout mode

Role-protected routes include a `required_roles` array. Public (unauthenticated) routes set `isPublic: true`.

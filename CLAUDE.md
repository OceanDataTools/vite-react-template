# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Vite)
npm run build        # Type-check + production build
npm run test         # Run tests once (Vitest)
npm run lint         # Lint with ESLint
npm run lint:fix     # Auto-fix lint issues
npm run format       # Format with Prettier
npm run type-check   # TypeScript check only
```

To run a single test file:
```bash
npx vitest run src/path/to/file.test.tsx
```

## Tech Stack

- **React 19** + **TypeScript 5** built with **Vite 7**
- **Redux Toolkit** for state management
- **React Router DOM 7** for routing
- **React Hook Form** + **Zod** for forms and validation
- **Tailwind CSS 4** + **DaisyUI 5** for styling
- **Vitest** + **Testing Library** for tests

## Architecture

### State Management

Feature-based Redux slices live in `src/features/`. Each feature has a slice (reducers + state shape) and a thunks file (async operations). New slices are registered automatically via `combineSlices()` in `src/app/store.ts`.

Always use the pre-typed hooks from `src/app/hooks.ts` — ESLint enforces this and will error on direct imports of `useSelector`/`useDispatch` from `react-redux`.

### Authentication

`fetchWithAuth` in `src/utils/api.tsx` wraps all authenticated API calls. It automatically:
- Attaches the Bearer token from Redux state
- Retries once on 401 using the refresh token (httpOnly cookie via `credentials: "include"`)

On login, `loginThunk` fetches a token then dispatches `fetchUserProfileThunk` — auth state holds both token and user profile separately.

### Routing & Protection

Routes are defined in `src/routes.ts` with metadata (label, `isPublic`, `required_roles`). `App.tsx` uses three guard components:
- `RequireAuth` — redirects unauthenticated users to `/login`
- `RequireUnAuth` — redirects authenticated users to `/`
- `ProtectedRoute` — checks user roles against `required_roles`

### API Integration

`apiUrl()` in `src/utils/api.tsx` builds full URLs from `VITE_SERVER_API_BASE_URL`. All environment variables are parsed and validated at startup via Zod in `src/config.ts` — add new env vars there.

### Forms

Forms use React Hook Form with Zod resolvers. Async validation (e.g., checking email availability) is done via custom validators inside the schema. See `ProfileForm.tsx` for examples of async validators and `ApiKeyModal.tsx` for modal-form patterns.

### Hooks

`src/hooks/` contains two general-purpose hooks:
- `useToast` — ephemeral toast notifications
- `useLocalStorage` — typed, JSON-serialized state persisted to localStorage (gracefully no-ops if storage is unavailable)

### Styling

Custom theme colors are defined in `src/App.css` using OKLCH. Use DaisyUI utility classes (`btn`, `btn-primary`, `modal`, `navbar`, etc.) and Tailwind for layout. The default theme (`dark` or `light`) comes from `VITE_DEFAULT_THEME`.

## Environment Variables

Defined in `.env` and validated in `src/config.ts`:

| Variable | Default | Purpose |
|---|---|---|
| `VITE_SERVER_API_BASE_URL` | `http://localhost:8000` | Backend API base URL |
| `VITE_DEFAULT_THEME` | `light` | UI theme |
| `VITE_ALLOW_SELF_REGISTER` | `true` | Show registration link |

## Pre-commit Hook

Husky runs `lint:fix` and `format` automatically on every commit. Don't skip it.

## Branching & PR Workflow

This repo is a shared boilerplate/template (`main`) that individual UI projects (e.g. `openrvdas`) branch off of. There are two parallel tracks, mirrored in both `frontend` and `backend`:

```
main                              — shared template baseline
 └─ dev                           — base-improvement integration branch
     └─ issue_NNN                 — base-improvement work → PR → dev

main
 └─ <project> (e.g. openrvdas)    — a project's long-lived branch off main
     └─ <project>_dev (e.g. openrvdas_dev)  — project's integration branch
         └─ issue_NNN              — project-specific work → PR → <project>_dev
```

Issue branches are named `issue_NNN`, where `NNN` is the GitHub issue number zero-padded to 3 digits (e.g. issue #7 → `issue_007`, issue #42 → `issue_042`, issue #123 → `issue_123`).

- **Base/template improvements** (generic, reusable): cut an `issue_NNN` branch from `dev`, PR into `dev`.
- **Project-specific work** (e.g. OpenRVDAS features): cut an `issue_NNN` branch from `<project>_dev` (e.g. `openrvdas_dev`), PR into `<project>_dev`.
- `<project>_dev` merges into `<project>` via PR the same way `dev` merges into `main`.
- Never push issue work directly to `dev`, `<project>_dev`, `main`, or `<project>`.
- All PRs are merged through the GitHub UI (not `git merge`/`gh pr merge` from the CLI).
- When `main` gets a new release, open issues to rebase each `<project>` branch and its `<project>_dev` branch against the updated `main`, so projects stay current with base improvements.
- `package-lock.json` is a poor git-merge candidate: git's text-level merge can combine two independently-valid lockfile diffs into a result that's syntactically valid JSON but out of sync with `package.json` (this happened once — see #17). If two open PRs both touch `package-lock.json`, don't merge them back-to-back — after merging the first, rebase the second onto `dev` and re-run `npm install` before merging it.

See `RELEASING.md` for the step-by-step procedure to cut a release of `main` (version bump, tag, GitHub Release).

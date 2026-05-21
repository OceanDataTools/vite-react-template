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

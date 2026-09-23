import { screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { App, ProtectedRoute, RequireAuth, RequireUnAuth } from "./App"
import { AppConfig } from "./config"
import { renderWithProviders } from "./utils/test-utils"
import type { RootState } from "./app/store"

const authState = (
  overrides: { token?: string | null; roles?: string[] } = {},
): Partial<RootState> => ({
  auth: {
    token: overrides.token ?? null,
    user: overrides.token
      ? {
          username: "test",
          full_name: "Test User",
          email: "test@example.com",
          roles: overrides.roles ?? [],
        }
      : null,
    loading: false,
    error: null,
  },
})

describe("RequireAuth", () => {
  test("redirects to /login when there is no token", () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/protected"]}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/protected" element={<div>Protected content</div>} />
          </Route>
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>,
      { preloadedState: authState() },
    )

    expect(screen.getByText("Login page")).toBeInTheDocument()
    expect(screen.queryByText("Protected content")).not.toBeInTheDocument()
  })

  test("renders the outlet when a token is present", () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/protected"]}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/protected" element={<div>Protected content</div>} />
          </Route>
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>,
      { preloadedState: authState({ token: "test-token" }) },
    )

    expect(screen.getByText("Protected content")).toBeInTheDocument()
  })
})

describe("RequireUnAuth", () => {
  test("redirects to / when a token is present", () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route element={<RequireUnAuth />}>
            <Route path="/login" element={<div>Login page</div>} />
          </Route>
          <Route path="/" element={<div>Home page</div>} />
        </Routes>
      </MemoryRouter>,
      { preloadedState: authState({ token: "test-token" }) },
    )

    expect(screen.getByText("Home page")).toBeInTheDocument()
    expect(screen.queryByText("Login page")).not.toBeInTheDocument()
  })

  test("renders the outlet when there is no token", () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route element={<RequireUnAuth />}>
            <Route path="/login" element={<div>Login page</div>} />
          </Route>
          <Route path="/" element={<div>Home page</div>} />
        </Routes>
      </MemoryRouter>,
      { preloadedState: authState() },
    )

    expect(screen.getByText("Login page")).toBeInTheDocument()
  })
})

describe("ProtectedRoute", () => {
  test("renders the element when the user has a required role", () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route
            path="/admin"
            element={<ProtectedRoute rolesAllowed={["admin"]} element={<div>Admin content</div>} />}
          />
          <Route path="/" element={<div>Home page</div>} />
        </Routes>
      </MemoryRouter>,
      { preloadedState: authState({ token: "test-token", roles: ["admin"] }) },
    )

    expect(screen.getByText("Admin content")).toBeInTheDocument()
  })

  test("redirects to / when the user lacks the required role", () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/admin"]}>
        <Routes>
          <Route
            path="/admin"
            element={<ProtectedRoute rolesAllowed={["admin"]} element={<div>Admin content</div>} />}
          />
          <Route path="/" element={<div>Home page</div>} />
        </Routes>
      </MemoryRouter>,
      { preloadedState: authState({ token: "test-token", roles: ["viewer"] }) },
    )

    expect(screen.getByText("Home page")).toBeInTheDocument()
    expect(screen.queryByText("Admin content")).not.toBeInTheDocument()
  })

  test("renders the element when no roles are required", () => {
    renderWithProviders(
      <MemoryRouter initialEntries={["/apikeys"]}>
        <Routes>
          <Route path="/apikeys" element={<ProtectedRoute element={<div>API keys</div>} />} />
        </Routes>
      </MemoryRouter>,
      { preloadedState: authState({ token: "test-token" }) },
    )

    expect(screen.getByText("API keys")).toBeInTheDocument()
  })
})

describe("App", () => {
  test("renders without crashing and sets the document title", () => {
    window.history.pushState({}, "", "/")

    renderWithProviders(<App />)

    expect(document.title).toBe(`${AppConfig.project} v${AppConfig.version}`)
    expect(screen.getByText(/vite \+ react \+ redux template/i)).toBeInTheDocument()
  })
})

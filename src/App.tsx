import { useEffect } from "react"
import type { JSX } from "react"
import { useAppDispatch, useAppSelector } from "./app/hooks"
import { AppConfig } from "./config"
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Routes,
  Route,
  useLocation,
} from "react-router-dom"
import type { RootState } from "./app/store"
import { fetchUserProfileThunk } from "./features/auth/authThunks"
import MainLayout from "./components/MainLayout"
import { ForgotPasswordForm } from "./pages/ForgotPasswordForm"
import { Home } from "./pages/Home"
import { LoginForm } from "./pages/LoginForm"
import { RegisterForm } from "./pages/RegisterForm"
import { ResetPasswordForm } from "./pages/ResetPasswordForm"
import { navRoutes } from "./routes"

export const RequireAuth = () => {
  const { token } = useAppSelector((state: RootState) => state.auth)
  const location = useLocation()

  if (!token) return <Navigate to="/login" state={{ from: location }} replace />

  return <Outlet />
}

export const RequireUnAuth = () => {
  const { token } = useAppSelector((state: RootState) => state.auth)
  const location = useLocation()

  if (token) return <Navigate to="/" state={{ from: location }} replace />

  return <Outlet />
}

type ProtectedRouteProps = {
  rolesAllowed?: string[]
  element: JSX.Element
}

export const ProtectedRoute = ({ rolesAllowed, element }: ProtectedRouteProps): JSX.Element => {
  const user = useAppSelector((state: RootState) => state.auth.user)
  const location = useLocation()

  const roles = user?.roles ?? []
  if (!rolesAllowed || rolesAllowed.some(role => roles.includes(role))) {
    return element
  }

  return <Navigate to="/" state={{ from: location }} replace />
}

export const App = () => {
  const dispatch = useAppDispatch()
  const token = useAppSelector((state: RootState) => state.auth.token)

  useEffect(() => {
    document.title = `${AppConfig.project} v${AppConfig.version}`
  }, [])

  useEffect(() => {
    if (token) void dispatch(fetchUserProfileThunk())
  }, [token, dispatch])

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route element={<RequireUnAuth />}>
            <Route path="/login" element={<LoginForm />} />
            <Route path="/register" element={<RegisterForm />} />
            <Route path="/reset-password" element={<ResetPasswordForm />} />
            <Route path="/forgot-password" element={<ForgotPasswordForm />} />
            {navRoutes
              .filter(r => r.isPublic === true)
              .map(({ path, element: Component }) =>
                Component ? <Route key={path} path={path} element={<Component />} /> : null
              )}
          </Route>

          <Route element={<RequireAuth />}>
            {navRoutes
              .filter(r => !r.isPublic)
              .map(({ path, element: Component, required_roles }) =>
                Component ? (
                  <Route
                    key={path}
                    path={path}
                    element={
                      <ProtectedRoute rolesAllowed={required_roles} element={<Component />} />
                    }
                  />
                ) : null
              )}
          </Route>

          <Route path="/" element={<Home />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

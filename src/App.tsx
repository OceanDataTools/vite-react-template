import { useEffect, useRef } from "react"
import { useAppDispatch, useAppSelector } from "./app/hooks"
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
import { TopNav } from "./components/TopNav"
// import { SideBar } from "./components/SideBar";
import { Footer } from "./components/Footer"
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

export const ProtectedRoute = ({
  rolesAllowed,
  element,
}: ProtectedRouteProps): JSX.Element => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  const user = useAppSelector((state: RootState) => state.user)
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
    if (token) {
      void dispatch(fetchUserProfileThunk())
    }
  }, [token, dispatch])

  // Sidebar state retention
  const drawerRef = useRef<HTMLInputElement>(null)

  // On mount, read previous state
  useEffect(() => {
    const stored = localStorage.getItem("drawerOpen")
    if (drawerRef.current && stored !== null) {
      drawerRef.current.checked = stored === "true"
    }
  }, [])

  /*Allow sidebar state to persist*/
  // const handleChange = () => {
  //   if (drawerRef.current) {
  //     localStorage.setItem("drawerOpen", drawerRef.current.checked.toString());
  //   }
  // };

  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        {/*Sidebar Input*/}
        {/*        <div className="drawer xl:drawer-open w-full">
        <input
          id="sidebar-drawer"
          type="checkbox"
          className="drawer-toggle"
          ref={drawerRef}
          onChange={handleChange}
        />

        <div className="drawer-content">
*/}{" "}
        {/*Sidebar Input*/}
        <TopNav />
        <main className="App flex-grow overflow-auto">
          <Routes>
            {/* Require no authentication */}
            <Route element={<RequireUnAuth />}>
              <Route path="/login" element={<LoginForm />} />
              <Route path="/register" element={<RegisterForm />} />
              <Route path="/reset-password" element={<ResetPasswordForm />} />
              <Route path="/forgot-password" element={<ForgotPasswordForm />} />
              {navRoutes
                .filter(r => r.isPublic === true)
                .map(({ path, element: Component }) =>
                  Component ? (
                    <Route key={path} path={path} element={<Component />} />
                  ) : null,
                )}
            </Route>

            {/* Require authentication */}
            <Route element={<RequireAuth />}>
              {navRoutes
                .filter(r => !r.isPublic)
                .map(({ path, element: Component, required_roles }) =>
                  Component ? (
                    <Route
                      key={path}
                      path={path}
                      element={
                        <ProtectedRoute
                          rolesAllowed={required_roles}
                          element={<Component />}
                        />
                      }
                    />
                  ) : null,
                )}
            </Route>

            {/* No requirements */}
            <Route path="/" element={<Home />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        {/*Sidebar Input*/}
        {/*</div>*/}
        {/*<SideBar />*/}
        {/*</div>*/}
        {/*Sidebar Input*/}
        {/*No Sidebar Input*/}
        <Footer />
        {/*No Sidebar Input*/}
      </div>
    </BrowserRouter>
  )
}

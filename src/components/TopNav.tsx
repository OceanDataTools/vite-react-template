import type { JSX } from "react"
import { NavLink, useLocation } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "../app/hooks"
import { logoutThunk } from "../features/auth/authThunks"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faUser } from "@fortawesome/free-solid-svg-icons"
import type { RootState } from "../app/store"
import { AppConfig } from "../config"
import { getNavRoutes } from "../routes"

export const TopNav = (): JSX.Element => {
  const location = useLocation()
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state: RootState) => state.auth)
  const hideNavPaths = ["/login"]

  const handleLogout = () => void dispatch(logoutThunk())

  const isDrawer = AppConfig.layout === "drawer"

  const dropdownLinks = getNavRoutes("top", user).filter(
    ({ isPublic = false }) => !(isPublic && hideNavPaths.includes(location.pathname))
  )

  const navBarLinks = getNavRoutes("side", user).filter(
    ({ isPublic = false }) => !(isPublic && hideNavPaths.includes(location.pathname))
  )

  const topBarLinks = getNavRoutes("topbar", user).filter(
    ({ isPublic = false }) => !(isPublic && hideNavPaths.includes(location.pathname))
  )

  return (
    <div className="navbar bg-base-300 shadow-sm py-0 min-h-12">
      <div className="navbar-start">
        <NavLink to="/">
          <svg
            className="text-base-content"
            width="300"
            height="50"
            viewBox="0 0 300 50"
            xmlns="http://www.w3.org/2000/svg"
          >
            <image href={AppConfig.logo} x="0" y="0" height="50" width="50" />
            <text
              x="55"
              y="34"
              fontFamily="Helvetica, Arial, sans-serif"
              fontSize="26"
              fontWeight="bold"
              fill="currentColor"
            >
              {AppConfig.project}
              {AppConfig.version && (
                <tspan fontSize="13" fontWeight="normal" opacity="0.5" dx="8">
                  v{AppConfig.version}
                </tspan>
              )}
            </text>
          </svg>
        </NavLink>
      </div>

      <div className="flex grow justify-end px-2">
        <div className="flex items-stretch">
          {!isDrawer &&
            navBarLinks.map(({ label, path }) => (
              <NavLink key={label} className="btn btn-ghost px-2" to={path}>
                {label}
              </NavLink>
            ))}
          {topBarLinks.map(({ label, path }) => (
            <NavLink key={label} className="btn btn-ghost px-2" to={path}>
              {label}
            </NavLink>
          ))}

          { }
          {user ? (
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost p-0">
                <FontAwesomeIcon icon={faUser} />
              </div>
              <div
                tabIndex={0}
                className="dropdown-content w-48"
              >
                <div className="px-4 py-2">
                  <p className="text-base-content font-semibold truncate">
                    {user.full_name || user.username}
                  </p>
                  <p className="text-base-content/50 truncate text-xs">
                    {user.email}
                  </p>
                </div>
                <hr className="border-base-300" />
                <ul className="menu w-full p-2">
                  {dropdownLinks.map(({ label, path }) => (
                    <li key={`vislink_${String(label)}`}>
                      <NavLink
                        onClick={() => { (document.activeElement as HTMLElement | null)?.blur(); }}
                        to={path}
                      >
                        {label}
                      </NavLink>
                    </li>
                  ))}
                  {dropdownLinks.length > 0 && <li className="pointer-events-none"><hr className="border-base-300" /></li>}
                  <li>
                    <button className="text-error" onClick={handleLogout}>Logout</button>
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            !hideNavPaths.includes(location.pathname) && (
              <NavLink className="btn btn-ghost px-2" to="/login">
                Login
              </NavLink>
            )
          )}
        </div>
      </div>
    </div>
  )
}

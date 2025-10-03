import { NavLink, useLocation } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "../app/hooks"
import { logoutThunk } from "../features/auth/authThunks"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faUser } from "@fortawesome/free-solid-svg-icons"
import type { RootState } from "../app/store"
import { AppConfig } from "../config"
import { navRoutes, filterAndSortRoutes } from "../routes"

export const TopNav = (): JSX.Element => {
  const location = useLocation()
  const dispatch = useAppDispatch()

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { token, user } = useAppSelector((state: RootState) => state.auth)
  const hideNavPaths = ["/login"]

  const handleLogout = () => {
    void dispatch(logoutThunk())
  }

  // const visibleTopNavLinks = filterAndSortRoutes(navRoutes, ['Public', 'Private'], user)
  //   .filter(({ isPublic = false }) => {
  //     if (isPublic && hideNavPaths.includes(location.pathname)) return false
  //     return true;
  // })

  const visibleDropdownLinks = filterAndSortRoutes(
    navRoutes,
    ["Profile", "API Keys"],
    user,
  ).filter(({ isPublic = false }) => {
    if (isPublic && hideNavPaths.includes(location.pathname)) return false
    return true
  })

  return (
    <div className="navbar bg-base-300 shadow-sm py-0">
      {/*Sidebar Toggle*/}
      {/*      { user ? (
        <div className="flex-none xl:hidden">
          <label htmlFor="sidebar-drawer" aria-label="open sidebar" className="btn btn-square btn-ghost">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="inline-block h-6 w-6 stroke-current"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 6h16M4 12h16M4 18h16"
              ></path>
            </svg>
          </label>
        </div>
        ) : null }
*/}{" "}
      {/*Sidebar Toggle*/}
      <div className="navbar-start">
        <NavLink to="/">
          {" "}
          {/* add className="xl:hidden" for sidebar */}
          <svg
            className="text-base-content"
            width="140"
            height="40"
            viewBox="0 0 200 50"
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
            </text>
          </svg>
        </NavLink>
      </div>
      <div className="flex grow justify-end px-2">
        <div className="flex items-stretch">
          {/*
          {visibleTopNavLinks.map(({ label, path }) => (
            <NavLink key={label} className="btn btn-ghost px-2" to={path}>
              {label}
            </NavLink>
          ))}
          */}
          {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
          {user ? (
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost p-0">
                <FontAwesomeIcon icon={faUser} />
              </div>
              <ul
                tabIndex={0}
                className="menu dropdown-content bg-base-100 rounded-box z-1 w-35 p-2 shadow-sm"
              >
                {visibleDropdownLinks.map(({ label, path }) => (
                  <li key={`vislink_${String(label)}`}>
                    <NavLink
                      onClick={() => void document.activeElement.blur()}
                      to={path}
                    >
                      {label}
                    </NavLink>
                  </li>
                ))}
                <li key="logout">
                  <button onClick={handleLogout}>Logout</button>
                </li>
              </ul>
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

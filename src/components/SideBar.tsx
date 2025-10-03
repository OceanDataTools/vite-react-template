import { useEffect, useState } from "react"
import { NavLink } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faGithub } from "@fortawesome/free-brands-svg-icons"
import { faDiscord } from "@fortawesome/free-brands-svg-icons"
import { faGlobe } from "@fortawesome/free-solid-svg-icons"
import type { RootState } from "../app/store"
import { useAppSelector } from "../app/hooks"
import { navRoutes, filterAndSortRoutes } from "../routes"
import { AppConfig } from "../config"

export const SideBar = (): JSX.Element => {
  const { user } = useAppSelector((state: RootState) => state.auth)

  const getInitialTheme = () => {
    const saved = localStorage.getItem("theme")
    return saved ?? AppConfig.defaultTheme
  }

  const [isDark, setIsDark] = useState(getInitialTheme() === "dark")

  // Apply theme whenever `isDark` changes
  useEffect(() => {
    const theme = isDark ? "dark" : "light"
    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem("theme", theme)
  }, [isDark])

  // Toggle handler
  const handleThemeToggle = () => {
    setIsDark(prev => !prev)
  }

  const visibleDropdownLinks = filterAndSortRoutes(
    navRoutes,
    ["Public", "Private"],
    user,
  )

  return (
    <div className="drawer-side h-screen">
      <label
        htmlFor="sidebar-drawer"
        aria-label="close sidebar"
        className="drawer-overlay"
      ></label>
      <div className="flex flex-col h-full w-60">
        <div className="navbar bg-base-300 shadow-sm flex-shrink-0 py-0">
          <div className="navbar-start">
            <NavLink to="/">
              <svg
                className="text-base-content"
                width="140"
                height="40"
                viewBox="0 0 200 50"
                xmlns="http://www.w3.org/2000/svg"
              >
                <image
                  href={AppConfig.logo}
                  x="0"
                  y="0"
                  height="50"
                  width="50"
                />
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
        </div>
        <ul className="menu bg-base-200 text-base-content flex-1 overflow-y-auto w-60 p-4">
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
        </ul>
        <footer className="flex flex-col bg-base-200 text-neutral-content p-4">
          {/* Copyright */}
          <span className="text-base-content/50 leading-tight">
            &copy; {new Date().getFullYear()} OceanDataTools.org
          </span>

          {/* Icons left, toggle right */}
          <div className="flex items-center justify-between w-full mt-2">
            {/* Icons left */}
            <div className="flex items-center gap-1">
              <a
                href="https://github.com/OceanDataTools"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FontAwesomeIcon
                  icon={faGithub}
                  className="text-lg relative top-[2px] text-base-content/50"
                />
              </a>
              <a
                href="https://www.oceandatatools.org"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FontAwesomeIcon
                  icon={faGlobe}
                  className="text-lg relative top-[2px] text-base-content/50"
                />
              </a>
              <a
                href="https://discord.gg/nXBndbvuyA"
                target="_blank"
                rel="noopener noreferrer"
              >
                <FontAwesomeIcon
                  icon={faDiscord}
                  className="text-lg relative top-[2px] text-base-content/50"
                />
              </a>
            </div>

            {/* Toggle right */}
            <label className="toggle text-base-content/50">
              <input
                type="checkbox"
                checked={isDark}
                onChange={handleThemeToggle}
              />
              <svg
                aria-label="sun"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <g
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeWidth="2"
                  fill="none"
                  stroke="currentColor"
                >
                  <circle cx="12" cy="12" r="4"></circle>
                  <path d="M12 2v2"></path>
                  <path d="M12 20v2"></path>
                  <path d="m4.93 4.93 1.41 1.41"></path>
                  <path d="m17.66 17.66 1.41 1.41"></path>
                  <path d="M2 12h2"></path>
                  <path d="M20 12h2"></path>
                  <path d="m6.34 17.66-1.41 1.41"></path>
                  <path d="m19.07 4.93-1.41 1.41"></path>
                </g>
              </svg>
              <svg
                aria-label="moon"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <g
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  strokeWidth="2"
                  fill="none"
                  stroke="currentColor"
                >
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
                </g>
              </svg>
            </label>
          </div>
        </footer>
      </div>
    </div>
  )
}

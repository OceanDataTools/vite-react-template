import type { JSX } from "react"
import { useEffect, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faGithub } from "@fortawesome/free-brands-svg-icons"
import { faDiscord } from "@fortawesome/free-brands-svg-icons"
import { faGlobe } from "@fortawesome/free-solid-svg-icons"
import { AppConfig } from "../config"

export const Footer = (): JSX.Element => {
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

  return (
    <footer className="footer footer-horizontal bg-base-300 text-neutral-content text-base-content/50 items-center p-2">
      <aside>
        <span className="text-base-content/50">
          &copy; {new Date().getFullYear()} OceanDataTools.org{" "}
          <a
            href="https://github.com/OceanDataTools"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FontAwesomeIcon
              icon={faGithub}
              className="text-lg relative top-[2px]"
            />
          </a>
          <a
            href="https://www.oceandatatools.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FontAwesomeIcon
              icon={faGlobe}
              className="text-lg relative top-[2px]"
            />
          </a>
          <a
            href="https://discord.gg/nXBndbvuyA"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FontAwesomeIcon
              icon={faDiscord}
              className="text-lg relative top-[2px] ms-1"
            />
          </a>
        </span>
      </aside>
      <nav className="gap-4 justify-self-end">
        <label className="toggle text-base-content text-base-content/50">
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
      </nav>
    </footer>
  )
}

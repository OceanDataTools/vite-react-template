import { useState, useEffect } from "react"
import { Outlet } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faChevronLeft, faChevronRight } from "@fortawesome/free-solid-svg-icons"
import { TopNav } from "./TopNav"
import { SideBar } from "./SideBar"
import { Footer } from "./Footer"
import { AppConfig } from "../config"

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(!AppConfig.drawerCollapsible)
  const [isWideScreen, setIsWideScreen] = useState(false)

  useEffect(() => {
    const bp = AppConfig.drawerBreakpoint

    const update = (wide: boolean) => {
      setIsWideScreen(wide)
      if (AppConfig.drawerCollapsible) setIsSidebarOpen(wide)
    }

    if (window.innerWidth >= bp) {
      update(true)
    } else {
      update(false)
      if (AppConfig.drawerCollapsible) {
        setIsSidebarOpen(localStorage.getItem("drawerOpen") === "true")
      }
    }

    const handleResize = () => { update(window.innerWidth >= bp); }
    window.addEventListener("resize", handleResize)
    return () => { window.removeEventListener("resize", handleResize); }
  }, [])

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => {
      localStorage.setItem("drawerOpen", String(!prev))
      return !prev
    })
  }

  if (AppConfig.layout === "drawer") {
    return (
      <div className="min-h-screen flex flex-col">
        <TopNav />
        <div className={`drawer drawer-below-topnav flex-1 ${isSidebarOpen && (!AppConfig.drawerCollapsible || isWideScreen) ? "drawer-open" : ""}`}>
          <input
            id="sidebar-drawer"
            type="checkbox"
            className="drawer-toggle"
            checked={isSidebarOpen}
            onChange={toggleSidebar}
          />
          <div className="drawer-content overflow-y-auto min-h-full">
            {AppConfig.drawerCollapsible && (
              <button
                onClick={toggleSidebar}
                className="fixed top-1/2 -translate-y-1/2 z-[1000] flex items-center bg-base-200 rounded-r-lg px-1.5 py-6 shadow-md cursor-pointer transition-[left] duration-300"
                style={{ left: isSidebarOpen ? "var(--sidebar-width)" : "0" }}
                aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
              >
                <FontAwesomeIcon icon={isSidebarOpen ? faChevronLeft : faChevronRight} />
              </button>
            )}
            <Outlet />
          </div>
          <SideBar />
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      <TopNav />
      <main className="flex-1 overflow-auto min-h-0 flex flex-col">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

export default MainLayout

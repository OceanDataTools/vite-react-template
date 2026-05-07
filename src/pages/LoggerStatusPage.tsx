import type { JSX } from "react"
import { useLoggerStateWS } from "../hooks/useLoggerStateWS"
import { useLocalStorage } from "../hooks/useLocalStorage"
import { LoggerStatusPanel } from "../components/LoggerStatusPanel"

export const LoggerStatusPage = (): JSX.Element => {
  useLoggerStateWS()
  const [expanded, setExpanded] = useLocalStorage("loggerStatusPanel.expanded", false)
  return (
    <div className={`flex-1 flex flex-col min-h-0 w-full ${expanded ? "" : "p-4 md:p-6 max-w-7xl mx-auto"}`}>
      <LoggerStatusPanel fullHeight expanded={expanded} onExpandedChange={setExpanded} />
    </div>
  )
}

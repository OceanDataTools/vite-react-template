import type { JSX } from "react"
import { useLoggerStateWS } from "../hooks/useLoggerStateWS"
import { useLocalStorage } from "../hooks/useLocalStorage"
import { LogPanel } from "../components/LogPanel"

export const LogsPage = (): JSX.Element => {
  useLoggerStateWS()
  const [expanded, setExpanded] = useLocalStorage("logPanel.expanded", false)
  return (
    <div className={`flex-1 flex flex-col min-h-0 w-full ${expanded ? "" : "p-4 md:p-6 max-w-5xl mx-auto"}`}>
      <LogPanel fullHeight expanded={expanded} onExpandedChange={setExpanded} />
    </div>
  )
}

import { useRef, useEffect, useState } from "react"
import { useLocalStorage } from "../hooks/useLocalStorage"
import { useLocation } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "../app/hooks"
import type { RootState } from "../app/store"
import { clearLogEntries, type LogEntry } from "../features/openrvdas/openrvdasSlice"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faPause, faPlay, faTrashCan, faArrowUpRightFromSquare, faExpand, faCompress } from "@fortawesome/free-solid-svg-icons"

const LEVEL_CLASS: Record<string, string> = {
  DEBUG:    "opacity-40",
  INFO:     "",
  WARNING:  "text-warning",
  ERROR:    "text-error",
  CRITICAL: "text-error font-bold",
}

const MIN_LEVEL_OPTIONS = ["DEBUG", "INFO", "WARNING", "ERROR"] as const
type MinLevel = (typeof MIN_LEVEL_OPTIONS)[number]

const LEVEL_NO: Record<MinLevel, number> = {
  DEBUG:   10,
  INFO:    20,
  WARNING: 30,
  ERROR:   40,
}

export function formatTs(ts: number): string {
  const d = new Date(ts * 1000)
  const hh = d.getHours().toString().padStart(2, "0")
  const mm = d.getMinutes().toString().padStart(2, "0")
  const ss = d.getSeconds().toString().padStart(2, "0")
  return `${hh}:${mm}:${ss}`
}

export function EntryRow({ entry }: { entry: LogEntry }) {
  const cls = LEVEL_CLASS[entry.levelname] ?? ""
  return (
    <div className={`flex gap-2 font-mono leading-snug py-0.5 ${cls}`}>
      <span className="shrink-0 opacity-50 truncate" style={{ width: "6em" }}>{formatTs(entry.timestamp)}</span>
      <span className="shrink-0 opacity-60 truncate" style={{ width: "10em" }} title={entry.source}>{entry.source}</span>
      <span className="break-all">{entry.message}</span>
    </div>
  )
}

export function LogPanel({
  fullHeight = false,
  expanded = false,
  onExpandedChange,
}: {
  fullHeight?: boolean
  expanded?: boolean
  onExpandedChange?: (v: boolean) => void
} = {}) {
  const dispatch = useAppDispatch()
  const { pathname } = useLocation()
  const entries = useAppSelector((s: RootState) => s.openrvdas.logEntries)
  const loggerIds = useAppSelector((s: RootState) => s.openrvdas.loggers.map(l => l.id))
  const [minLevel, setMinLevel] = useState<MinLevel>("INFO")
  const [source, setSource] = useState<string>("all")
  const [messageFilter, setMessageFilter] = useState("")
  const [paused, setPaused] = useState(false)
  const [snapshot, setSnapshot] = useState<LogEntry[] | null>(null)
  const [pinToBottom, setPinToBottom] = useState(true)
  const [fontSize, setFontSize] = useLocalStorage("logPanel.fontSize", 12)
  const scrollRef = useRef<HTMLDivElement>(null)

  const needle = messageFilter.toLowerCase()
  const filtered = entries.filter(
    e =>
      e.levelno >= LEVEL_NO[minLevel] &&
      (source === "all" || e.source === source) &&
      (needle === "" || e.message.toLowerCase().includes(needle)),
  )
  const displayEntries = paused && snapshot !== null ? snapshot : filtered

  const togglePause = () => {
    if (!paused) {
      setSnapshot(filtered)
      setPaused(true)
    } else {
      setPaused(false)
      setSnapshot(null)
      setPinToBottom(true)
    }
  }

  useEffect(() => {
    if (pinToBottom && !paused) {
      const el = scrollRef.current
      if (el) el.scrollTop = el.scrollHeight
    }
  }, [displayEntries.length, pinToBottom, paused])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40
    setPinToBottom(atBottom)
  }

  const outerClass = expanded
    ? "flex-1 flex flex-col min-h-0 bg-base-200"
    : `card bg-base-200 shadow-sm ${fullHeight ? "flex-1 flex flex-col min-h-0" : ""}`
  const innerClass = expanded
    ? "flex-1 flex flex-col min-h-0 space-y-2 py-3 px-5"
    : `card-body py-3 px-5 space-y-2 ${fullHeight ? "flex-1 flex flex-col min-h-0" : ""}`

  return (
    <div className={outerClass}>
      <div className={innerClass}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="card-title text-base font-semibold">Logs</h2>
            {pathname !== "/logs" && (
              <button
                className="btn btn-ghost btn-xs opacity-40 hover:opacity-100"
                onClick={() => window.open("/logs", "_blank")}
                title="Open logs in new window"
              >
                <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={8}
              max={16}
              step={1}
              value={fontSize}
              onChange={e => { setFontSize(Number(e.target.value)); }}
              className="range range-xs w-32 opacity-60 hover:opacity-100"
              title="Font size"
            />
            <select
              className="select select-xs select-bordered"
              value={minLevel}
              onChange={e => { setMinLevel(e.target.value as MinLevel); }}
            >
              {MIN_LEVEL_OPTIONS.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
            <select
              className="select select-xs select-bordered font-mono"
              value={source}
              onChange={e => { setSource(e.target.value); }}
            >
              <option value="all">all sources</option>
              <option value="logger_manager">logger_manager</option>
              {loggerIds.map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
            <input
              type="text"
              className="input input-xs input-bordered font-mono w-40"
              placeholder="filter messages…"
              value={messageFilter}
              onChange={e => { setMessageFilter(e.target.value); }}
            />
            <button
              className={`btn btn-xs ${paused ? "btn-warning" : "btn-ghost opacity-60 hover:opacity-100"}`}
              onClick={togglePause}
              title={paused ? "Resume log updates" : "Pause log updates"}
            >
              <FontAwesomeIcon icon={paused ? faPlay : faPause} />
            </button>
            <button
              className="btn btn-xs btn-ghost opacity-60 hover:opacity-100"
              onClick={() => dispatch(clearLogEntries())}
              title="Clear log"
            >
              <FontAwesomeIcon icon={faTrashCan} />
            </button>
            {onExpandedChange && (
              <button
                className="btn btn-xs btn-ghost opacity-60 hover:opacity-100"
                onClick={() => { onExpandedChange(!expanded); }}
                title={expanded ? "Collapse" : "Expand to full screen"}
              >
                <FontAwesomeIcon icon={expanded ? faCompress : faExpand} />
              </button>
            )}
          </div>
        </div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className={`bg-base-300 rounded-lg p-3 overflow-y-auto ${expanded || fullHeight ? "flex-1 min-h-0" : "h-56"}`}
          style={{ fontSize: `${String(fontSize)}px` }}
        >
          {displayEntries.length === 0 ? (
            <p className="text-xs opacity-40 font-mono">No log entries yet…</p>
          ) : (
            displayEntries.map((e, i) => <EntryRow key={i} entry={e} />)
          )}
        </div>

        {!pinToBottom && (
          <button
            className="btn btn-xs btn-ghost self-end opacity-60 hover:opacity-100"
            onClick={() => {
              setPinToBottom(true)
              const el = scrollRef.current
              if (el) el.scrollTop = el.scrollHeight
            }}
          >
            ↓ scroll to bottom
          </button>
        )}
      </div>
    </div>
  )
}

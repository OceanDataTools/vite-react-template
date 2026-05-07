import type { JSX } from "react"
import { useRef, useState, useEffect } from "react"
import { useLocalStorage } from "../hooks/useLocalStorage"
import { useLocation } from "react-router-dom"
import { useAppSelector } from "../app/hooks"
import type { RootState } from "../app/store"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faExpand, faCompress, faArrowUpRightFromSquare, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons"
import { EntryRow } from "./LogPanel"
import { apiUrl } from "../utils/api"

const CDS_STATUS_BADGE: Record<string, string> = {
  RUNNING:  "badge-success",
  STARTING: "badge-warning",
  FAILED:   "badge-error",
  EXITED:   "badge-ghost",
}

type SelectedLogger = {
  id: string
  activeConfig: string | null
  statusLabel: string
  badgeClass: string
}

export function LoggerStatusPanel({
  fullHeight = false,
  expanded = false,
  onExpandedChange,
}: {
  fullHeight?: boolean
  expanded?: boolean
  onExpandedChange?: (v: boolean) => void
} = {}): JSX.Element {
  const { pathname } = useLocation()
  const [tileRem, setTileRem] = useLocalStorage("loggerStatusPanel.tileRem", 22)

  const loggers         = useAppSelector((s: RootState) => s.openrvdas.loggers)
  const loggerStatuses  = useAppSelector((s: RootState) => s.openrvdas.loggerStatuses)
  const loggerLastLevel = useAppSelector((s: RootState) => s.openrvdas.loggerLastLevel)
  const logEntries      = useAppSelector((s: RootState) => s.openrvdas.logEntries)

  const modalRef = useRef<HTMLDialogElement>(null)
  const logContainerRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState<SelectedLogger | null>(null)
  const [configJson, setConfigJson] = useState<string | null>(null)
  const [configLoading, setConfigLoading] = useState(false)

  const openModal = (logger: SelectedLogger) => {
    setSelected(logger)
    setConfigJson(null)
    if (logger.activeConfig) {
      setConfigLoading(true)
      fetch(apiUrl(`/configs/${encodeURIComponent(logger.activeConfig)}`))
        .then(r => r.json())
        .then((d: { config_json?: string }) => {
          try {
            setConfigJson(JSON.stringify(JSON.parse(d.config_json ?? ""), null, 2))
          } catch {
            setConfigJson(d.config_json ?? "")
          }
        })
        .catch(() => { setConfigJson("Failed to load config."); })
        .finally(() => { setConfigLoading(false); })
    }
    modalRef.current?.showModal()
  }

  const outerClass = expanded
    ? "flex-1 flex flex-col min-h-0 bg-base-200"
    : `card bg-base-200 shadow-sm border border-base-300 ${fullHeight ? "flex-1 flex flex-col min-h-0" : ""}`
  const innerClass = expanded
    ? "flex-1 flex flex-col min-h-0 space-y-2 py-3 px-5"
    : `card-body py-3 px-5 space-y-2 ${fullHeight ? "flex-1 flex flex-col min-h-0" : ""}`

  const recentEntries = selected
    ? logEntries
        .filter(e =>
          e.source === selected.id ||
          (e.source === "logger_manager" && e.message.includes(selected.id))
        )
        .slice(-30)
        .sort((a, b) => a.timestamp - b.timestamp)
    : []

  useEffect(() => {
    const el = logContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [recentEntries.length, selected?.id])

  return (
    <>
      <div className={outerClass}>
        <div className={innerClass}>
          <div className="flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <h2 className="card-title text-base font-semibold">Loggers</h2>
              {pathname !== "/status" && (
                <button
                  className="btn btn-ghost btn-xs opacity-40 hover:opacity-100"
                  onClick={() => window.open("/status", "_blank")}
                  title="Open in new window"
                >
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={7}
                max={22}
                step={0.5}
                value={tileRem}
                onChange={e => { setTileRem(Number(e.target.value)); }}
                className="range range-xs w-24 opacity-60 hover:opacity-100"
                title="Tile size"
              />
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

          <div className={`overflow-y-auto ${expanded || fullHeight ? "flex-1 min-h-0" : ""}`}>
            {loggers.length === 0 ? (
              <p className="text-sm opacity-50">No loggers configured</p>
            ) : (
              <div
                className="grid gap-3"
                style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${String(tileRem)}rem, 1fr))` }}
              >
                {(() => {
                  const t = (tileRem - 7) / 15
                  const nameFontSize   = `${(0.65 + t * 0.55).toFixed(2)}rem`
                  const configFontSize = `${(0.55 + t * 0.35).toFixed(2)}rem`
                  const iconFontSize   = `${(0.60 + t * 0.50).toFixed(2)}rem`
                  const badgeSizeClass = tileRem < 10 ? "badge-xs" : tileRem < 15 ? "badge-sm" : "badge-md"

                  return loggers.map(logger => {
                    const cdsEntry = loggerStatuses[logger.id]
                    const statusIsFresh =
                      logger.active_config != null &&
                      cdsEntry?.config === logger.active_config
                    const effectiveStatus = statusIsFresh ? (cdsEntry?.status ?? null) : null
                    const badgeClass = effectiveStatus
                      ? (CDS_STATUS_BADGE[effectiveStatus] ?? "badge-ghost")
                      : (logger.running ? "badge-success" : "badge-ghost")
                    const statusLabel = effectiveStatus ?? (logger.running ? "RUNNING" : "EXITED")

                    const lvl = loggerLastLevel[logger.id]
                    const hasWarning = lvl != null && lvl.levelno >= 30
                    const isError = hasWarning && lvl.levelno >= 40

                    return (
                      <div
                        key={logger.id}
                        className="bg-base-300 border border-base-content/10 p-3 flex flex-col gap-1 min-w-0 cursor-pointer hover:bg-base-content/10 transition-colors"
                        onClick={() => { openModal({ id: logger.id, activeConfig: logger.active_config, statusLabel, badgeClass }); }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {hasWarning && (
                            <FontAwesomeIcon
                              icon={faTriangleExclamation}
                              style={{ fontSize: iconFontSize }}
                              className={`shrink-0 ${isError ? "text-error" : "text-warning"}`}
                            />
                          )}
                          <span className="font-mono font-medium shrink-0" style={{ fontSize: nameFontSize }}>
                            {logger.id}
                          </span>
                          <span className={`badge ${badgeSizeClass} ${badgeClass} shrink-0 ml-auto`}>
                            {statusLabel}
                          </span>
                        </div>
                        {logger.active_config && (
                          <span className="font-mono opacity-40 truncate" style={{ fontSize: configFontSize }} title={logger.active_config}>
                            {logger.active_config}
                          </span>
                        )}
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Logger detail modal */}
      <dialog ref={modalRef} className="modal">
        <div className="modal-box max-w-2xl flex flex-col max-h-[80vh]">
          {selected && (
            <>
              <div className="flex items-center gap-3 mb-4 shrink-0">
                <h3 className="font-bold text-lg font-mono">{selected.id}</h3>
                <span className={`badge badge-sm ${selected.badgeClass}`}>{selected.statusLabel}</span>
              </div>

              {/* Recent log entries */}
              <h4 className="font-semibold text-sm mb-1 shrink-0">Recent logs</h4>
              <div ref={logContainerRef} className="bg-base-300 rounded-lg p-3 mb-4 overflow-y-auto shrink-0 max-h-48 text-xs">
                {recentEntries.length === 0
                  ? <p className="text-xs opacity-40 font-mono">No log entries.</p>
                  : recentEntries.map((e, i) => <EntryRow key={i} entry={e} />)
                }
              </div>

              {/* Config JSON */}
              <h4 className="font-semibold text-sm mb-1 shrink-0">
                Config
                {selected.activeConfig && (
                  <span className="font-mono font-normal opacity-50 ml-2">{selected.activeConfig}</span>
                )}
              </h4>
              <div className="flex-1 overflow-y-auto min-h-0">
                {!selected.activeConfig ? (
                  <p className="text-xs opacity-40 font-mono">No active config.</p>
                ) : configLoading ? (
                  <div className="flex justify-center py-6">
                    <span className="loading loading-spinner loading-sm" />
                  </div>
                ) : (
                  <pre className="bg-base-300 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap break-words">
                    {configJson}
                  </pre>
                )}
              </div>
            </>
          )}
          <div className="modal-action mt-3 shrink-0">
            <form method="dialog">
              <button className="btn btn-sm">Close</button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </>
  )
}

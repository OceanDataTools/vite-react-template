import type { JSX } from "react"
import { useState } from "react"
import { useLocalStorage } from "../hooks/useLocalStorage"
import { useLocation } from "react-router-dom"
import { useAppSelector } from "../app/hooks"
import type { RootState } from "../app/store"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faExpand, faCompress, faArrowUpRightFromSquare, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons"
import { LoggerDetailModal } from "./LoggerDetailModal"

const CDS_STATUS_BADGE: Record<string, string> = {
  RUNNING:  "badge-success",
  STARTING: "badge-warning",
  FAILED:   "badge-error",
  EXITED:   "badge-ghost",
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

  const loggers        = useAppSelector((s: RootState) => s.openrvdas.loggers)
  const loggerStatuses = useAppSelector((s: RootState) => s.openrvdas.loggerStatuses)
  const loggerLastLevel = useAppSelector((s: RootState) => s.openrvdas.loggerLastLevel)

  const [detailLogger, setDetailLogger] = useState<string | null>(null)

  const outerClass = expanded
    ? "flex-1 flex flex-col min-h-0 bg-base-200"
    : `card bg-base-200 shadow-sm border border-base-300 ${fullHeight ? "flex-1 flex flex-col min-h-0" : ""}`
  const innerClass = expanded
    ? "flex-1 flex flex-col min-h-0 space-y-2 py-3 px-5"
    : `card-body py-3 px-5 space-y-2 ${fullHeight ? "flex-1 flex flex-col min-h-0" : ""}`

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
                    const cdsEntry = loggerStatuses[logger.id] as (typeof loggerStatuses)[string] | undefined
                    const statusIsFresh =
                      logger.active_config != null &&
                      cdsEntry?.config === logger.active_config
                    const effectiveStatus = statusIsFresh ? cdsEntry.status : null
                    const badgeClass = effectiveStatus
                      ? (CDS_STATUS_BADGE[effectiveStatus] ?? "badge-ghost")
                      : (logger.running ? "badge-success" : "badge-ghost")
                    const statusLabel = effectiveStatus ?? (logger.running ? "RUNNING" : "EXITED")

                    const lvl = loggerLastLevel[logger.id] as (typeof loggerLastLevel)[string] | undefined
                    const hasWarning = lvl != null && lvl.levelno >= 30
                    const isError = hasWarning && lvl.levelno >= 40

                    return (
                      <div
                        key={logger.id}
                        className="bg-base-300 border border-base-content/10 p-3 flex flex-col gap-1 min-w-0 cursor-pointer hover:bg-base-content/10 transition-colors"
                        onClick={() => { setDetailLogger(logger.id); }}
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

      <LoggerDetailModal loggerId={detailLogger} onClose={() => { setDetailLogger(null); }} />
    </>
  )
}

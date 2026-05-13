import type { JSX } from "react"
import { useRef, useState, useEffect } from "react"
import { useAppSelector } from "../app/hooks"
import type { RootState } from "../app/store"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCopy, faCheck } from "@fortawesome/free-solid-svg-icons"
import { dump as yamlDump } from "js-yaml"
import { EntryRow } from "./LogPanel"
import { useAuthFetch } from "../hooks/useAuthFetch"

const CDS_STATUS_BADGE: Record<string, string> = {
  RUNNING:  "badge-success",
  STARTING: "badge-warning",
  FAILED:   "badge-error",
  EXITED:   "badge-ghost",
}

type Props = {
  loggerId: string | null
  onClose: () => void
}

export function LoggerDetailModal({ loggerId, onClose }: Props): JSX.Element {
  const dialogRef      = useRef<HTMLDialogElement>(null)
  const logContainerRef = useRef<HTMLDivElement>(null)
  // Stable ref so the native close listener doesn't need to be re-registered
  // each time the parent re-renders with a new inline onClose arrow function.
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  const loggers        = useAppSelector((s: RootState) => s.openrvdas.loggers)
  const loggerStatuses = useAppSelector((s: RootState) => s.openrvdas.loggerStatuses)
  const logEntries     = useAppSelector((s: RootState) => s.openrvdas.logEntries)

  const [configJson, setConfigJson]     = useState<string | null>(null)
  const [configLoading, setConfigLoading] = useState(false)
  const [configCopied, setConfigCopied]   = useState(false)

  const { authFetch } = useAuthFetch()

  // Register the native close event listener once — handles Escape, backdrop, Close button.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const handler = () => { onCloseRef.current() }
    dialog.addEventListener("close", handler)
    return () => { dialog.removeEventListener("close", handler) }
  }, [])

  // Show or close the native <dialog> in sync with loggerId.
  useEffect(() => {
    if (loggerId) {
      if (!dialogRef.current?.open) dialogRef.current?.showModal()
    } else {
      if (dialogRef.current?.open) dialogRef.current.close()
    }
  }, [loggerId])

  // Fetch config whenever the selected logger changes.
  useEffect(() => {
    if (!loggerId) return
    const activeConfig = loggers.find(l => l.id === loggerId)?.active_config ?? null
    setConfigJson(null)
    setConfigCopied(false)
    if (!activeConfig) return
    setConfigLoading(true)
    authFetch(`/configs/${encodeURIComponent(activeConfig)}`)
      .then(r => r.json())
      .then((d: { config_json?: string }) => { setConfigJson(d.config_json ?? "") })
      .catch(() => { setConfigJson("Failed to load config.") })
      .finally(() => { setConfigLoading(false) })
  }, [loggerId, loggers, authFetch])

  // Auto-scroll log entries to bottom.
  useEffect(() => {
    const el = logContainerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [logEntries.length, loggerId])

  const logger = loggerId ? (loggers.find(l => l.id === loggerId) ?? null) : null
  const cdsEntry = logger
    ? (loggerStatuses[logger.id] as (typeof loggerStatuses)[string] | undefined)
    : undefined
  const statusIsFresh = logger?.active_config != null && cdsEntry?.config === logger.active_config
  const effectiveStatus = statusIsFresh ? cdsEntry.status : null
  const badgeClass = effectiveStatus
    ? (CDS_STATUS_BADGE[effectiveStatus] ?? "badge-ghost")
    : (logger?.running ? "badge-success" : "badge-ghost")
  const statusLabel = effectiveStatus ?? (logger?.running ? "RUNNING" : "EXITED")

  const recentEntries = loggerId
    ? logEntries
        .filter(e =>
          e.source === loggerId ||
          (e.source === "logger_manager" && e.message.includes(loggerId))
        )
        .slice(-30)
        .sort((a, b) => a.timestamp - b.timestamp)
    : []

  const configYaml = (() => {
    try { return yamlDump(JSON.parse(configJson ?? "")) } catch { return configJson }
  })()

  return (
    <dialog ref={dialogRef} className="modal">
      <div className="modal-box max-w-2xl flex flex-col max-h-[80vh]">
        {logger && (
          <>
            <div className="flex items-center gap-3 mb-4 shrink-0">
              <h3 className="font-bold text-lg font-mono">{logger.id}</h3>
              <span className={`badge badge-sm ${badgeClass}`}>{statusLabel}</span>
            </div>

            <h4 className="font-semibold text-sm mb-1 shrink-0">Recent logs</h4>
            <div ref={logContainerRef} className="bg-base-300 rounded-lg p-3 mb-4 overflow-y-auto shrink-0 max-h-48 text-xs">
              {recentEntries.length === 0
                ? <p className="text-xs opacity-40 font-mono">No log entries.</p>
                : recentEntries.map((e, i) => <EntryRow key={i} entry={e} />)
              }
            </div>

            <div className="flex items-center justify-between shrink-0 mb-1">
              <h4 className="font-semibold text-sm">
                Config
                {logger.active_config && (
                  <span className="font-mono font-normal opacity-50 ml-2">{logger.active_config}</span>
                )}
              </h4>
              {logger.active_config && !configLoading && configJson && (
                <button
                  className="btn btn-ghost btn-sm btn-square"
                  title="Copy to clipboard"
                  onClick={() => {
                    void navigator.clipboard.writeText(configYaml ?? "").then(() => {
                      setConfigCopied(true)
                      setTimeout(() => { setConfigCopied(false) }, 2000)
                    })
                  }}
                >
                  <FontAwesomeIcon icon={configCopied ? faCheck : faCopy} className={configCopied ? "text-success" : ""} />
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {!logger.active_config ? (
                <p className="text-xs opacity-40 font-mono">No active config.</p>
              ) : configLoading ? (
                <div className="flex justify-center py-6">
                  <span className="loading loading-spinner loading-sm" />
                </div>
              ) : (
                <pre className="bg-base-300 rounded-lg p-3 text-xs font-mono whitespace-pre-wrap break-words">
                  {configYaml}
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
  )
}

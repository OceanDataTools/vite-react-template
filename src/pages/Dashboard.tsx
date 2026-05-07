import type { JSX } from "react"
import { useEffect, useRef, useState } from "react"
import { useAppDispatch, useAppSelector } from "../app/hooks"
import type { RootState } from "../app/store"
import {
  clearError,
  clearLoadConfigError,
  optimisticallyActivateMode,
  optimisticallyActivateConfig,
} from "../features/openrvdas/openrvdasSlice"
import {
  fetchCruiseThunk,
  fetchModesThunk,
  fetchLoggersThunk,
  activateModeThunk,
  activateConfigThunk,
  loadConfigurationThunk,
} from "../features/openrvdas/openrvdasThunks"
import { useLoggerStateWS } from "../hooks/useLoggerStateWS"
import { ConfigFileBrowser } from "../components/ConfigFileBrowser"
import { LogPanel, EntryRow } from "../components/LogPanel"
import { apiUrl } from "../utils/api"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCircleInfo, faTriangleExclamation, faArrowUpRightFromSquare, faFileCircleExclamation } from "@fortawesome/free-solid-svg-icons"

const FALLBACK_POLL_MS = 60_000

function formatDate(iso: string | null): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const CDS_STATUS_BADGE: Record<string, string> = {
  RUNNING:  "badge-success",
  STARTING: "badge-warning",
  FAILED:   "badge-error",
  EXITED:   "badge-ghost",
}


export const Dashboard = (): JSX.Element => {
  const dispatch = useAppDispatch()
  const { cruise, modes, loggers, loggerStatuses, loggerLastLevel, logEntries, loading, activatingCount, error, loadingConfig, loadConfigError } =
    useAppSelector((state: RootState) => state.openrvdas)
  const configFileChanged = cruise?.config_file_changed ?? false
  const activating = activatingCount > 0
  const isAuthenticated = useAppSelector(
    (state: RootState) => !!state.auth.token,
  )

  const dialogRef = useRef<HTMLDialogElement>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const token = useAppSelector((state: RootState) => state.auth.token)

  const logHistoryRef = useRef<HTMLDialogElement>(null)
  const [logHistoryLogger, setLogHistoryLogger] = useState<string | null>(null)
  const logHistoryBottomRef = useRef<HTMLDivElement>(null)

  const openLogHistory = (loggerId: string) => {
    setLogHistoryLogger(loggerId)
    logHistoryRef.current?.showModal()
  }

  useEffect(() => {
    if (logHistoryRef.current?.open) {
      logHistoryBottomRef.current?.scrollIntoView({ behavior: "instant" })
    }
  }, [logHistoryLogger, logEntries.length])

  const configViewRef = useRef<HTMLDialogElement>(null)
  const [viewConfigId, setViewConfigId] = useState<string | null>(null)
  const [viewConfigJson, setViewConfigJson] = useState<string | null>(null)
  const [viewConfigLoading, setViewConfigLoading] = useState(false)

  const openConfigView = (configId: string) => {
    setViewConfigId(configId)
    setViewConfigJson(null)
    setViewConfigLoading(true)
    configViewRef.current?.showModal()
    fetch(apiUrl(`/configs/${encodeURIComponent(configId)}`))
      .then(r => r.json())
      .then((d: { config_json?: string }) => {
        try {
          setViewConfigJson(JSON.stringify(JSON.parse(d.config_json ?? ""), null, 2))
        } catch {
          setViewConfigJson(d.config_json ?? "")
        }
      })
      .catch(() => { setViewConfigJson("Failed to load config."); })
      .finally(() => { setViewConfigLoading(false); })
  }

  const [loggerFilter, setLoggerFilter] = useState("")

  const openLoadModal = () => {
    setSelectedFile(null)
    void dispatch(clearLoadConfigError())
    dialogRef.current?.showModal()
  }

  const closeLoadModal = () => {
    dialogRef.current?.close()
  }

  const handleLoadSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || loadingConfig) return
    void dispatch(loadConfigurationThunk(selectedFile)).then(result => {
      if (loadConfigurationThunk.fulfilled.match(result)) closeLoadModal()
    })
  }

  const wsStatus = useLoggerStateWS()
  const backendConnected = wsStatus === "connected" || wsStatus === "degraded"

  useEffect(() => {
    void dispatch(fetchCruiseThunk())
    void dispatch(fetchModesThunk())
    void dispatch(fetchLoggersThunk())

    const interval = setInterval(() => {
      void dispatch(fetchCruiseThunk())
      void dispatch(fetchModesThunk())
      void dispatch(fetchLoggersThunk())
    }, FALLBACK_POLL_MS)

    return () => { clearInterval(interval) }
  }, [dispatch])

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      {error && (
        <div role="alert" className="alert alert-error">
          <span>{error}</span>
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => void dispatch(clearError())}
          >
            ✕
          </button>
        </div>
      )}

      {/* Cruise Info */}
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body py-4 px-5">
          <div className="flex items-center justify-between">
            <h2 className="card-title text-base font-semibold">Cruise</h2>
            {isAuthenticated && (
              <button
                className="btn btn-xs btn-ghost"
                disabled={!backendConnected}
                onClick={openLoadModal}
              >
                Load config
              </button>
            )}
          </div>
          {cruise ? (
            <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm">
              <span>
                <span className="opacity-50 mr-1">ID</span>
                <span className="font-mono font-medium">{cruise.cruise_id}</span>
              </span>
              <span>
                <span className="opacity-50 mr-1">Start</span>
                {formatDate(cruise.start)}
              </span>
              <span>
                <span className="opacity-50 mr-1">End</span>
                {formatDate(cruise.end)}
              </span>
              <span className="flex items-center gap-2">
                <span className="opacity-50 mr-1">Config</span>
                <span className="font-mono">{cruise.config_filename ?? "—"}</span>
                {configFileChanged && (
                  <button
                    className="badge badge-warning badge-sm gap-1 cursor-pointer hover:badge-success disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Config file has changed on disk since it was loaded"
                    disabled={!isAuthenticated || !backendConnected || loadingConfig}
                    onClick={() => {
                      if (cruise.config_filename) {
                        void dispatch(loadConfigurationThunk(cruise.config_filename))
                      }
                    }}
                  >
                    <FontAwesomeIcon icon={faFileCircleExclamation} />
                    file changed, click to apply updates
                  </button>
                )}
              </span>
            </div>
          ) : (
            <p className="text-sm opacity-50">No cruise loaded</p>
          )}
        </div>
      </div>

      {/* Mode Selector */}
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body py-4 px-5">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="card-title text-base font-semibold">Mode</h2>
            {activating && (
              <span className="loading loading-spinner loading-xs opacity-60" />
            )}
            {!isAuthenticated && modes.length > 0 && (
              <span className="text-xs opacity-40">log in to change</span>
            )}
          </div>

          {loading && modes.length === 0 ? (
            <span className="loading loading-spinner loading-sm" />
          ) : modes.length === 0 ? (
            <p className="text-sm opacity-50">No modes configured</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {modes.map(mode => (
                <button
                  key={mode.id}
                  className={`btn btn-sm ${
                    mode.active
                      ? "btn-primary"
                      : "btn-ghost border border-base-300 hover:border-primary"
                  }`}
                  disabled={!isAuthenticated || !backendConnected || activating || mode.active}
                  onClick={() => {
                    if (activating) return
                    dispatch(optimisticallyActivateMode(mode.id))
                    void dispatch(activateModeThunk(mode.id))
                  }}
                  title={!isAuthenticated ? "Log in to change mode" : undefined}
                >
                  {mode.active && <span>✓</span>}
                  <span className="font-mono">{mode.id}</span>
                  {mode.default && (
                    <span className="badge badge-ghost badge-xs">default</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Logger Table */}
      <div className="card bg-base-200 shadow-sm">
        <div className="card-body py-4 px-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <h2 className="card-title text-base font-semibold">Loggers</h2>
              <button
                className="btn btn-ghost btn-xs opacity-40 hover:opacity-100"
                onClick={() => window.open("/status", "_blank")}
                title="Open logger status in new window"
              >
                <FontAwesomeIcon icon={faArrowUpRightFromSquare} />
              </button>
            </div>
            {loggers.length > 0 && (
              <input
                type="text"
                className="input input-xs input-bordered font-mono w-40"
                placeholder="filter loggers…"
                value={loggerFilter}
                onChange={e => { setLoggerFilter(e.target.value); }}
              />
            )}
          </div>

          {loading && loggers.length === 0 ? (
            <span className="loading loading-spinner loading-sm" />
          ) : loggers.length === 0 ? (
            <p className="text-sm opacity-50">No loggers configured</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th className="w-1/4">Logger</th>
                    <th>Active Config</th>
                    <th className="w-24 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loggers.filter(l => l.id.toLowerCase().includes(loggerFilter.toLowerCase())).map(logger => {
                    const cdsEntry = loggerStatuses[logger.id]
                    // Only trust CDS status if it matches the currently active config,
                    // so stale data from the previous config doesn't linger after a reload.
                    const statusIsFresh =
                      logger.active_config != null &&
                      cdsEntry.config === logger.active_config
                    const effectiveStatus = statusIsFresh ? cdsEntry.status : null
                    const badgeClass = effectiveStatus
                      ? (CDS_STATUS_BADGE[effectiveStatus] ?? "badge-ghost")
                      : (logger.running ? "badge-success" : "badge-ghost")
                    const statusLabel = effectiveStatus ?? (logger.running ? "running" : "EXITED")
                    return (
                      <tr key={logger.id} className="hover">
                        <td className="font-mono text-sm">
                          <div className="flex items-center gap-1.5">
                            {(() => {
                              const lvl = loggerLastLevel[logger.id]
                              if (lvl.levelno < 30) return null
                              const isError = lvl.levelno >= 40
                              return (
                                <button
                                  className="btn btn-ghost btn-xs p-0 min-h-0 h-auto"
                                  onClick={() => { openLogHistory(logger.id); }}
                                  title={`Last message: ${lvl.levelname} — click to view recent logs`}
                                >
                                  <FontAwesomeIcon
                                    icon={faTriangleExclamation}
                                    className={isError ? "text-error" : "text-warning"}
                                  />
                                </button>
                              )
                            })()}
                            {logger.id}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            {isAuthenticated && logger.configs.length > 1 ? (
                              <select
                                className="select select-xs select-bordered font-mono w-full max-w-xs"
                                value={logger.active_config ?? ""}
                                disabled={!backendConnected || activating}
                                onChange={e => {
                                  if (activating) return
                                  dispatch(
                                    optimisticallyActivateConfig({
                                      loggerId: logger.id,
                                      configId: e.target.value,
                                    }),
                                  )
                                  void dispatch(activateConfigThunk(e.target.value))
                                }}
                              >
                                {logger.configs.map(configId => (
                                  <option key={configId} value={configId}>
                                    {configId}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="font-mono text-sm">
                                {logger.active_config ?? "—"}
                              </span>
                            )}
                            {logger.active_config && (
                              <button
                                className="btn btn-ghost btn-xs opacity-40 hover:opacity-100 shrink-0"
                                onClick={() => { if (logger.active_config) openConfigView(logger.active_config) }}
                                title="View config JSON"
                              >
                                <FontAwesomeIcon icon={faCircleInfo} size="2x" />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="text-center">
                          <span className={`badge badge-sm ${badgeClass}`}>
                            {statusLabel}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      <LogPanel />

      {/* Load Config Modal */}
      <dialog ref={dialogRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Load Configuration</h3>
          <form onSubmit={handleLoadSubmit} className="space-y-4">
            {token && (
              <ConfigFileBrowser
                token={token}
                selected={selectedFile}
                onSelect={setSelectedFile}
              />
            )}
            {loadConfigError && (
              <div role="alert" className="alert alert-error text-sm py-2">
                <span>{loadConfigError}</span>
              </div>
            )}
            <div className="modal-action mt-2">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={closeLoadModal}
                disabled={loadingConfig}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary btn-sm"
                disabled={!selectedFile || loadingConfig}
              >
                {loadingConfig && (
                  <span className="loading loading-spinner loading-xs" />
                )}
                Load
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* Config JSON Modal */}
      <dialog ref={configViewRef} className="modal">
        <div className="modal-box max-w-2xl">
          <h3 className="font-bold text-lg mb-3 font-mono">{viewConfigId}</h3>
          {viewConfigLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-md" />
            </div>
          ) : (
            <pre className="bg-base-300 rounded-lg p-4 text-xs font-mono overflow-auto max-h-[60vh] whitespace-pre-wrap break-words">
              {viewConfigJson}
            </pre>
          )}
          <div className="modal-action mt-3">
            <form method="dialog">
              <button className="btn btn-sm">Close</button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* Logger Log History Modal */}
      <dialog ref={logHistoryRef} className="modal">
        <div className="modal-box max-w-4xl w-full">
          <h3 className="font-bold text-lg mb-3 font-mono">{logHistoryLogger}</h3>
          <div className="bg-base-300 rounded-lg p-3 space-y-0.5 max-h-[75vh] overflow-y-auto text-xs">
            {logHistoryLogger && (() => {
              const id = logHistoryLogger
              const recent = logEntries
                .filter(e =>
                  e.source === id ||
                  (e.source === "logger_manager" && e.message.includes(id))
                )
                .slice(-30)
                .sort((a, b) => a.timestamp - b.timestamp)
              return recent.length === 0
                ? <p className="text-xs opacity-40 font-mono">No log entries yet.</p>
                : recent.map((e, i) => <EntryRow key={i} entry={e} />)
            })()}
            <div ref={logHistoryBottomRef} />
          </div>
          <div className="modal-action mt-3">
            <form method="dialog">
              <button className="btn btn-sm">Close</button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  )
}

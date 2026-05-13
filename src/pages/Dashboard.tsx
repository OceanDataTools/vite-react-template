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
  previewConfigurationThunk,
} from "../features/openrvdas/openrvdasThunks"
import type { ConfigPreview } from "../features/openrvdas/openrvdasThunks"
import { useLoggerStateWS } from "../hooks/useLoggerStateWS"
import { ConfigFileBrowser } from "../components/ConfigFileBrowser"
import { LogPanel, EntryRow } from "../components/LogPanel"
import { useAuthFetch } from "../hooks/useAuthFetch"
import { dump as yamlDump } from "js-yaml"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCircleInfo, faTriangleExclamation, faArrowUpRightFromSquare, faFileCircleExclamation, faCopy, faCheck } from "@fortawesome/free-solid-svg-icons"

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

  const { authFetch } = useAuthFetch()
  const configViewRef = useRef<HTMLDialogElement>(null)
  const [viewConfigId, setViewConfigId] = useState<string | null>(null)
  const [viewConfigJson, setViewConfigJson] = useState<string | null>(null)
  const [viewConfigLoading, setViewConfigLoading] = useState(false)
  const [viewConfigTab, setViewConfigTab] = useState<"json" | "yaml">("json")
  const [viewConfigCopied, setViewConfigCopied] = useState(false)

  const cruiseConfigViewRef = useRef<HTMLDialogElement>(null)
  const [cruiseConfigPreview, setCruiseConfigPreview] = useState<ConfigPreview | null>(null)
  const [cruiseConfigLoading, setCruiseConfigLoading] = useState(false)
  const [cruiseConfigError, setCruiseConfigError] = useState<string | null>(null)
  const [cruiseConfigTab, setCruiseConfigTab] = useState<"json" | "yaml">("json")
  const [cruiseConfigCopied, setCruiseConfigCopied] = useState(false)

  const openConfigView = (configId: string) => {
    setViewConfigId(configId)
    setViewConfigJson(null)
    setViewConfigLoading(true)
    setViewConfigTab("json")
    configViewRef.current?.showModal()
    authFetch(`/configs/${encodeURIComponent(configId)}`)
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

  const openCruiseConfigView = async () => {
    if (!cruise?.config_filename) return
    setCruiseConfigPreview(null)
    setCruiseConfigError(null)
    setCruiseConfigLoading(true)
    setCruiseConfigTab("json")
    cruiseConfigViewRef.current?.showModal()
    const result = await dispatch(previewConfigurationThunk(cruise.config_filename))
    setCruiseConfigLoading(false)
    if (previewConfigurationThunk.fulfilled.match(result)) {
      setCruiseConfigPreview(result.payload)
    } else {
      setCruiseConfigError((result.payload) ?? result.error.message ?? "Failed to load config")
    }
  }

  const [loggerFilter, setLoggerFilter] = useState("")

  const [previewStep, setPreviewStep] = useState<"select" | "preview">("select")
  const [previewing, setPreviewing] = useState(false)
  const [preview, setPreview] = useState<ConfigPreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewCanGoBack, setPreviewCanGoBack] = useState(true)
  const [fileChangedChecking, setFileChangedChecking] = useState(false)

  const openLoadModal = () => {
    setSelectedFile(null)
    setPreviewStep("select")
    setPreview(null)
    setPreviewError(null)
    setPreviewCanGoBack(true)
    void dispatch(clearLoadConfigError())
    dialogRef.current?.showModal()
  }

  const closeLoadModal = () => {
    dialogRef.current?.close()
  }

  const handlePreview = async () => {
    if (!selectedFile || previewing) return
    setPreviewing(true)
    setPreviewError(null)
    const result = await dispatch(previewConfigurationThunk(selectedFile))
    setPreviewing(false)
    if (previewConfigurationThunk.fulfilled.match(result)) {
      setPreview(result.payload)
      setPreviewStep("preview")
    } else {
      setPreviewError((result.payload) ?? result.error.message ?? "Preview failed")
    }
  }

  const handleFileChangedReload = async () => {
    if (!cruise?.config_filename || fileChangedChecking) return
    setFileChangedChecking(true)
    const result = await dispatch(previewConfigurationThunk(cruise.config_filename))
    setFileChangedChecking(false)
    if (previewConfigurationThunk.fulfilled.match(result)) {
      const p = result.payload
      if (p.errors.length === 0) {
        void dispatch(loadConfigurationThunk(cruise.config_filename))
      } else {
        setSelectedFile(cruise.config_filename)
        setPreview(p)
        setPreviewStep("preview")
        setPreviewCanGoBack(false)
        setPreviewError(null)
        void dispatch(clearLoadConfigError())
        dialogRef.current?.showModal()
      }
    } else {
      setSelectedFile(cruise.config_filename)
      setPreviewError((result.payload) ?? result.error.message ?? "Preview failed")
      setPreviewStep("select")
      void dispatch(clearLoadConfigError())
      dialogRef.current?.showModal()
    }
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
      <div className="card bg-base-200 shadow-sm border border-base-300">
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
                <span className="font-mono">{cruise.config_filename
                  ? (() => {
                      const parts = cruise.config_filename.split("/")
                      const idx = parts.findIndex(p => p === "local" || p === "test")
                      return idx >= 0 ? parts.slice(idx).join("/") : cruise.config_filename
                    })()
                  : "—"}</span>
                {cruise.config_filename && isAuthenticated && (
                  <button
                    className="btn btn-ghost btn-xs opacity-40 hover:opacity-100 p-0 min-h-0 h-auto"
                    onClick={() => void openCruiseConfigView()}
                    title="View processed config"
                  >
                    <FontAwesomeIcon icon={faCircleInfo} size="lg" />
                  </button>
                )}
                {configFileChanged && (
                  <button
                    className="badge badge-warning badge-sm gap-1 cursor-pointer hover:badge-success disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Config file has changed on disk — click to validate and apply"
                    disabled={!isAuthenticated || !backendConnected || loadingConfig || fileChangedChecking}
                    onClick={() => void handleFileChangedReload()}
                  >
                    {fileChangedChecking
                      ? <span className="loading loading-spinner loading-xs" />
                      : <FontAwesomeIcon icon={faFileCircleExclamation} />
                    }
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
      <div className="card bg-base-200 shadow-sm border border-base-300">
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
      <div className="card bg-base-200 shadow-sm border border-base-300">
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
                    const cdsEntry = loggerStatuses[logger.id] as (typeof loggerStatuses)[string] | undefined
                    // Only trust CDS status if it matches the currently active config,
                    // so stale data from the previous config doesn't linger after a reload.
                    const statusIsFresh =
                      logger.active_config != null &&
                      cdsEntry?.config === logger.active_config
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
                              const lvl = loggerLastLevel[logger.id] as (typeof loggerLastLevel)[string] | undefined
                              if (!lvl || lvl.levelno < 30) return null
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
        <div className={`modal-box flex flex-col ${previewStep === "preview" ? "max-w-3xl max-h-[85vh]" : ""}`}>

          {/* Step 1: file selection */}
          {previewStep === "select" && (
            <>
              <h3 className="font-bold text-lg mb-4">Load Configuration</h3>
              <div className="space-y-4">
                {(
                  <ConfigFileBrowser
                    selected={selectedFile}
                    onSelect={setSelectedFile}
                  />
                )}
                {previewError && (
                  <div role="alert" className="alert alert-error text-sm py-2">
                    <span>{previewError}</span>
                  </div>
                )}
                <div className="modal-action mt-2">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={closeLoadModal}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={!selectedFile || previewing}
                    onClick={() => void handlePreview()}
                  >
                    {previewing && <span className="loading loading-spinner loading-xs" />}
                    Preview
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Step 2: preview result */}
          {previewStep === "preview" && preview && (
            <>
              <h3 className="font-bold text-lg mb-1 shrink-0">Configuration Preview</h3>
              <p className="text-sm opacity-60 font-mono mb-3 shrink-0">{selectedFile}</p>

              {preview.errors.length > 0 && (
                <div className="mb-3 shrink-0">
                  <p className="text-sm font-semibold text-error mb-1">Errors ({preview.errors.length})</p>
                  <ul className="bg-error/10 border border-error/30 rounded p-2 space-y-1">
                    {preview.errors.map((e, i) => (
                      <li key={i} className="text-xs font-mono text-error">{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {preview.warnings.length > 0 && (
                <div className="mb-3 shrink-0">
                  <p className="text-sm font-semibold text-warning mb-1">Warnings ({preview.warnings.length})</p>
                  <ul className="bg-warning/10 border border-warning/30 rounded p-2 space-y-1">
                    {preview.warnings.map((w, i) => (
                      <li key={i} className="text-xs font-mono text-warning">{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-sm font-semibold mb-1 shrink-0">Processed Configuration</p>
              <div className="flex-1 overflow-y-auto min-h-0">
                <pre className="bg-base-300 rounded p-3 text-xs font-mono whitespace-pre-wrap break-words">
                  {JSON.stringify(preview.config, null, 2)}
                </pre>
              </div>

              {loadConfigError && (
                <div role="alert" className="alert alert-error text-sm py-2 mt-3 shrink-0">
                  <span>{loadConfigError}</span>
                </div>
              )}

              <div className="modal-action mt-3 shrink-0">
                {previewCanGoBack && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setPreviewStep("select"); setPreview(null); }}
                    disabled={loadingConfig}
                  >
                    Back
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={closeLoadModal}
                  disabled={loadingConfig}
                >
                  {previewCanGoBack ? "Cancel" : "Close"}
                </button>
                {previewCanGoBack && preview.errors.length === 0 && (
                  <form onSubmit={handleLoadSubmit}>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm"
                      disabled={loadingConfig}
                    >
                      {loadingConfig && <span className="loading loading-spinner loading-xs" />}
                      Apply Configuration
                    </button>
                  </form>
                )}
              </div>
            </>
          )}
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* Config JSON Modal */}
      <dialog ref={configViewRef} className="modal">
        <div className="modal-box max-w-2xl flex flex-col max-h-[85vh]">
          <h3 className="font-bold text-lg mb-3 font-mono shrink-0">{viewConfigId}</h3>
          {viewConfigLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-md" />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between shrink-0 mb-2">
                <div role="tablist" className="tabs tabs-border">
                  <button role="tab" className={`tab ${viewConfigTab === "json" ? "tab-active" : ""}`} onClick={() => { setViewConfigTab("json"); }}>JSON</button>
                  <button role="tab" className={`tab ${viewConfigTab === "yaml" ? "tab-active" : ""}`} onClick={() => { setViewConfigTab("yaml"); }}>YAML</button>
                </div>
                <button
                  className="btn btn-ghost btn-sm btn-square"
                  title="Copy to clipboard"
                  onClick={() => {
                    const text = viewConfigTab === "json"
                      ? (viewConfigJson ?? "")
                      : (() => { try { return yamlDump(JSON.parse(viewConfigJson ?? "")) } catch { return viewConfigJson ?? "" } })()
                    void navigator.clipboard.writeText(text).then(() => {
                      setViewConfigCopied(true)
                      setTimeout(() => { setViewConfigCopied(false); }, 2000)
                    })
                  }}
                >
                  <FontAwesomeIcon icon={viewConfigCopied ? faCheck : faCopy} className={viewConfigCopied ? "text-success" : ""} />
                </button>
              </div>
              <pre className="bg-base-300 rounded-lg p-4 text-xs font-mono overflow-auto flex-1 min-h-0 whitespace-pre-wrap break-words">
                {viewConfigTab === "json"
                  ? viewConfigJson
                  : (() => { try { return yamlDump(JSON.parse(viewConfigJson ?? "")) } catch { return viewConfigJson } })()
                }
              </pre>
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

      {/* Cruise Processed Config Modal */}
      <dialog ref={cruiseConfigViewRef} className="modal">
        <div className="modal-box max-w-3xl max-h-[85vh] flex flex-col">
          <h3 className="font-bold text-lg mb-1 shrink-0">Processed Configuration</h3>
          <p className="text-sm opacity-60 font-mono mb-3 shrink-0">{cruise?.config_filename}</p>
          {cruiseConfigLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-md" />
            </div>
          ) : cruiseConfigError ? (
            <div role="alert" className="alert alert-error text-sm py-2">
              <span>{cruiseConfigError}</span>
            </div>
          ) : cruiseConfigPreview && (
            <>
              {cruiseConfigPreview.errors.length > 0 && (
                <div className="mb-3 shrink-0">
                  <p className="text-sm font-semibold text-error mb-1">Errors ({cruiseConfigPreview.errors.length})</p>
                  <ul className="bg-error/10 border border-error/30 rounded p-2 space-y-1">
                    {cruiseConfigPreview.errors.map((e, i) => (
                      <li key={i} className="text-xs font-mono text-error">{e}</li>
                    ))}
                  </ul>
                </div>
              )}
              {cruiseConfigPreview.warnings.length > 0 && (
                <div className="mb-3 shrink-0">
                  <p className="text-sm font-semibold text-warning mb-1">Warnings ({cruiseConfigPreview.warnings.length})</p>
                  <ul className="bg-warning/10 border border-warning/30 rounded p-2 space-y-1">
                    {cruiseConfigPreview.warnings.map((w, i) => (
                      <li key={i} className="text-xs font-mono text-warning">{w}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex items-center justify-between shrink-0 mb-2">
                <div role="tablist" className="tabs tabs-border">
                  <button role="tab" className={`tab ${cruiseConfigTab === "json" ? "tab-active" : ""}`} onClick={() => { setCruiseConfigTab("json"); }}>JSON</button>
                  <button role="tab" className={`tab ${cruiseConfigTab === "yaml" ? "tab-active" : ""}`} onClick={() => { setCruiseConfigTab("yaml"); }}>YAML</button>
                </div>
                <button
                  className="btn btn-ghost btn-sm btn-square"
                  title="Copy to clipboard"
                  onClick={() => {
                    const text = cruiseConfigTab === "json"
                      ? JSON.stringify(cruiseConfigPreview.config, null, 2)
                      : yamlDump(cruiseConfigPreview.config)
                    void navigator.clipboard.writeText(text).then(() => {
                      setCruiseConfigCopied(true)
                      setTimeout(() => { setCruiseConfigCopied(false); }, 2000)
                    })
                  }}
                >
                  <FontAwesomeIcon icon={cruiseConfigCopied ? faCheck : faCopy} className={cruiseConfigCopied ? "text-success" : ""} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto min-h-0">
                <pre className="bg-base-300 rounded p-3 text-xs font-mono whitespace-pre-wrap break-words">
                  {cruiseConfigTab === "json"
                    ? JSON.stringify(cruiseConfigPreview.config, null, 2)
                    : yamlDump(cruiseConfigPreview.config)
                  }
                </pre>
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

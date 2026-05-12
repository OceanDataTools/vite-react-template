import type { JSX } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useAppSelector } from "../app/hooks"
import type { RootState } from "../app/store"
import { AppConfig } from "../config"
import { apiUrl } from "../utils/api"
import { dump as yamlDump } from "js-yaml"

const TEMPLATES: Record<string, string> = {
  "Serial Port": `class: SerialReader
kwargs:
  port: /dev/ttyUSB0
  baudrate: 9600`,

  "UDP Port": `class: UDPReader
kwargs:
  port: 55001`,

  "CDS Key": `class: CachedDataReader
kwargs:
  data_server: localhost:8766
  subscription:
    fields:
      FieldName:
        seconds: 0`,
}

type LogEntry = {
  id: number
  kind: "record" | "status" | "error"
  text: string
  ts: string
}

function toWsBase(): string {
  return AppConfig.apiBaseUrl
    .replace(/^https/, "wss")
    .replace(/^http/, "ws")
}

let nextId = 0

type ImportLogger = { id: string; configs: string[] }
type ImportReader = Record<string, unknown>

function readerLabel(reader: ImportReader): string {
  const cls = typeof reader.class === "string" ? reader.class : "Unknown"
  const kwargs = reader.kwargs as Record<string, unknown> | undefined
  if (!kwargs) return cls
  const summary = Object.entries(kwargs).slice(0, 2).map(([k, v]) => `${k}: ${String(v)}`).join(", ")
  return summary ? `${cls} — ${summary}` : cls
}

export const TestConnectionPage = (): JSX.Element => {
  const token = useAppSelector((state: RootState) => state.auth.token)

  const [activeTemplate, setActiveTemplate] = useState("Serial Port")
  const [configYaml, setConfigYaml] = useState(TEMPLATES["Serial Port"])
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<LogEntry[]>([])

  const wsRef = useRef<WebSocket | null>(null)
  const stoppedRef = useRef(false)
  const logScrollRef = useRef<HTMLDivElement | null>(null)

  const importRef = useRef<HTMLDialogElement>(null)
  const [importStep, setImportStep] = useState<"select" | "reader">("select")
  const [importLoggers, setImportLoggers] = useState<ImportLogger[] | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importSelectedConfig, setImportSelectedConfig] = useState<string | null>(null)
  const [importReaders, setImportReaders] = useState<ImportReader[]>([])

  useEffect(() => {
    const el = logScrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [log])

  const appendEntry = useCallback((kind: LogEntry["kind"], text: string) => {
    const ts = new Date().toISOString().replace("T", " ").slice(0, 23)
    setLog(prev => [...prev, { id: nextId++, kind, text, ts }])
  }, [])

  const selectTemplate = (name: string) => {
    setActiveTemplate(name)
    setConfigYaml(TEMPLATES[name])
  }

  const openImport = () => {
    setImportStep("select")
    setImportLoggers(null)
    setImportError(null)
    setImportLoading(true)
    importRef.current?.showModal()
    fetch(apiUrl("/loggers/"), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then((data: ImportLogger[]) => setImportLoggers(data))
      .catch(() => setImportError("Failed to load loggers"))
      .finally(() => setImportLoading(false))
  }

  const applyReader = (reader: ImportReader) => {
    setConfigYaml(yamlDump(reader).trimEnd())
    setActiveTemplate("")
    importRef.current?.close()
  }

  const selectConfig = (configId: string) => {
    setImportLoading(true)
    setImportError(null)
    fetch(apiUrl(`/configs/${encodeURIComponent(configId)}`), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then((d: { config_json?: string }) => {
        const parsed = JSON.parse(d.config_json ?? "{}") as Record<string, unknown>
        const readers = Array.isArray(parsed.readers) ? (parsed.readers as ImportReader[]) : []
        if (readers.length === 0) {
          setImportError(`No readers found in "${configId}"`)
        } else {
          setConfigYaml(yamlDump(readers[0]).trimEnd())
          setActiveTemplate("")
          if (readers.length === 1) {
            importRef.current?.close()
          } else {
            setImportSelectedConfig(configId)
            setImportReaders(readers)
            setImportStep("reader")
          }
        }
      })
      .catch(() => setImportError(`Failed to load config "${configId}"`))
      .finally(() => setImportLoading(false))
  }

  const start = useCallback(() => {
    if (!token) { appendEntry("error", "Not authenticated"); return }

    stoppedRef.current = false
    const ws = new WebSocket(`${toWsBase()}/api/v1/ws/test-connection?token=${token}`)
    wsRef.current = ws

    ws.onopen = () => {
      ws.send(JSON.stringify({ action: "start", config_yaml: configYaml }))
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as { type: string; data?: string; message?: string }
        if (msg.type === "record") {
          appendEntry("record", msg.data ?? "")
        } else if (msg.type === "status") {
          appendEntry("status", msg.message ?? "")
          if (msg.message === "stopped") {
            stoppedRef.current = true
            setRunning(false)
            wsRef.current = null
          }
        } else if (msg.type === "error") {
          appendEntry("error", msg.message ?? "Unknown error")
          setRunning(false)
          wsRef.current = null
        }
      } catch {
        appendEntry("error", `Unparseable message: ${event.data as string}`)
      }
    }

    ws.onerror = () => { appendEntry("error", "WebSocket error"); setRunning(false); wsRef.current = null }

    ws.onclose = () => {
      if (!stoppedRef.current) appendEntry("status", "Connection closed")
      setRunning(false)
      wsRef.current = null
    }

    setRunning(true)
  }, [token, configYaml, appendEntry])

  const stop = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ action: "stop" }))
  }, [])

  useEffect(() => () => { wsRef.current?.close() }, [])

  const kindClass = (kind: LogEntry["kind"]) =>
    kind === "error" ? "text-error" : kind === "status" ? "text-info" : ""

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">Test Connection</h1>

      <div className="card bg-base-200 shadow-sm border border-base-300">
        <div className="card-body py-4 px-5 space-y-4">

          {/* Template picker */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Reader type</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {Object.keys(TEMPLATES).map(name => (
                <button
                  key={name}
                  type="button"
                  className={`btn btn-sm ${activeTemplate === name ? "btn-primary" : "btn-ghost border border-base-300"}`}
                  onClick={() => selectTemplate(name)}
                  disabled={running}
                >
                  {name}
                </button>
              ))}
              <button
                type="button"
                className="btn btn-sm btn-ghost border border-base-300"
                onClick={openImport}
                disabled={running}
              >
                Import from config…
              </button>
            </div>
          </div>

          {/* YAML editor */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Reader config (YAML)</span>
            </label>
            <textarea
              className="textarea textarea-bordered font-mono text-sm h-36 resize-y"
              value={configYaml}
              onChange={e => setConfigYaml(e.target.value)}
              disabled={running}
              spellCheck={false}
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-3 pt-1">
            {!running ? (
              <button type="button" className="btn btn-primary btn-sm" onClick={start}>
                Start
              </button>
            ) : (
              <button type="button" className="btn btn-error btn-sm" onClick={stop}>
                Stop
              </button>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setLog([])}
              disabled={running}
            >
              Clear log
            </button>
            {running && (
              <span className="badge badge-info gap-1 text-xs">
                <span className="loading loading-ring loading-xs" />
                Streaming
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Live log */}
      <div className="card bg-base-200 shadow-sm border border-base-300">
        <div className="card-body py-3 px-4">
          <div ref={logScrollRef} className="font-mono text-sm h-80 overflow-y-auto space-y-0.5">
            {log.length === 0 && (
              <p className="text-base-content/40 italic text-xs">No records yet.</p>
            )}
            {log.map(entry => (
              <div key={entry.id} className={`leading-snug ${kindClass(entry.kind)}`}>
                <span className="opacity-40 mr-2 text-xs">{entry.ts}</span>
                {entry.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Import reader modal */}
      <dialog ref={importRef} className="modal">
        <div className="modal-box max-w-lg flex flex-col max-h-[80vh]">
          <h3 className="font-bold text-lg mb-4 shrink-0">
            {importStep === "select" ? "Import Reader from Config" : "Select Reader"}
          </h3>

          {importLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-md" />
            </div>
          ) : importError ? (
            <div role="alert" className="alert alert-error text-sm py-2 mb-3">
              <span>{importError}</span>
            </div>
          ) : importStep === "select" ? (
            <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
              {importLoggers?.length === 0 && (
                <p className="text-sm opacity-60 italic">No loggers found.</p>
              )}
              {importLoggers?.map(logger => (
                <div key={logger.id}>
                  <p className="text-sm font-semibold mb-1">{logger.id}</p>
                  <div className="flex flex-wrap gap-1">
                    {logger.configs.map(configId => (
                      <button
                        key={configId}
                        type="button"
                        className="btn btn-xs btn-ghost border border-base-300 font-mono"
                        onClick={() => selectConfig(configId)}
                      >
                        {configId}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
              <p className="text-xs opacity-60 font-mono mb-3">{importSelectedConfig}</p>
              {importReaders.map((reader, i) => (
                <button
                  key={i}
                  type="button"
                  className="btn btn-sm btn-ghost border border-base-300 w-full justify-start font-mono text-left normal-case"
                  onClick={() => applyReader(reader)}
                >
                  {readerLabel(reader)}
                </button>
              ))}
            </div>
          )}

          <div className="modal-action mt-4 shrink-0">
            {importStep === "reader" && (
              <button
                type="button"
                className="btn btn-ghost btn-sm mr-auto"
                onClick={() => { setImportStep("select"); setImportError(null); }}
              >
                ← Back
              </button>
            )}
            <form method="dialog">
              <button className="btn btn-sm">Cancel</button>
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

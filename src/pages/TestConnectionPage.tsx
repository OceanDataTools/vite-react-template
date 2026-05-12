import type { JSX } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useAppSelector } from "../app/hooks"
import type { RootState } from "../app/store"
import { AppConfig } from "../config"

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

export const TestConnectionPage = (): JSX.Element => {
  const token = useAppSelector((state: RootState) => state.auth.token)

  const [activeTemplate, setActiveTemplate] = useState("Serial Port")
  const [configYaml, setConfigYaml] = useState(TEMPLATES["Serial Port"])
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<LogEntry[]>([])

  const wsRef = useRef<WebSocket | null>(null)
  const stoppedRef = useRef(false)
  const logEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [log])

  const appendEntry = useCallback((kind: LogEntry["kind"], text: string) => {
    const ts = new Date().toISOString().replace("T", " ").slice(0, 23)
    setLog(prev => [...prev, { id: nextId++, kind, text, ts }])
  }, [])

  const selectTemplate = (name: string) => {
    setActiveTemplate(name)
    setConfigYaml(TEMPLATES[name])
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
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-bold">Test Connection</h1>

      <div className="card bg-base-200 shadow-sm border border-base-300">
        <div className="card-body py-4 px-5 space-y-4">

          {/* Template picker */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Reader type</span>
            </label>
            <div className="flex gap-2">
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
          <div className="font-mono text-sm h-80 overflow-y-auto space-y-0.5">
            {log.length === 0 && (
              <p className="text-base-content/40 italic text-xs">No records yet.</p>
            )}
            {log.map(entry => (
              <div key={entry.id} className={`leading-snug ${kindClass(entry.kind)}`}>
                <span className="opacity-40 mr-2 text-xs">{entry.ts}</span>
                {entry.text}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      </div>
    </div>
  )
}

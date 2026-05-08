import type { JSX } from "react"
import { useEffect, useRef, useState } from "react"
import { useAppSelector } from "../app/hooks"
import type { RootState } from "../app/store"
import { apiUrl } from "../utils/api"

type ConnectionType = "serial" | "udp" | "cds"

type TestResult = {
  success: boolean
  messages: string[]
  error: string | null
}

type PortConflict = {
  in_use: true
  logger_id: string
  active_config_id: string
  off_config_id: string | null
}

const BAUD_RATES = [300, 600, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200]
const DURATIONS = [5, 10, 15, 30]

export const TestConnectionPage = (): JSX.Element => {
  const token = useAppSelector((state: RootState) => state.auth.token)

  const [connType, setConnType] = useState<ConnectionType>("serial")
  const [serialPort, setSerialPort] = useState("")
  const [baudRate, setBaudRate] = useState("9600")
  const [serialPorts, setSerialPorts] = useState<string[]>([])
  const [portsLoading, setPortsLoading] = useState(false)
  const [portsError, setPortsError] = useState<string | null>(null)
  const [udpHost, setUdpHost] = useState("")
  const [udpPort, setUdpPort] = useState("")
  const [cdsKey, setCdsKey] = useState("")
  const [cdsUrl, setCdsUrl] = useState("localhost:8766")
  const [cdsFields, setCdsFields] = useState<string[]>([])
  const [cdsFieldsLoading, setCdsFieldsLoading] = useState(false)
  const [cdsFieldsError, setCdsFieldsError] = useState<string | null>(null)
  const [duration, setDuration] = useState(5)

  const [checking, setChecking] = useState(false)
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [result, setResult] = useState<TestResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [conflict, setConflict] = useState<PortConflict | null>(null)
  const conflictModalRef = useRef<HTMLDialogElement>(null)

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const authHeaders = { Authorization: `Bearer ${token ?? ""}` }

  const udpPortNum = Number(udpPort)
  const canSubmit =
    !loading && !checking && (
      (connType === "serial" && !!serialPort) ||
      (connType === "udp" && !!udpPort && udpPortNum >= 1025 && udpPortNum <= 65535) ||
      (connType === "cds" && !!cdsKey && !!cdsUrl)
    )

  // ── Serial port list ──────────────────────────────────────────────────────

  const fetchSerialPorts = () => {
    setPortsLoading(true)
    setPortsError(null)
    fetch(apiUrl("/connection/serial-ports"), { headers: authHeaders })
      .then(r =>
        r.ok
          ? r.json()
          : r.json().then((d: { detail?: string }) => {
              throw new Error(d.detail ?? `HTTP ${r.status}`)
            }),
      )
      .then((d: { ports: string[] }) => {
        setSerialPorts(d.ports ?? [])
        if (!serialPort && (d.ports ?? []).length > 0) setSerialPort(d.ports[0])
      })
      .catch((e: unknown) => {
        setSerialPorts([])
        setPortsError(e instanceof Error ? e.message : "Failed to load ports")
      })
      .finally(() => { setPortsLoading(false) })
  }

  useEffect(() => {
    if (connType === "serial" && token) fetchSerialPorts()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connType, token])

  // ── CDS field list ────────────────────────────────────────────────────────

  const fetchCdsFields = (url?: string) => {
    const target = url ?? cdsUrl
    setCdsFieldsLoading(true)
    setCdsFieldsError(null)
    const params = new URLSearchParams({ cds_url: target })
    fetch(`${apiUrl("/connection/cds-fields")}?${params.toString()}`, { headers: authHeaders })
      .then(r => r.ok ? r.json() : r.json().then((d: { detail?: string }) => { throw new Error(d.detail ?? "Failed") }))
      .then((d: { fields: string[] }) => {
        setCdsFields(d.fields)
        if (!cdsKey && d.fields.length > 0) setCdsKey(d.fields[0])
      })
      .catch((e: unknown) => { setCdsFieldsError(e instanceof Error ? e.message : String(e)); setCdsFields([]) })
      .finally(() => { setCdsFieldsLoading(false) })
  }

  // ── Countdown ticker ──────────────────────────────────────────────────────

  const startCountdown = (secs: number) => {
    setCountdown(secs)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current)
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  // ── Build query params ────────────────────────────────────────────────────

  const buildTestParams = (overrides: Record<string, string> = {}) => {
    const params = new URLSearchParams({ conn_type: connType, duration: String(duration) })
    if (connType === "serial") { params.set("port", serialPort); params.set("baud_rate", baudRate) }
    else if (connType === "udp") { if (udpHost) params.set("host", udpHost); params.set("udp_port", udpPort) }
    else { params.set("cds_key", cdsKey); params.set("cds_url", cdsUrl) }
    Object.entries(overrides).forEach(([k, v]) => params.set(k, v))
    return params
  }

  // ── Run the actual test ───────────────────────────────────────────────────

  const runTest = async (extraParams: Record<string, string> = {}) => {
    setLoading(true)
    setResult(null)
    setError(null)
    startCountdown(duration)

    try {
      const res = await fetch(`${apiUrl("/connection/test")}?${buildTestParams(extraParams).toString()}`, {
        method: "POST",
        headers: authHeaders,
      })
      const data = await res.json() as TestResult
      if (!res.ok) {
        setError((data as unknown as { detail?: string }).detail ?? "Request failed")
      } else {
        setResult(data)
      }
    } catch {
      setError("Network error")
    } finally {
      if (countdownRef.current) clearInterval(countdownRef.current)
      setCountdown(null)
      setLoading(false)
    }
  }

  // ── "Test Connection" clicked — check port first for serial/udp ───────────

  const handleTest = async () => {
    setConflict(null)
    setResult(null)
    setError(null)

    if (connType === "serial" || connType === "udp") {
      setChecking(true)
      try {
        const params = new URLSearchParams({ conn_type: connType })
        if (connType === "serial") params.set("port", serialPort)
        else params.set("udp_port", udpPort)

        const res = await fetch(`${apiUrl("/connection/check-port")}?${params.toString()}`, { headers: authHeaders })
        const data = await res.json() as { in_use: boolean; logger_id: string | null; active_config_id: string | null; off_config_id: string | null }

        if (data.in_use && data.logger_id && data.active_config_id) {
          setConflict({ in_use: true, logger_id: data.logger_id, active_config_id: data.active_config_id, off_config_id: data.off_config_id })
          conflictModalRef.current?.showModal()
          return
        }
      } catch {
        // If the check fails, proceed anyway — the test itself will surface the error
      } finally {
        setChecking(false)
      }
    }

    await runTest()
  }

  // ── User confirmed conflict modal ─────────────────────────────────────────

  const handleConflictConfirm = async () => {
    conflictModalRef.current?.close()
    if (!conflict) return
    const overrides: Record<string, string> = {
      logger_to_pause: conflict.logger_id,
      restore_config_id: conflict.active_config_id,
    }
    if (conflict.off_config_id) overrides.off_config_id = conflict.off_config_id
    await runTest(overrides)
  }

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">Test Connection</h1>

      <div className="card bg-base-200 shadow-sm border border-base-300">
        <div className="card-body py-4 px-5 space-y-4">

          {/* Connection type selector */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Connection type</span>
            </label>
            <div className="flex gap-2">
              {(["serial", "udp", "cds"] as ConnectionType[]).map(t => (
                <button
                  key={t}
                  type="button"
                  className={`btn btn-sm ${connType === t ? "btn-primary" : "btn-ghost border border-base-300"}`}
                  onClick={() => { setConnType(t); setResult(null); setError(null) }}
                >
                  {t === "serial" ? "Serial Port" : t === "udp" ? "UDP Port" : "CDS Key"}
                </button>
              ))}
            </div>
          </div>

          {/* Serial fields */}
          {connType === "serial" && (
            <>
              <div className="form-control">
                <label className="label"><span className="label-text">Port</span></label>
                <div className="flex gap-2">
                  {serialPorts.length > 0 ? (
                    <select
                      className="select select-bordered font-mono flex-1"
                      value={serialPort}
                      onChange={e => { setSerialPort(e.target.value) }}
                      disabled={loading}
                    >
                      {serialPorts.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className="input input-bordered font-mono flex-1"
                      placeholder="/dev/ttyUSB0"
                      value={serialPort}
                      onChange={e => { setSerialPort(e.target.value) }}
                      disabled={loading}
                    />
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost btn-square"
                    title="Refresh port list"
                    disabled={portsLoading || loading}
                    onClick={fetchSerialPorts}
                  >
                    {portsLoading ? <span className="loading loading-spinner loading-xs" /> : "↻"}
                  </button>
                </div>
                {portsError && (
                  <label className="label">
                    <span className="label-text-alt text-error text-xs">{portsError}</span>
                  </label>
                )}
                {!portsError && serialPorts.length === 0 && !portsLoading && (
                  <label className="label">
                    <span className="label-text-alt opacity-50">No tty devices found — enter path manually</span>
                  </label>
                )}
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Baud rate</span></label>
                <select
                  className="select select-bordered font-mono"
                  value={baudRate}
                  onChange={e => { setBaudRate(e.target.value) }}
                  disabled={loading}
                >
                  {BAUD_RATES.map(r => <option key={r} value={String(r)}>{r}</option>)}
                </select>
              </div>
            </>
          )}

          {/* UDP fields */}
          {connType === "udp" && (
            <>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Host</span>
                  <span className="label-text-alt opacity-50">optional — defaults to 0.0.0.0</span>
                </label>
                <input
                  type="text"
                  className="input input-bordered font-mono"
                  placeholder="0.0.0.0"
                  value={udpHost}
                  onChange={e => { setUdpHost(e.target.value) }}
                  disabled={loading}
                />
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">Port</span></label>
                <input
                  type="number"
                  className="input input-bordered font-mono"
                  placeholder="55001"
                  min={1025}
                  max={65535}
                  value={udpPort}
                  onChange={e => { setUdpPort(e.target.value) }}
                  disabled={loading}
                />
              </div>
            </>
          )}

          {/* CDS fields */}
          {connType === "cds" && (
            <>
              <div className="form-control">
                <label className="label"><span className="label-text">CDS server</span></label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input input-bordered font-mono flex-1"
                    placeholder="localhost:8766"
                    value={cdsUrl}
                    onChange={e => { setCdsUrl(e.target.value); setCdsFields([]); setCdsKey(""); setCdsFieldsError(null) }}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost btn-square"
                    title="Fetch available fields from CDS"
                    disabled={cdsFieldsLoading || loading || !cdsUrl}
                    onClick={() => { fetchCdsFields() }}
                  >
                    {cdsFieldsLoading ? <span className="loading loading-spinner loading-xs" /> : "↻"}
                  </button>
                </div>
              </div>
              <div className="form-control">
                <label className="label"><span className="label-text">CDS key</span></label>
                {cdsFields.length > 0 ? (
                  <select
                    className="select select-bordered font-mono"
                    value={cdsKey}
                    onChange={e => { setCdsKey(e.target.value) }}
                    disabled={loading}
                  >
                    {cdsFields.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                ) : (
                  <input
                    type="text"
                    className="input input-bordered font-mono"
                    placeholder="sensor:gps:latitude"
                    value={cdsKey}
                    onChange={e => { setCdsKey(e.target.value) }}
                    disabled={loading}
                  />
                )}
                {cdsFieldsError && (
                  <label className="label">
                    <span className="label-text-alt text-error text-xs">{cdsFieldsError}</span>
                  </label>
                )}
                {!cdsFieldsError && cdsFields.length === 0 && (
                  <label className="label">
                    <span className="label-text-alt opacity-50 text-xs">Click ↻ to load available fields from the CDS server</span>
                  </label>
                )}
              </div>
            </>
          )}

          {/* Duration + submit */}
          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-2">
              <label className="label-text text-sm">Listen for</label>
              <select
                className="select select-bordered select-sm font-mono"
                value={duration}
                onChange={e => { setDuration(Number(e.target.value)) }}
                disabled={loading}
              >
                {DURATIONS.map(d => <option key={d} value={d}>{d}s</option>)}
              </select>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!canSubmit}
              onClick={() => void handleTest()}
            >
              {checking
                ? <><span className="loading loading-spinner loading-xs" /> Checking…</>
                : loading
                  ? <><span className="loading loading-spinner loading-xs" /> Listening{countdown !== null ? ` (${countdown}s)` : "…"}</>
                  : "Test Connection"}
            </button>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div role="alert" className="alert alert-error text-sm py-2">
          <span>{error}</span>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="card bg-base-200 shadow-sm border border-base-300">
          <div className="card-body py-4 px-5 space-y-3">
            <div className={`flex items-center gap-2 font-semibold ${result.error ? "text-error" : result.messages.length === 0 ? "text-warning" : "text-success"}`}>
              {result.error
                ? <><span>✕</span><span>Connection failed</span></>
                : result.messages.length === 0
                  ? <><span>⚠</span><span>No data received in {duration}s</span></>
                  : <><span>✓</span><span>{result.messages.length} message{result.messages.length !== 1 ? "s" : ""} received</span></>}
            </div>
            {result.error && <p className="text-sm text-error font-mono">{result.error}</p>}
            {result.messages.length > 0 && (
              <div className="bg-base-300 rounded p-3 max-h-64 overflow-y-auto space-y-1">
                {result.messages.map((msg, i) => (
                  <div key={i} className="text-xs font-mono whitespace-pre-wrap break-words">{msg}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Port conflict confirmation modal */}
      <dialog ref={conflictModalRef} className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-3">Port in use</h3>
          {conflict && (
            <div className="space-y-3 text-sm">
              <p>
                Logger <span className="font-mono font-semibold">{conflict.logger_id}</span> is
                currently bound to this port using config{" "}
                <span className="font-mono font-semibold">{conflict.active_config_id}</span>.
              </p>
              {conflict.off_config_id ? (
                <p>
                  It will be temporarily switched to{" "}
                  <span className="font-mono font-semibold">{conflict.off_config_id}</span> while
                  the test runs, then restored to{" "}
                  <span className="font-mono font-semibold">{conflict.active_config_id}</span> afterwards.
                </p>
              ) : (
                <p className="text-warning">
                  No "off" config was found for this logger. The port may not be released in time.
                </p>
              )}
            </div>
          )}
          <div className="modal-action mt-4">
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => { conflictModalRef.current?.close() }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void handleConflictConfirm()}
            >
              Proceed
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  )
}

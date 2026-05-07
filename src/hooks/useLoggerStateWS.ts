import { useEffect, useRef, useState } from "react"
import { useAppDispatch } from "../app/hooks"
import { AppConfig } from "../config"
import {
  fetchCruiseThunk,
  fetchLoggersThunk,
  fetchModesThunk,
} from "../features/openrvdas/openrvdasThunks"
import { setLoggerStatuses, addLogEntries, clearLogEntries, type LoggerStatus, type LogEntry } from "../features/openrvdas/openrvdasSlice"

// "connected"    — FastAPI WS up AND CachedDataServer reachable
// "degraded"     — FastAPI WS up BUT CachedDataServer unreachable
// "connecting"   — WS not yet open (initial connect or reconnecting)
// "disconnected" — WS closed / failed
export type WSStatus = "connected" | "degraded" | "connecting" | "disconnected"

function wsBaseUrl(): string {
  return AppConfig.apiBaseUrl.replace(/^http/, "ws")
}

export function useLoggerStateWS(): WSStatus {
  const dispatch = useAppDispatch()
  const [wsOpen, setWsOpen] = useState(false)
  const [cdsConnected, setCdsConnected] = useState<boolean | null>(null)
  const [connecting, setConnecting] = useState(true)
  const wsRef = useRef<WebSocket | null>(null)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmounted = useRef(false)
  const pendingLogClear = useRef(false)

  useEffect(() => {
    unmounted.current = false
    let retryDelay = 1_000

    function connect() {
      if (unmounted.current) return
      setConnecting(true)
      setWsOpen(false)

      const ws = new WebSocket(`${wsBaseUrl()}/api/v1/updates/ws`)
      wsRef.current = ws

      ws.onopen = () => {
        retryDelay = 1_000
        setConnecting(false)
        setWsOpen(true)
        // Defer the log clear until the first log_entries message so the clear
        // and the incoming history batch land in the same React render cycle,
        // avoiding a visible flash of empty content.
        pendingLogClear.current = true
        // Refresh all data immediately — initial fetches may have failed if the
        // backend was not yet up when the frontend started.
        void dispatch(fetchCruiseThunk())
        void dispatch(fetchModesThunk())
        void dispatch(fetchLoggersThunk())
      }

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            type: string
            cds_connected?: boolean
            data?: Record<string, LoggerStatus> | LogEntry[]
          }
          if (msg.type === "update") {
            void dispatch(fetchModesThunk())
            void dispatch(fetchLoggersThunk())
          } else if (msg.type === "status") {
            setCdsConnected(msg.cds_connected ?? null)
          } else if (msg.type === "logger_status" && msg.data) {
            dispatch(setLoggerStatuses(msg.data as Record<string, LoggerStatus>))
          } else if (msg.type === "log_entries" && msg.data) {
            if (pendingLogClear.current) {
              pendingLogClear.current = false
              dispatch(clearLogEntries())
            }
            dispatch(addLogEntries(msg.data as LogEntry[]))
          }
        } catch {
          // ignore unparseable messages
        }
      }

      ws.onerror = () => {
        ws.close()
      }

      ws.onclose = () => {
        wsRef.current = null
        if (!unmounted.current) {
          setWsOpen(false)
          setCdsConnected(null)
          setConnecting(false)
          retryTimer.current = setTimeout(connect, retryDelay)
          retryDelay = Math.min(retryDelay * 2, 30_000)
        }
      }
    }

    connect()

    return () => {
      unmounted.current = true
      if (retryTimer.current) clearTimeout(retryTimer.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [dispatch])

  if (connecting) return "connecting"
  if (!wsOpen) return "disconnected"
  if (cdsConnected === false) return "degraded"
  return "connected"
}

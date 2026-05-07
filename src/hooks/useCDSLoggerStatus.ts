import { useEffect, useRef } from "react"
import { useAppDispatch, useAppSelector } from "../app/hooks"
import { AppConfig } from "../config"
import type { RootState } from "../app/store"
import { setLoggerStatuses, clearLoggerStatuses } from "../features/openrvdas/openrvdasSlice"

function wsBaseUrl(): string {
  return AppConfig.apiBaseUrl.replace(/^http/, "ws")
}

// CDS sends data as arrays of [timestamp, value] pairs.
type CDSDataMessage = {
  type: "data"
  status: number
  data: Record<string, [number, unknown][]>
}
type CDSMessage =
  | { type: "subscribe"; status: number }
  | CDSDataMessage
  | { type: "ready" | "fields" | "describe" | "publish"; status?: number }

const READY = JSON.stringify({ type: "ready" })

export function useCDSLoggerStatus(): void {
  const dispatch = useAppDispatch()
  const token = useAppSelector((state: RootState) => state.auth.token)
  const wsRef = useRef<WebSocket | null>(null)
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmounted = useRef(false)

  useEffect(() => {
    if (!token) {
      wsRef.current?.close()
      wsRef.current = null
      dispatch(clearLoggerStatuses())
      return
    }

    unmounted.current = false
    let retryDelay = 1_000

    function connect(tkn: string) {
      if (unmounted.current) return

      const ws = new WebSocket(
        `${wsBaseUrl()}/api/v1/data-server/ws?token=${encodeURIComponent(tkn)}`,
      )
      wsRef.current = ws

      ws.onopen = () => {
        retryDelay = 1_000
        // seconds: -1 means "send most recent cached value, then all future updates"
        ws.send(
          JSON.stringify({
            type: "subscribe",
            fields: { "status:logger_status": { seconds: -1 } },
          }),
        )
      }

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string) as CDSMessage

          if (msg.type === "subscribe" && msg.status === 200) {
            // Subscribe acknowledged — request first batch of data
            ws.send(READY)
            return
          }

          if (msg.type === "data") {
            const pairs = msg.data["status:logger_status"]
            if (pairs.length > 0) {
              // Most recent value is the last pair's second element
              const value = pairs[pairs.length - 1][1] as Record<
                string,
                { config?: string; status?: string }
              >
              const statuses: Record<string, { status: string; config: string | null }> = {}
              for (const [id, info] of Object.entries(value)) {
                if (info.status) statuses[id] = { status: info.status, config: info.config ?? null }
              }
              if (Object.keys(statuses).length > 0) {
                dispatch(setLoggerStatuses(statuses))
              }
            }
            // Always request the next batch
            ws.send(READY)
          }
        } catch {
          // ignore unparseable messages
        }
      }

      ws.onerror = () => { ws.close() }

      ws.onclose = () => {
        wsRef.current = null
        if (!unmounted.current) {
          retryTimer.current = setTimeout(() => { if (token) connect(token); }, retryDelay)
          retryDelay = Math.min(retryDelay * 2, 30_000)
        }
      }
    }

    connect(token)

    return () => {
      unmounted.current = true
      if (retryTimer.current) clearTimeout(retryTimer.current)
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [dispatch, token])
}

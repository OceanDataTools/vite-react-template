import { useEffect, useRef } from "react"
import { useAppDispatch, useAppSelector } from "../../app/hooks"
import type { RootState } from "../../app/store"
import { AppConfig } from "../../config"
import {
  setWsStatus,
  updateCruiseDefinition,
  updateCruiseMode,
  updateLoggerStatus,
  type LoggerEntry,
} from "./loggerSlice"

function toWsUrl(apiBaseUrl: string): string {
  return apiBaseUrl.replace(/^https?/, match => (match === "https" ? "wss" : "ws"))
}

export function useDataServerSocket() {
  const dispatch = useAppDispatch()
  const token = useAppSelector((state: RootState) => state.auth.token)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const alive = useRef(true)

  useEffect(() => {
    if (!token) return

    alive.current = true

    function connect() {
      if (!alive.current) return

      const url = `${toWsUrl(AppConfig.apiBaseUrl)}/api/v1/ws/data-server?token=${token}`
      dispatch(setWsStatus("connecting"))

      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        if (!alive.current) {
          ws.close()
          return
        }
        dispatch(setWsStatus("connected"))
        ws.send(
          JSON.stringify({
            type: "subscribe",
            fields: {
              "status:logger_status": { seconds: -1 },
              "status:cruise_mode": { seconds: -1 },
              "status:cruise_definition": { seconds: -1 },
            },
          }),
        )
      }

      ws.onmessage = (event: MessageEvent<string>) => {
        let msg: unknown
        try {
          msg = JSON.parse(event.data)
        } catch {
          return
        }
        if (!msg || typeof msg !== "object") return
        const m = msg as { type: string; status?: number; data?: unknown }

        if (m.type === "subscribe" && m.status === 200) {
          ws.send(JSON.stringify({ type: "ready" }))
          return
        }

        if (m.type === "data" && m.status === 200 && m.data && typeof m.data === "object") {
          const data = m.data as Record<string, [number, unknown][]>

          const loggerStatus = data["status:logger_status"]
          if (loggerStatus?.length) {
            const latest = loggerStatus[loggerStatus.length - 1][1]
            if (latest) {
              dispatch(updateLoggerStatus(latest as Record<string, LoggerEntry>))
            }
          }

          const cruiseMode = data["status:cruise_mode"]
          if (cruiseMode?.length) {
            const latest = cruiseMode[cruiseMode.length - 1][1] as
              | { active_mode?: string }
              | null
              | undefined
            dispatch(updateCruiseMode(latest?.active_mode ?? null))
          }

          const cruiseDef = data["status:cruise_definition"]
          if (cruiseDef?.length) {
            const latest = cruiseDef[cruiseDef.length - 1][1]
            if (latest) {
              dispatch(updateCruiseDefinition(latest as Record<string, unknown>))
            }
          }

          ws.send(JSON.stringify({ type: "ready" }))
        }
      }

      ws.onclose = () => {
        if (!alive.current) return
        dispatch(setWsStatus("disconnected"))
        reconnectTimer.current = setTimeout(connect, 3000)
      }

      ws.onerror = () => {
        dispatch(setWsStatus("error"))
        ws.close()
      }
    }

    connect()

    return () => {
      alive.current = false
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      wsRef.current?.close()
      dispatch(setWsStatus("idle"))
    }
  }, [token, dispatch])
}

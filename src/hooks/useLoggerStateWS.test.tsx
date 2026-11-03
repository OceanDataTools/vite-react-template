import { act, renderHook } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { Provider } from "react-redux"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { App } from "../App"
import { makeStore } from "../app/store"
import { renderWithProviders } from "../utils/test-utils"
import { useLoggerStateWS } from "./useLoggerStateWS"

class FakeWebSocket {
  static instances: FakeWebSocket[] = []
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null
  url: string

  constructor(url: string) {
    this.url = url
    FakeWebSocket.instances.push(this)
  }

  close() {
    this.onclose?.()
  }

  open() {
    this.onopen?.()
  }

  send(msg: object) {
    this.onmessage?.({ data: JSON.stringify(msg) })
  }
}

const logEntry = {
  source: "logger_manager",
  timestamp: 1,
  levelname: "INFO",
  levelno: 20,
  message: "hello",
}

describe("useLoggerStateWS", () => {
  beforeEach(() => {
    FakeWebSocket.instances = []
    vi.stubGlobal("WebSocket", FakeWebSocket)
    // Thunks dispatched on open hit the backend; keep them pending.
    vi.stubGlobal("fetch", vi.fn(() => new Promise<never>(() => undefined)))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each(["/", "/logs", "/status"])("opens a single socket on %s", path => {
    window.history.pushState({}, "", path)

    renderWithProviders(<App />)

    expect(FakeWebSocket.instances).toHaveLength(1)
    expect(FakeWebSocket.instances[0].url).toMatch(/\/api\/v1\/updates\/ws$/)
  })

  it("stores each log entry once", () => {
    window.history.pushState({}, "", "/logs")

    const { store } = renderWithProviders(<App />)

    const liveEntry = { ...logEntry, timestamp: 2, message: "live" }

    // The server sends the history batch on connect, then broadcasts live
    // entries to every open connection.
    act(() => {
      for (const ws of FakeWebSocket.instances) {
        ws.open()
        ws.send({ type: "log_entries", data: [logEntry] })
      }
      for (const ws of FakeWebSocket.instances) {
        ws.send({ type: "log_entries", data: [liveEntry] })
      }
    })

    expect(store.getState().openrvdas.logEntries).toEqual([logEntry, liveEntry])
  })

  it("publishes connection status to the store", () => {
    const store = makeStore()
    const wrapper = ({ children }: PropsWithChildren) => (
      <Provider store={store}>{children}</Provider>
    )
    renderHook(() => { useLoggerStateWS() }, { wrapper })
    const [ws] = FakeWebSocket.instances
    const status = () => store.getState().openrvdas.wsStatus

    expect(status()).toBe("connecting")

    act(() => { ws.open() })
    expect(status()).toBe("connected")

    act(() => { ws.send({ type: "status", cds_connected: false }) })
    expect(status()).toBe("degraded")

    act(() => { ws.close() })
    expect(status()).toBe("disconnected")
  })
})

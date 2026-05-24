import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

export type LoggerEntry = {
  config: string | null
  state: string
}

export type WsStatus = "idle" | "connecting" | "connected" | "disconnected" | "error"

type LoggerState = {
  loggers: Record<string, LoggerEntry>
  cruiseMode: string | null
  cruiseDefinition: Record<string, unknown> | null
  wsStatus: WsStatus
}

const initialState: LoggerState = {
  loggers: {},
  cruiseMode: null,
  cruiseDefinition: null,
  wsStatus: "idle",
}

export const loggerSlice = createSlice({
  name: "loggers",
  initialState,
  reducers: {
    updateLoggerStatus(state, action: PayloadAction<Record<string, LoggerEntry>>) {
      state.loggers = action.payload
    },
    updateCruiseMode(state, action: PayloadAction<string | null>) {
      state.cruiseMode = action.payload
    },
    updateCruiseDefinition(state, action: PayloadAction<Record<string, unknown>>) {
      state.cruiseDefinition = action.payload
    },
    setWsStatus(state, action: PayloadAction<WsStatus>) {
      state.wsStatus = action.payload
    },
  },
})

export const {
  updateLoggerStatus,
  updateCruiseMode,
  updateCruiseDefinition,
  setWsStatus,
} = loggerSlice.actions

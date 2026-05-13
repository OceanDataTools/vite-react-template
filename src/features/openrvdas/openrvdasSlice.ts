import { createSlice } from "@reduxjs/toolkit"
import type { PayloadAction } from "@reduxjs/toolkit"
import type { Cruise, Mode, Logger } from "./openrvdasThunks"
import {
  fetchCruiseThunk,
  fetchModesThunk,
  fetchLoggersThunk,
  activateModeThunk,
  activateConfigThunk,
  loadConfigurationThunk,
} from "./openrvdasThunks"

export type LoggerStatus = { status: string; config: string | null }
export type LogEntry = {
  source: string
  timestamp: number
  levelname: string
  levelno: number
  message: string
}

const MAX_LOG_ENTRIES = 500

// Matches logger_supervisor's "Called start_logger for <id>: <config>" message,
// which is the server-side signal that a logger has been (re)started with its
// new config.  The CDS timestamp of this message becomes the clear boundary for
// that logger's warning indicator so that only post-reconfiguration errors show.
const START_LOGGER_RE = /Called start_logger for ([A-Za-z0-9_-]+):/

type OpenRVDASState = {
  cruise: Cruise | null
  modes: Mode[]
  loggers: Logger[]
  loggerStatuses: Record<string, LoggerStatus>
  logEntries: LogEntry[]
  loggerLastLevel: Record<string, { levelname: string; levelno: number }>
  // Per-logger Unix timestamp set when the supervisor acknowledges a config
  // change for that logger.  addLogEntries ignores entries older than this
  // value, so history re-delivered after a reconnect doesn't resurrect
  // indicators from before the last reconfiguration.
  loggerLastLevelClearedAt: Record<string, number>
  loading: boolean
  activatingCount: number
  error: string | null
  loadingConfig: boolean
  loadConfigError: string | null
}

const initialState: OpenRVDASState = {
  cruise: null,
  modes: [],
  loggers: [],
  loggerStatuses: {},
  logEntries: [],
  loggerLastLevel: {},
  loggerLastLevelClearedAt: {},
  loading: false,
  activatingCount: 0,
  error: null,
  loadingConfig: false,
  loadConfigError: null,
}

export const openrvdasSlice = createSlice({
  name: "openrvdas",
  initialState,
  reducers: {
    clearError(state) {
      state.error = null
    },
    clearLoadConfigError(state) {
      state.loadConfigError = null
    },
    setLoggerStatuses(state, action: PayloadAction<Record<string, LoggerStatus>>) {
      state.loggerStatuses = { ...state.loggerStatuses, ...action.payload }
    },
    clearLoggerStatuses(state) {
      state.loggerStatuses = {}
    },
    optimisticallyActivateMode(state, action: PayloadAction<string>) {
      const targetMode = state.modes.find(m => m.id === action.payload)
      if (!targetMode) return
      state.modes.forEach(m => {
        m.active = m.id === action.payload
      })
      // Update active_config for each logger; indicator clearing is deferred
      // until the supervisor's "Called start_logger" message arrives so that
      // the server-side CDS timestamp is used as the boundary (no clock skew).
      state.loggers.forEach(logger => {
        const newConfig = logger.configs.find(c => targetMode.configs.includes(c))
        if (newConfig !== undefined) logger.active_config = newConfig
      })
    },
    addLogEntries(state, action: PayloadAction<LogEntry[]>) {
      state.logEntries = [...state.logEntries, ...action.payload].slice(-MAX_LOG_ENTRIES)
      for (const entry of action.payload) {
        // Skip entries older than the last supervisor-acknowledged reconfiguration
        // for this source, so history re-delivered after a reconnect doesn't
        // resurrect indicators from before the last config change.
        if (entry.timestamp <= (state.loggerLastLevelClearedAt[entry.source] ?? 0)) continue

        // When the supervisor starts a logger with its new config, use the CDS
        // timestamp of that message as the clear boundary for that logger.
        if (entry.source === "logger_manager") {
          const m = START_LOGGER_RE.exec(entry.message)
          if (m) {
            const loggerId = m[1]
            state.loggerLastLevelClearedAt[loggerId] = entry.timestamp
            Reflect.deleteProperty(state.loggerLastLevel, loggerId)
          }
        }

        state.loggerLastLevel[entry.source] = { levelname: entry.levelname, levelno: entry.levelno }
      }
    },
    clearLogEntries(state) {
      state.logEntries = []
    },
    optimisticallyActivateConfig(
      state,
      action: PayloadAction<{ loggerId: string; configId: string }>,
    ) {
      const logger = state.loggers.find(l => l.id === action.payload.loggerId)
      // Update active_config only; indicator clearing is deferred to the
      // supervisor's "Called start_logger" message (server-side timestamp).
      if (logger) logger.active_config = action.payload.configId
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchCruiseThunk.fulfilled, (state, action) => {
        state.cruise = action.payload
      })
      .addCase(fetchModesThunk.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchModesThunk.fulfilled, (state, action) => {
        state.loading = false
        state.modes = action.payload
      })
      .addCase(fetchModesThunk.rejected, (state, action) => {
        state.loading = false
        state.error = (action.payload) ?? "Failed to fetch modes"
      })
      .addCase(fetchLoggersThunk.fulfilled, (state, action) => {
        state.loggers = action.payload
      })
      .addCase(activateModeThunk.pending, state => {
        state.activatingCount += 1
        state.error = null
      })
      .addCase(activateModeThunk.fulfilled, state => {
        state.activatingCount = Math.max(0, state.activatingCount - 1)
      })
      .addCase(activateModeThunk.rejected, (state, action) => {
        state.activatingCount = Math.max(0, state.activatingCount - 1)
        state.error = action.error.message ?? "Failed to activate mode"
      })
      .addCase(activateConfigThunk.pending, state => {
        state.activatingCount += 1
        state.error = null
      })
      .addCase(activateConfigThunk.fulfilled, state => {
        state.activatingCount = Math.max(0, state.activatingCount - 1)
      })
      .addCase(activateConfigThunk.rejected, (state, action) => {
        state.activatingCount = Math.max(0, state.activatingCount - 1)
        state.error = action.error.message ?? "Failed to activate config"
      })
      .addCase(loadConfigurationThunk.pending, state => {
        state.loadingConfig = true
        state.loadConfigError = null
      })
      .addCase(loadConfigurationThunk.fulfilled, state => {
        state.loadingConfig = false
        state.loadConfigError = null
        state.loggerStatuses = {}
        state.loggerLastLevel = {}
        state.loggerLastLevelClearedAt = {}
      })
      .addCase(loadConfigurationThunk.rejected, (state, action) => {
        state.loadingConfig = false
        state.loadConfigError = action.error.message ?? "Failed to load configuration"
      })
  },
})

export const {
  clearError,
  clearLoadConfigError,
  setLoggerStatuses,
  clearLoggerStatuses,
  addLogEntries,
  clearLogEntries,
  optimisticallyActivateMode,
  optimisticallyActivateConfig,
} = openrvdasSlice.actions
export default openrvdasSlice.reducer

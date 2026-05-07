import { createAsyncThunk } from "@reduxjs/toolkit"
import { apiUrl, fetchWithAuth } from "../../utils/api"
import type { AppDispatch, RootState } from "../../app/store"

export type Cruise = {
  cruise_id: string
  start: string | null
  end: string | null
  config_filename: string | null
  config_file_changed: boolean
}

export type Mode = {
  id: string
  active: boolean
  default: boolean
  configs: string[]
}

export type Logger = {
  id: string
  configs: string[]
  active_config: string | null
  running: boolean
}

export const fetchCruiseThunk = createAsyncThunk<Cruise>(
  "openrvdas/fetchCruise",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(apiUrl("/cruise/"))
      if (!res.ok) return rejectWithValue("Failed to fetch cruise")
      return (await res.json()) as Cruise
    } catch {
      return rejectWithValue("Network error fetching cruise")
    }
  },
)

export const fetchModesThunk = createAsyncThunk<Mode[]>(
  "openrvdas/fetchModes",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(apiUrl("/modes/"))
      if (!res.ok) return rejectWithValue("Failed to fetch modes")
      return (await res.json()) as Mode[]
    } catch {
      return rejectWithValue("Network error fetching modes")
    }
  },
)

export const fetchLoggersThunk = createAsyncThunk<Logger[]>(
  "openrvdas/fetchLoggers",
  async (_, { rejectWithValue }) => {
    try {
      const res = await fetch(apiUrl("/loggers/"))
      if (!res.ok) return rejectWithValue("Failed to fetch loggers")
      return (await res.json()) as Logger[]
    } catch {
      return rejectWithValue("Network error fetching loggers")
    }
  },
)

export const loadConfigurationThunk = createAsyncThunk<
  undefined,
  string,
  { dispatch: AppDispatch; state: RootState }
>("openrvdas/loadConfiguration", async (filepath, thunkAPI) => {
  const res = await fetchWithAuth(
    `/configuration/?config_filepath=${encodeURIComponent(filepath)}`,
    { method: "POST" },
    thunkAPI,
  )
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { detail?: string }
    throw new Error(data.detail ?? "Failed to load configuration")
  }
  await thunkAPI.dispatch(fetchCruiseThunk())
  await thunkAPI.dispatch(fetchModesThunk())
  await thunkAPI.dispatch(fetchLoggersThunk())
  return undefined
})

// Keep the UI locked for at least this long so logger_manager (250ms poll) has
// time to pick up and apply the change before a new activation can be submitted.
const MIN_ACTIVATION_MS = 1500

export const activateModeThunk = createAsyncThunk<
  undefined,
  string,
  { dispatch: AppDispatch; state: RootState }
>("openrvdas/activateMode", async (modeId, thunkAPI) => {
  const start = Date.now()
  const res = await fetchWithAuth(
    `/modes/${modeId}/activate`,
    { method: "POST" },
    thunkAPI,
  )
  if (!res.ok) throw new Error("Failed to activate mode")
  const remaining = MIN_ACTIVATION_MS - (Date.now() - start)
  if (remaining > 0) await new Promise(r => setTimeout(r, remaining))
  await thunkAPI.dispatch(fetchModesThunk())
  await thunkAPI.dispatch(fetchLoggersThunk())
  return undefined
})

export const activateConfigThunk = createAsyncThunk<
  undefined,
  string,
  { dispatch: AppDispatch; state: RootState }
>("openrvdas/activateConfig", async (configId, thunkAPI) => {
  const start = Date.now()
  const res = await fetchWithAuth(
    `/configs/${configId}/activate`,
    { method: "POST" },
    thunkAPI,
  )
  if (!res.ok) throw new Error("Failed to activate config")
  const remaining = MIN_ACTIVATION_MS - (Date.now() - start)
  if (remaining > 0) await new Promise(r => setTimeout(r, remaining))
  await thunkAPI.dispatch(fetchModesThunk())
  await thunkAPI.dispatch(fetchLoggersThunk())
  return undefined
})

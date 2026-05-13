import { createAsyncThunk } from "@reduxjs/toolkit"
import { fetchWithAuth } from "../../utils/api"
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

export const fetchCruiseThunk = createAsyncThunk<
  Cruise, undefined, { dispatch: AppDispatch; state: RootState; rejectValue: string }
>("openrvdas/fetchCruise", async (_, thunkAPI) => {
  try {
    const res = await fetchWithAuth("/cruise/", {}, thunkAPI)
    if (!res.ok) return thunkAPI.rejectWithValue("Failed to fetch cruise")
    return (await res.json()) as Cruise
  } catch {
    return thunkAPI.rejectWithValue("Network error fetching cruise")
  }
})

export const fetchModesThunk = createAsyncThunk<
  Mode[], undefined, { dispatch: AppDispatch; state: RootState; rejectValue: string }
>("openrvdas/fetchModes", async (_, thunkAPI) => {
  try {
    const res = await fetchWithAuth("/modes/", {}, thunkAPI)
    if (!res.ok) return thunkAPI.rejectWithValue("Failed to fetch modes")
    return (await res.json()) as Mode[]
  } catch {
    return thunkAPI.rejectWithValue("Network error fetching modes")
  }
})

export const fetchLoggersThunk = createAsyncThunk<
  Logger[], undefined, { dispatch: AppDispatch; state: RootState; rejectValue: string }
>("openrvdas/fetchLoggers", async (_, thunkAPI) => {
  try {
    const res = await fetchWithAuth("/loggers/", {}, thunkAPI)
    if (!res.ok) return thunkAPI.rejectWithValue("Failed to fetch loggers")
    return (await res.json()) as Logger[]
  } catch {
    return thunkAPI.rejectWithValue("Network error fetching loggers")
  }
})

export type ConfigPreview = {
  config: Record<string, unknown>
  errors: string[]
  warnings: string[]
}

export const previewConfigurationThunk = createAsyncThunk<
  ConfigPreview,
  string,
  { dispatch: AppDispatch; state: RootState; rejectValue: string }
>("openrvdas/previewConfiguration", async (filepath, thunkAPI) => {
  const res = await fetchWithAuth(
    `/configuration/preview?config_filepath=${encodeURIComponent(filepath)}`,
    { method: "POST" },
    thunkAPI,
  )
  if (!res.ok) {
    const data = await res.json().catch(() => ({})) as { detail?: string }
    return thunkAPI.rejectWithValue(data.detail ?? "Failed to preview configuration")
  }
  return res.json() as Promise<ConfigPreview>
})

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

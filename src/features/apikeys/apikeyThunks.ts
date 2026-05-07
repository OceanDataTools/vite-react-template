import { createAsyncThunk } from "@reduxjs/toolkit"
import { fetchWithAuth } from "../../utils/api"
import type { AppDispatch, RootState } from "../../app/store"

export type ApiKey = {
  id: string
  name: string
  created_at: string
  revoked: boolean
  expires_at: string | null
  permissions?: { route: string; method: string }[]
  unhashed_key?: string
}

export type ApiRoute = {
  route: string
  methods: string[]
  name: string
  summary?: string
}

export type Permission = {
  route: string
  method: string
}

type ThunkConfig = { dispatch: AppDispatch; state: RootState; rejectValue: string }

const extractError = async (res: Response, fallback: string): Promise<string> => {
  try {
    const body = await res.json()
    return (body as { detail?: string }).detail ?? fallback
  } catch {
    return fallback
  }
}

// Fetch keys
export const fetchApiKeysThunk = createAsyncThunk<ApiKey[], undefined, ThunkConfig>(
  "apikeys/fetchAll",
  async (_, thunkAPI) => {
    try {
      const response = await fetchWithAuth("/apikeys", {}, thunkAPI)
      if (!response.ok) return thunkAPI.rejectWithValue(await extractError(response, "Failed to fetch API keys"))
      return (await response.json()) as ApiKey[]
    } catch (err) {
      return thunkAPI.rejectWithValue(err instanceof Error ? err.message : "Failed to fetch API keys")
    }
  },
)

// Fetch available routes
export const fetchRoutesThunk = createAsyncThunk<ApiRoute[], undefined, ThunkConfig>(
  "apikeys/fetchRoutes",
  async (_, thunkAPI) => {
    try {
      const response = await fetchWithAuth("/apikeys/routes", {}, thunkAPI)
      if (!response.ok) return thunkAPI.rejectWithValue(await extractError(response, "Failed to fetch routes"))
      return (await response.json()) as ApiRoute[]
    } catch (err) {
      return thunkAPI.rejectWithValue(err instanceof Error ? err.message : "Failed to fetch routes")
    }
  },
)

// Create new key
export const createApiKeyThunk = createAsyncThunk<
  ApiKey,
  { name: string; permissions: Permission[]; expires_at: string | null },
  ThunkConfig
>(
  "apikeys/create",
  async (payload, thunkAPI) => {
    try {
      const response = await fetchWithAuth(
        "/apikeys",
        { method: "POST", body: JSON.stringify(payload) },
        thunkAPI,
      )
      if (!response.ok) return thunkAPI.rejectWithValue(await extractError(response, "Failed to create key"))
      return (await response.json()) as ApiKey
    } catch (err) {
      return thunkAPI.rejectWithValue(err instanceof Error ? err.message : "Failed to create key")
    }
  },
)

// Fetch routes for given key
export const fetchApiKeyRoutesThunk = createAsyncThunk<Permission[], string, ThunkConfig>(
  "apikeys/fetchKeyRoutes",
  async (id, thunkAPI) => {
    try {
      const response = await fetchWithAuth(`/apikeys/${id}/routes`, {}, thunkAPI)
      if (!response.ok) return thunkAPI.rejectWithValue(await extractError(response, "Failed to fetch key routes"))
      return (await response.json()) as Permission[]
    } catch (err) {
      return thunkAPI.rejectWithValue(err instanceof Error ? err.message : "Failed to fetch key routes")
    }
  },
)

// Revoke
export const revokeApiKeyThunk = createAsyncThunk<string, string, ThunkConfig>(
  "apikeys/revoke",
  async (id, thunkAPI) => {
    try {
      const response = await fetchWithAuth(`/apikeys/${id}/revoke`, { method: "PATCH" }, thunkAPI)
      if (!response.ok) return thunkAPI.rejectWithValue(await extractError(response, "Failed to revoke key"))
      await thunkAPI.dispatch(fetchApiKeysThunk())
      return id
    } catch (err) {
      return thunkAPI.rejectWithValue(err instanceof Error ? err.message : "Failed to revoke key")
    }
  },
)

// Reissue (update expiry + regenerate key)
export const reissueApiKeyThunk = createAsyncThunk<ApiKey, { id: string; expiresAt: string | null }, ThunkConfig>(
  "apikeys/reissue",
  async ({ id, expiresAt }, thunkAPI) => {
    try {
      const response = await fetchWithAuth(
        `/apikeys/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expires_at: expiresAt ?? null }),
        },
        thunkAPI,
      )
      if (!response.ok) return thunkAPI.rejectWithValue(await extractError(response, "Failed to reissue key"))
      const updatedKey = (await response.json()) as ApiKey
      await thunkAPI.dispatch(fetchApiKeysThunk())
      return updatedKey
    } catch (err) {
      return thunkAPI.rejectWithValue(err instanceof Error ? err.message : "Failed to reissue key")
    }
  },
)

// Delete
export const deleteApiKeyThunk = createAsyncThunk<string, string, ThunkConfig>(
  "apikeys/delete",
  async (id, thunkAPI) => {
    try {
      const response = await fetchWithAuth(`/apikeys/${id}`, { method: "DELETE" }, thunkAPI)
      if (!response.ok) return thunkAPI.rejectWithValue(await extractError(response, "Failed to delete key"))
      await thunkAPI.dispatch(fetchApiKeysThunk())
      return id
    } catch (err) {
      return thunkAPI.rejectWithValue(err instanceof Error ? err.message : "Failed to delete key")
    }
  },
)

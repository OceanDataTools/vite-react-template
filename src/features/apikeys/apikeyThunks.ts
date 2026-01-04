import { createAsyncThunk } from "@reduxjs/toolkit"
import { fetchWithAuth } from "../../utils/api"

// Define the expected shape of an API key
type ApiKey = {
  id: string
  name: string
  created_at: string
  revoked: boolean
  permissions: { route: string; method: string }[]
}

type ApiRoute = {
  route: string
  methods: string[]
  name: string
  summary?: string
}

type Permission = {
  route: string
  method: string
}

// Fetch keys
export const fetchApiKeysThunk = createAsyncThunk<ApiKey[]>(
  "apikeys/fetchAll",
  async (_, thunkAPI) => {
    const response = await fetchWithAuth("/apikeys", {}, thunkAPI)
    if (!response.ok) throw new Error("Failed to fetch API keys")

    const data = (await response.json()) as ApiRoute[]
    return data
  },
)

// Fetch available routes
export const fetchRoutesThunk = createAsyncThunk<ApiKey[]>(
  "apikeys/fetchRoutes",
  async (_, thunkAPI) => {
    const response = await fetchWithAuth("/apikeys/routes", {}, thunkAPI)
    if (!response.ok) throw new Error("Failed to fetch routes")

    const data = (await response.json()) as ApiRoute[]
    return data
  },
)

// Create new key
export const createApiKeyThunk = createAsyncThunk<ApiKey[]>(
  "apikeys/create",
  async (payload: { name: string; permissions: Permission[] }, thunkAPI) => {
    const response = await fetchWithAuth(
      "/apikeys",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      thunkAPI,
    )

    if (!response.ok) throw new Error("Failed to create key")

    const data = (await response.json()) as ApiRoute[]
    return data
  },
)

// Fetch routes for given key
export const fetchApiKeyRoutesThunk = createAsyncThunk<ApiKey[]>(
  "apikeys/fetchKeyRoutes",
  async (id: string, thunkAPI) => {
    const response = await fetchWithAuth(`/apikeys/${id}/routes`, {}, thunkAPI)
    if (!response.ok) throw new Error("Failed to fetch routes for specific key")

    const data = (await response.json()) as ApiRoute[]
    return data
  },
)

// Revoke
export const revokeApiKeyThunk = createAsyncThunk<ApiKey[]>(
  "apikeys/revoke",
  async (id: string, thunkAPI) => {
    const response = await fetchWithAuth(
      `/apikeys/${id}/revoke`,
      {
        method: "PATCH",
      },
      thunkAPI,
    )

    if (!response.ok) throw new Error("Failed to revoke key")

    await thunkAPI.dispatch(fetchApiKeysThunk())

    const data = (await response.json()) as ApiRoute[]
    return data
  },
)

// Update an existing API key (only expiresAt can be updated)
export const reissueApiKeyThunk = createAsyncThunk<ApiKey, { id: string; expiresAt: string | null }>(
  "apikeys/reissue",
  async ({ id , expiresAt }, thunkAPI) => {
    const expires_at = expiresAt || null

    const response = await fetchWithAuth(
      `/apikeys/${id}`, // PATCH endpoint for the API key
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expires_at }),
      },
      thunkAPI,
    )

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Failed to update API key: ${text}`)
    }

    const updatedKey = (await response.json()) as ApiKey

    // Optionally refresh the key list
    await thunkAPI.dispatch(fetchApiKeysThunk())

    return updatedKey
  }
)


// Delete
export const deleteApiKeyThunk = createAsyncThunk<ApiKey[]>(
  "apikeys/delete",
  async (id: string, thunkAPI) => {
    const response = await fetchWithAuth(
      `/apikeys/${id}`,
      {
        method: "DELETE",
      },
      thunkAPI,
    )

    if (!response.ok) throw new Error("Failed to delete key")

    await thunkAPI.dispatch(fetchApiKeysThunk())
  },
)

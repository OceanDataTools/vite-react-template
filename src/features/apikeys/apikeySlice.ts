import type { SerializedError } from "@reduxjs/toolkit"
import { createSlice } from "@reduxjs/toolkit"
import {
  fetchApiKeysThunk,
  fetchRoutesThunk,
  fetchApiKeyRoutesThunk,
  createApiKeyThunk,
  deleteApiKeyThunk,
} from "./apikeyThunks"
import type { ApiKey, ApiRoute, Permission } from "./apikeyThunks"

type ApiKeyState = {
  keys: ApiKey[]
  routes: ApiRoute[]
  currentKeyPermissions: Permission[] | null
  loading: boolean
  error: string | null
  revealedKey: string | null
}

const initialState: ApiKeyState = {
  keys: [],
  routes: [],
  currentKeyPermissions: null,
  loading: false,
  error: null,
  revealedKey: null,
}

export const apikeySlice = createSlice({
  name: "apikeys",
  initialState,
  reducers: {
    clearRevealedKey(state) {
      state.revealedKey = null
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchApiKeysThunk.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchApiKeysThunk.fulfilled, (state, action) => {
        state.loading = false
        state.keys = action.payload
      })
      .addCase(fetchRoutesThunk.fulfilled, (state, action) => {
        state.routes = action.payload
      })
      .addCase(createApiKeyThunk.fulfilled, (state, action) => {
        state.keys.push(action.payload)
        state.revealedKey = action.payload.unhashed_key ?? null
      })
      .addCase(deleteApiKeyThunk.fulfilled, (state, action) => {
        state.keys = state.keys.filter(k => k.id !== action.payload)
      })
      .addCase(fetchApiKeyRoutesThunk.pending, state => {
        state.loading = true
        state.error = null
        state.currentKeyPermissions = null
      })
      .addCase(fetchApiKeyRoutesThunk.fulfilled, (state, action) => {
        state.loading = false
        state.currentKeyPermissions = action.payload
      })
      .addCase(fetchApiKeyRoutesThunk.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message ?? "Failed to load API key permissions"
        state.currentKeyPermissions = null
      })

      // --- catch-all rejected matcher ---
      .addMatcher(
        (action): boolean => (action.type as string).endsWith("/rejected"),
        (state, action) => {
          state.loading = false
          state.error = (action as { error?: SerializedError }).error?.message ?? "Error occurred"
        },
      )
  },
})

export const { clearRevealedKey } = apikeySlice.actions
export default apikeySlice.reducer

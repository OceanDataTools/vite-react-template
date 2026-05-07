import { createSlice } from "@reduxjs/toolkit"
import {
  loginThunk,
  refreshTokenThunk,
  logoutThunk,
  fetchUserProfileThunk,
  updateUserProfileThunk,
  updateUserProfilePasswordThunk,
} from "./authThunks"
import type { User } from "./authThunks"

type AuthState = {
  token: string | null
  user: User | null
  loading: boolean
  error: string | null
}

// Token is persisted in localStorage so sessions survive page refreshes. This trades
// XSS exposure for UX convenience; acceptable given the app's deployment context.
const initialState: AuthState = {
  token: localStorage.getItem("token") ?? null,
  user: null,
  loading: false,
  error: null,
}

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null
    },
    logout(state) {
      state.token = null
      state.user = null
      state.error = null
    },
  },
  extraReducers: builder => {
    builder
      .addCase(loginThunk.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.token = action.payload.token
        state.loading = false
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload ?? null
      })
      .addCase(refreshTokenThunk.fulfilled, (state, action) => {
        state.token = action.payload.token
      })
      .addCase(logoutThunk.fulfilled, state => {
        state.token = null
        state.user = null
        state.error = null
      })
      .addCase(fetchUserProfileThunk.fulfilled, (state, action) => {
        state.user = action.payload
        state.error = null
      })
      .addCase(fetchUserProfileThunk.rejected, (state, action) => {
        state.user = null
        state.error = action.payload ?? null
      })
      .addCase(updateUserProfileThunk.fulfilled, (state, action) => {
        state.user = action.payload
        state.error = null
      })
      .addCase(updateUserProfilePasswordThunk.fulfilled, state => {
        state.error = null
      })
  },
})

export const { clearAuthError } = authSlice.actions

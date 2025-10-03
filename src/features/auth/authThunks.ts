import { createAsyncThunk } from "@reduxjs/toolkit"
import { apiUrl, fetchWithAuth } from "../../utils/api"
import type { RootState, AppDispatch } from "../store"

type User = {
  id?: string
  username: string
  full_name: string
  email: string
  roles?: string[]
}

// REGISTER - no token passed
export const registerUserThunk = createAsyncThunk<
  User,
  {
    username: string
    full_name: string
    email: string
    password: string
  }
>(
  "auth/register",
  async ({ username, full_name, email, password }, { rejectWithValue }) => {
    try {
      const formData = new URLSearchParams()
      formData.append("username", username)
      formData.append("full_name", full_name)
      formData.append("email", email)
      formData.append("password", password)

      const res = await fetch(apiUrl("/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, full_name, email, password }),
      })

      if (!res.ok) {
        const errorText = await res.text()
        throw new Error(errorText || "Failed to register new user")
      }

      // const data = await res.json()
      const data = (await res.json()) as User

      // await dispatch(fetchUserProfileThunk());

      return data
    } catch (err) {
      if (err instanceof Error) {
        return rejectWithValue(err.message || "Registration failed")
      }
      return rejectWithValue("Unknown error")
    }
  },
)

// LOGIN - token fetching does NOT use fetchWithAuth because no token yet
export const loginThunk = createAsyncThunk<
  { token: string },
  { username: string; password: string },
  { dispatch: AppDispatch }
>(
  "auth/login",
  async ({ username, password }, { dispatch, rejectWithValue }) => {
    try {
      const formData = new URLSearchParams()
      formData.append("username", username)
      formData.append("password", password)

      const res = await fetch(apiUrl("/auth/token"), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData.toString(),
        credentials: "include",
      })

      if (!res.ok) throw new Error("Invalid credentials")

      const data = await res.json()
      localStorage.setItem("token", data.access_token)

      // Dispatch after getting token
      await dispatch(fetchUserProfileThunk())

      return { token: data.access_token }
    } catch (err) {
      if (err instanceof Error) {
        return rejectWithValue(err.message || "Login failed")
      }
    }
  },
)

// REFRESH TOKEN - no token passed in, relies on httpOnly cookie + fetchWithAuth pattern
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export const refreshTokenThunk = createAsyncThunk<
  { token: string },
  void,
  { dispatch: AppDispatch; getState: () => RootState }
>("auth/refresh", async (_, thunkAPI) => {
  try {
    const res = await fetch(apiUrl("/auth/refresh"), {
      method: "POST",
      credentials: "include",
    })

    if (!res.ok) throw new Error("Refresh failed")

    const data = await res.json()
    localStorage.setItem("token", data.access_token)

    return { token: data.access_token }
  } catch (err) {
    if (err instanceof Error) {
      return thunkAPI.rejectWithValue(err.message || "Refresh failed")
    }
  }
})

// LOGOUT - no token refresh needed, just call endpoint
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export const logoutThunk = createAsyncThunk<
  void,
  object,
  { getState: () => RootState }
>("auth/logout", async (_, thunkAPI) => {
  try {
    await fetchWithAuth(
      "/auth/logout",
      {
        method: "POST",
        body: "{}",
      },
      thunkAPI,
    )

    localStorage.removeItem("token")
  } catch (err) {
    if (err instanceof Error) {
      return thunkAPI.rejectWithValue(err.message || "Logout failed")
    }
  }
})

// FETCH USER PROFILE - uses fetchWithAuth so token refresh auto-handled
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export const fetchUserProfileThunk = createAsyncThunk<
  User,
  void,
  { dispatch: AppDispatch; getState: () => RootState; rejectValue: string }
>("auth/fetchUserProfile", async (_, thunkAPI) => {
  try {
    const res = await fetchWithAuth("/profile", {}, thunkAPI)

    if (!res.ok) throw new Error("Failed to fetch profile")

    const data = (await res.json()) as User

    return data
  } catch (err) {
    if (err instanceof Error) {
      return thunkAPI.rejectWithValue(err.message || "Unable to fetch profile")
    }
  }
})

// UPDATE USER PROFILE - uses fetchWithAuth for automatic token refresh
export const updateUserProfileThunk = createAsyncThunk<
  User,
  { email: string; full_name: string },
  { dispatch: AppDispatch; getState: () => RootState; rejectValue: string }
>("auth/updateUser", async (updates, thunkAPI) => {
  try {
    const res = await fetchWithAuth(
      "/profile",
      {
        method: "PATCH",
        body: JSON.stringify(updates),
      },
      thunkAPI,
    )

    if (!res.ok) throw new Error("Failed to update profile")

    const data = (await res.json()) as User

    return data
  } catch (err) {
    if (err instanceof Error) {
      return thunkAPI.rejectWithValue(err.message || "Update failed")
    }
  }
})

// UPDATE USER PROFILE PASSWORD - also uses fetchWithAuth for automatic token refresh
// eslint-disable-next-line @typescript-eslint/no-invalid-void-type
export const updateUserProfilePasswordThunk = createAsyncThunk<
  void,
  { current_password: string; new_password: string },
  { dispatch: AppDispatch; getState: () => RootState; rejectValue: string }
>(
  "auth/updateUserPassword",
  async ({ current_password, new_password }, thunkAPI) => {
    try {
      const res = await fetchWithAuth(
        "/profile/change-password",
        {
          method: "POST",
          body: JSON.stringify({ current_password, new_password }),
        },
        thunkAPI,
      )

      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        const errorMsg =
          errorData?.detail ?? "Failed to change password due to server error"
        return thunkAPI.rejectWithValue(errorMsg)
      }

      return
    } catch (err) {
      if (err instanceof Error) {
        return thunkAPI.rejectWithValue(
          err.message || "Network error while changing password",
        )
      }
    }
  },
)

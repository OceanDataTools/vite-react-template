import type { AppDispatch, RootState } from "../store";
import { refreshTokenThunk, logoutThunk } from "../features/auth/authThunks";
import { AppConfig } from "../config"

export function apiUrl(path: string): string {
  return `${AppConfig.apiBaseUrl}/api/v1${path.startsWith("/") ? path : `/${path}`}`;
}

export async function fetchWithAuth(
  path: string,
  options: RequestInit = {},
  thunkAPI: { dispatch: AppDispatch; getState: () => RootState },
  alreadyRefreshed = false
): Promise<Response> {

  const { dispatch, getState } = thunkAPI;
  const url = apiUrl(path);

  const getAuthHeaders = (token: string): Record<string, string> => ({
    Authorization: `Bearer ${token}`,
    ...(options.body ? { "Content-Type": "application/json" } : {}),
  });

  const token = getState().auth?.token;
  if (!token) throw new Error("Missing access token");

  // First attempt with current access token
  const response = await fetch(url, {
    ...options,
    credentials: "include", // include httpOnly refresh cookie
    headers: {
      ...getAuthHeaders(token),
      ...(typeof options.headers === "object" && !(options.headers instanceof Headers)
        ? options.headers
        : {}),
    },
  });

  if (response.status !== 401) return response;

  if (alreadyRefreshed) {
    dispatch(logoutThunk());
    throw new Error("Token refresh failed after retry. Logged out.");
  }

  console.warn("Token expired... ", path)

  // Attempt to refresh the token
  const refreshResult = await dispatch(refreshTokenThunk());

  if (refreshResult.meta.requestStatus !== "fulfilled") {
    dispatch(logoutThunk());
    throw new Error("Token refresh failed. Logged out.");
  }

  const newToken = getState().auth.token;

  if (!newToken) {
    dispatch(logoutThunk());
    throw new Error("New access token missing after refresh. Logged out.");
  }

  // Retry the original request **only once**
  return fetchWithAuth(path, options, thunkAPI, true);

  // if (!newToken) throw new Error("New access token missing after refresh");

  // // Retry the original request with the new token
  // response = await fetch(url, {
  //   ...options,
  //   credentials: "include",
  //   headers: {
  //     ...getAuthHeaders(newToken),
  //     ...(typeof options.headers === "object" && !(options.headers instanceof Headers)
  //       ? options.headers
  //       : {}),
  //   },
  // });
  
  // return response;
}

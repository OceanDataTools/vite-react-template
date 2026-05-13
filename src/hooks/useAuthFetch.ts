import { useCallback } from "react"
import { useAppDispatch, useAppStore } from "../app/hooks"
import { fetchWithAuth } from "../utils/api"

export function useAuthFetch() {
  const store = useAppStore()
  const dispatch = useAppDispatch()

  const authFetch = useCallback(
    (path: string, options: RequestInit = {}) =>
      fetchWithAuth(path, options, { dispatch, getState: () => store.getState() }),
    [dispatch, store],
  )

  // Ensures the access token is fresh (refreshes if expired) and returns it.
  // Call before creating a WebSocket or other non-HTTP connection that embeds the token.
  const freshToken = useCallback(async (): Promise<string | null> => {
    await fetchWithAuth("/modes/", {}, { dispatch, getState: () => store.getState() })
    return store.getState().auth.token
  }, [dispatch, store])

  return { authFetch, freshToken }
}

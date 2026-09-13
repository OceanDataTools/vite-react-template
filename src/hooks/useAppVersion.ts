import { useEffect, useState } from "react"
import { apiUrl } from "../utils/api"

// Shared across every mount of useAppVersion (e.g. both App and TopNav
// mount it) so the app fetches /version at most once per page load
// instead of once per mount. Cleared on failure so a later mount can
// retry rather than being stuck reporting null for the rest of the
// session.
let versionPromise: Promise<string | null> | null = null

function fetchAppVersion(): Promise<string | null> {
  versionPromise ??= fetch(apiUrl("/version"))
    .then(res =>
      res.ok ? (res.json() as Promise<{ version?: string }>) : null,
    )
    .then(data => data?.version ?? null)
    .catch(() => {
      versionPromise = null
      return null
    })
  return versionPromise
}

export function useAppVersion(): string | null {
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    void fetchAppVersion().then(v => {
      if (!cancelled) setVersion(v)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return version
}

import { useEffect, useState } from "react"
import { apiUrl } from "../utils/api"

export function useAppVersion(): string | null {
  const [version, setVersion] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch(apiUrl("/version"))
      .then(res => (res.ok ? (res.json() as Promise<{ version?: string }>) : null))
      .then(data => {
        if (!cancelled) setVersion(data?.version ?? null)
      })
      .catch(() => {
        if (!cancelled) setVersion(null)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return version
}

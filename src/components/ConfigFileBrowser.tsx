import { useEffect, useState } from "react"
import { useAuthFetch } from "../hooks/useAuthFetch"

type FileEntry = {
  name: string
  type: "file" | "dir"
  rel_path: string
  abs_path: string | null
}

type Props = {
  selected: string | null
  onSelect: (absPath: string) => void
}

export function ConfigFileBrowser({ selected, onSelect }: Props) {
  const { authFetch } = useAuthFetch()
  const [path, setPath] = useState("")
  const [entries, setEntries] = useState<FileEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    authFetch(`/configuration/files?path=${encodeURIComponent(path)}`)
      .then(res =>
        res.ok
          ? res.json()
          : res.json().then((d: { detail?: string }) => {
              throw new Error(d.detail ?? "Failed to load files")
            }),
      )
      .then((data: { path: string; entries: FileEntry[] }) => {
        setEntries(data.entries)
      })
      .catch((e: unknown) => { setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { setLoading(false); })
  }, [path, authFetch])

  const segments = path ? path.split("/") : []

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 text-xs font-mono flex-wrap opacity-70">
        <button className="hover:opacity-100 hover:underline" onClick={() => { setPath(""); }}>
          /
        </button>
        {segments.map((seg, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span>/</span>}
            <button
              className="hover:opacity-100 hover:underline"
              onClick={() => { setPath(segments.slice(0, i + 1).join("/")); }}
            >
              {seg}
            </button>
          </span>
        ))}
      </div>

      <div className="border border-base-300 rounded-lg overflow-y-auto max-h-52">
        {loading ? (
          <div className="flex justify-center p-4">
            <span className="loading loading-spinner loading-sm" />
          </div>
        ) : error ? (
          <p className="text-error p-3 text-sm">{error}</p>
        ) : entries.length === 0 ? (
          <p className="opacity-50 p-3 text-sm">Empty directory</p>
        ) : (
          <ul className="divide-y divide-base-300">
            {entries.map(entry => (
              <li key={entry.rel_path}>
                {entry.type === "dir" ? (
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-base-200 flex items-center gap-2 text-sm font-mono"
                    onClick={() => { setPath(entry.rel_path); }}
                  >
                    <span className="opacity-40 text-xs">▶</span>
                    {entry.name}
                    <span className="opacity-40">/</span>
                  </button>
                ) : (
                  <button
                    className={`w-full text-left px-3 py-2 flex items-center gap-2 text-sm font-mono transition-colors ${
                      selected === entry.abs_path
                        ? "bg-primary/15 text-primary"
                        : "hover:bg-base-200"
                    }`}
                    onClick={() => { if (entry.abs_path) onSelect(entry.abs_path) }}
                  >
                    <span className="opacity-40 text-xs">—</span>
                    {entry.name}
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && (
        <p className="text-xs font-mono opacity-50 truncate" title={selected}>
          {selected}
        </p>
      )}
    </div>
  )
}

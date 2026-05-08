import type { JSX } from "react"
import { useState } from "react"
import { useAppSelector } from "../app/hooks"
import type { RootState } from "../app/store"
import { apiUrl } from "../utils/api"

type VerifyResult = {
  full_match: boolean
  parsed: Record<string, unknown>
  max_span: number | null
  partial_format: string | null
}

export const VerifyParserPage = (): JSX.Element => {
  const token = useAppSelector((state: RootState) => state.auth.token)

  const [rawString, setRawString] = useState("")
  const [formatString, setFormatString] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleVerify = async () => {
    if (!rawString || !formatString) return
    setLoading(true)
    setResult(null)
    setError(null)

    const params = new URLSearchParams({ format_string: formatString, raw_string: rawString })
    try {
      // fetchWithAuth needs the thunkAPI shape; call fetch directly with the token instead
      const res = await fetch(
        `${apiUrl("/configuration/verify-parser")}?${params.toString()}`,
        { method: "POST", headers: { Authorization: `Bearer ${token ?? ""}` } },
      )
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { detail?: string }
        setError(d.detail ?? "Verification failed")
      } else {
        setResult(await res.json() as VerifyResult)
      }
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = rawString.trim() !== "" && formatString.trim() !== ""

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">Verify Parser Format</h1>

      <div className="card bg-base-200 shadow-sm border border-base-300">
        <div className="card-body py-4 px-5 space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Raw data string</span>
            </label>
            <textarea
              className="textarea textarea-bordered font-mono text-sm resize-none"
              rows={3}
              placeholder="$GPGLL,2203.672,S,01759.539,W"
              value={rawString}
              onChange={e => { setRawString(e.target.value) }}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Parser format string</span>
              <span className="label-text-alt opacity-50 text-xs">PyPi parse syntax</span>
            </label>
            <textarea
              className="textarea textarea-bordered font-mono text-sm resize-none"
              rows={3}
              placeholder="$GPGLL,{Latitude:nlat},{NorS:w},{Longitude:nlat},{EorW:w}"
              value={formatString}
              onChange={e => { setFormatString(e.target.value); setResult(null); setError(null) }}
            />
            <label className="label">
              <span className="label-text-alt opacity-40 text-xs">
                Custom types: <code>od</code> <code>of</code> <code>og</code> <code>ow</code> <code>os</code> <code>nlat</code> <code>nc</code> <code>ns</code> <code>anything</code>
              </span>
            </label>
          </div>

          <div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!canSubmit || loading}
              onClick={() => void handleVerify()}
            >
              {loading && <span className="loading loading-spinner loading-xs" />}
              Verify
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="alert alert-error text-sm py-2">
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="card bg-base-200 shadow-sm border border-base-300">
          <div className="card-body py-4 px-5 space-y-4">
            {result.full_match ? (
              <div className="flex items-center gap-2 text-success font-semibold">
                <span>✓</span>
                <span>Full match</span>
              </div>
            ) : result.max_span !== null ? (
              <>
                <div className="flex items-center gap-2 text-warning font-semibold">
                  <span>⚠</span>
                  <span>Partial match — failed after character {result.max_span}</span>
                </div>
                <div className="bg-base-300 rounded p-3 font-mono text-xs space-y-0.5 overflow-x-auto">
                  <div className="whitespace-pre">{rawString}</div>
                  <div className="whitespace-pre text-error">
                    {"_".repeat(result.max_span)}^
                  </div>
                  {result.partial_format && (
                    <div className="opacity-50 mt-1">
                      Matched format: <span className="text-base-content">{result.partial_format}</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-error font-semibold">
                <span>✕</span>
                <span>No match</span>
              </div>
            )}

            {Object.keys(result.parsed).length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-1">Parsed fields</p>
                <pre className="bg-base-300 rounded p-3 text-xs font-mono whitespace-pre-wrap break-words">
                  {JSON.stringify(result.parsed, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

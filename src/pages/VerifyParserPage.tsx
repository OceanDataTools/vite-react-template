import type { JSX } from "react"
import { useEffect, useRef, useState } from "react"
import { useAuthFetch } from "../hooks/useAuthFetch"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCopy, faCheck } from "@fortawesome/free-solid-svg-icons"

type VerifyResult = {
  full_match: boolean
  parsed: Record<string, unknown>
  max_span: number | null
  partial_format: string | null
}

const KNOWN_TYPES = new Set([
  // parse built-in
  'w', 'W', 's', 'S', 'd', 'D', 'n', 'l', 'L', 'a', 'b',
  'e', 'E', 'f', 'F', 'g', 'G', 'x', 'X', 'o',
  'ti', 'te', 'tg', 'ta', 'tc', 'tt', 'th', 'ts',
  // OpenRVDAS custom
  'od', 'of', 'og', 'ow', 'os', 'nlat', 'nlat_dir', 'nc', 'ns', 'anything',
])

function validateFormatString(s: string): string[] {
  const errors: string[] = []
  let i = 0
  while (i < s.length) {
    if (s[i] === '{' && s[i + 1] === '{') { i += 2; continue }
    if (s[i] === '}' && s[i + 1] === '}') { i += 2; continue }
    if (s[i] === '}') { errors.push(`Unexpected '}' at position ${String(i + 1)}`); i++; continue }
    if (s[i] === '{') {
      const end = s.indexOf('}', i)
      if (end === -1) { errors.push(`Unclosed '{' at position ${String(i + 1)}`); break }
      const spec = s.slice(i + 1, end)
      const colon = spec.indexOf(':')
      if (colon !== -1) {
        const type = spec.slice(colon + 1).trim()
        if (type && /^[a-z_]+$/i.test(type) && !KNOWN_TYPES.has(type))
          errors.push(`Unknown type '${type}' in '{${spec}}'`)
      }
      i = end + 1; continue
    }
    i++
  }
  return errors
}

export const VerifyParserPage = (): JSX.Element => {
  const { authFetch } = useAuthFetch()

  const [rawString, setRawString] = useState(() => localStorage.getItem("verifyParser.rawString") ?? "")
  const [formatString, setFormatString] = useState(() => localStorage.getItem("verifyParser.formatString") ?? "")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerifyResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [rawCopied, setRawCopied] = useState(false)
  const [formatCopied, setFormatCopied] = useState(false)

  const guideRef = useRef<HTMLDialogElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (result) outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [result])

  const handleVerify = async () => {
    if (!rawString || !formatString) return
    setLoading(true)
    setResult(null)
    setError(null)

    const params = new URLSearchParams({ format_string: formatString, raw_string: rawString })
    try {
      const res = await authFetch(
        `/configuration/verify-parser?${params.toString()}`,
        { method: "POST" },
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

  const formatErrors = formatString ? validateFormatString(formatString) : []
  const canSubmit = rawString.trim() !== "" && formatString.trim() !== "" && formatErrors.length === 0

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 w-full">
      <h1 className="text-xl font-bold">Verify Parser Format</h1>

      <div className="card bg-base-200 shadow-sm border border-base-300">
        <div className="card-body py-4 px-5 space-y-4">
          <div className="form-control">
            <div className="flex items-center justify-between mb-1">
              <span className="label-text font-medium">Raw data string</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-square"
                title="Copy raw data string"
                disabled={!rawString}
                onClick={() => {
                  void navigator.clipboard.writeText(rawString).then(() => {
                    setRawCopied(true)
                    setTimeout(() => { setRawCopied(false) }, 2000)
                  })
                }}
              >
                <FontAwesomeIcon icon={rawCopied ? faCheck : faCopy} className={rawCopied ? "text-success" : ""} />
              </button>
            </div>
            <textarea
              className="textarea textarea-bordered font-mono text-sm resize-y w-full"
              rows={3}
              placeholder="$GPGLL,2203.672,S,01759.539,W"
              value={rawString}
              onChange={e => { setRawString(e.target.value); localStorage.setItem("verifyParser.rawString", e.target.value) }}
            />
          </div>

          <div className="form-control">
            <div className="flex items-center justify-between mb-1">
              <span className="label-text font-medium">Parser format string <span className="opacity-50 text-xs font-normal">— PyPi parse syntax</span></span>
              <button
                type="button"
                className="btn btn-ghost btn-sm btn-square"
                title="Copy format string"
                disabled={!formatString}
                onClick={() => {
                  void navigator.clipboard.writeText(formatString).then(() => {
                    setFormatCopied(true)
                    setTimeout(() => { setFormatCopied(false) }, 2000)
                  })
                }}
              >
                <FontAwesomeIcon icon={formatCopied ? faCheck : faCopy} className={formatCopied ? "text-success" : ""} />
              </button>
            </div>
            <textarea
              className={`textarea textarea-bordered font-mono text-sm resize-y w-full ${formatErrors.length > 0 ? "textarea-error" : ""}`}
              rows={3}
              placeholder="$GPGLL,{Latitude:nlat},{NorS:w},{Longitude:nlat},{EorW:w}"
              value={formatString}
              onChange={e => { setFormatString(e.target.value); localStorage.setItem("verifyParser.formatString", e.target.value); setResult(null); setError(null) }}
            />
            {formatErrors.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {formatErrors.map((err, i) => (
                  <li key={i} className="text-error text-xs font-mono">{err}</li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex items-center">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!canSubmit || loading}
              onClick={() => void handleVerify()}
            >
              {loading && <span className="loading loading-spinner loading-xs" />}
              Verify
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm opacity-60 hover:opacity-100 px-0 ml-auto"
              onClick={() => { guideRef.current?.showModal() }}
            >
              Parser type reference →
            </button>
          </div>
        </div>
      </div>

      {/* Parser type reference modal */}
      <dialog ref={guideRef} className="modal">
        <div className="modal-box max-w-2xl space-y-5">
          <h3 className="font-bold text-lg">Parser type reference</h3>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-50 mb-2">Built-in types (parse library)</p>
            <div className="overflow-x-auto">
              <table className="table table-xs font-mono w-full">
                <thead>
                  <tr><th>Type</th><th>Matches</th><th>Returns</th><th>Example</th></tr>
                </thead>
                <tbody>
                  <tr><td>d</td><td>Digits</td><td>int</td><td>42</td></tr>
                  <tr><td>f</td><td>Float</td><td>float</td><td>3.14</td></tr>
                  <tr><td>e</td><td>Scientific notation</td><td>float</td><td>2.5e3</td></tr>
                  <tr><td>g</td><td>General number</td><td>float</td><td>42 or 3.14</td></tr>
                  <tr><td>w</td><td>Letters, digits, underscore</td><td>str</td><td>hello_1</td></tr>
                  <tr><td>l</td><td>Letters only</td><td>str</td><td>abc</td></tr>
                  <tr><td>s</td><td>Whitespace</td><td>str</td><td>{"  "}</td></tr>
                  <tr><td>x</td><td>Hex integer (lowercase)</td><td>int</td><td>ff</td></tr>
                  <tr><td>o</td><td>Octal integer</td><td>int</td><td>77</td></tr>
                  <tr><td>b</td><td>Binary integer</td><td>int</td><td>1010</td></tr>
                  <tr><td>ti</td><td>ISO 8601 datetime</td><td>datetime</td><td>2021-01-01T12:00:00</td></tr>
                  <tr><td>tt</td><td>Time hh:mm:ss</td><td>time</td><td>12:30:00</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-50 mb-2">OpenRVDAS custom types</p>
            <div className="overflow-x-auto">
              <table className="table table-xs font-mono w-full">
                <thead>
                  <tr><th>Type</th><th>Description</th><th>Returns</th></tr>
                </thead>
                <tbody>
                  <tr><td>od</td><td>Optional integer — None if empty</td><td>int | None</td></tr>
                  <tr><td>of</td><td>Optional float — None if empty</td><td>float | None</td></tr>
                  <tr><td>og</td><td>Optional number — treats #VALUE! as None</td><td>float | None</td></tr>
                  <tr><td>ow</td><td>Optional word (letters/digits/_) — None if empty</td><td>str | None</td></tr>
                  <tr><td>os</td><td>Optional string (any chars) — empty string if missing</td><td>str</td></tr>
                  <tr><td>nlat</td><td>NMEA lat/lon (DDDMM.MMMM) → decimal degrees (numeric part only)</td><td>float | None</td></tr>
                  <tr><td>nlat_dir</td><td>NMEA lat/lon + hemisphere (N/S/E/W) → signed decimal degrees</td><td>float | None</td></tr>
                  <tr><td>nc</td><td>Any text not containing a comma</td><td>str | None</td></tr>
                  <tr><td>ns</td><td>Any text not containing * (asterisk)</td><td>str | None</td></tr>
                  <tr><td>anything</td><td>Any text, greedy — useful at end of pattern</td><td>str</td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs opacity-40">Usage: <code className="font-mono">{"{{FieldName:type}}"}</code> e.g. <code className="font-mono">{"{{Latitude:nlat}}"}</code> or <code className="font-mono">{"{{Speed:of}}"}</code></p>

          <div className="modal-action">
            <form method="dialog">
              <button className="btn btn-sm">Close</button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>

      {error && (
        <div ref={outputRef} role="alert" className="alert alert-error text-sm py-2">
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div ref={outputRef} className="card bg-base-200 shadow-sm border border-base-300">
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

import type { JSX } from "react"
import { useEffect, useRef, useState } from "react"
import yaml from "js-yaml"
import { useAuthFetch } from "../hooks/useAuthFetch"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCopy, faCheck } from "@fortawesome/free-solid-svg-icons"

type RenderResult = {
  result: Record<string, unknown>
  errors: string[]
  warnings: string[]
}

const TEMPLATE_PLACEHOLDER = `logger_templates:
  serial_logger:
    configs:
      "<<logger>>->off": null
      "<<logger>>->on":
        class: LoggerManager
        kwargs:
          stderr_writers:
            - class: TextFileWriter
              kwargs:
                filename: /var/log/openrvdas/<<logger>>.log

variables:
  baud_rate: 9600
`

const CONFIG_PLACEHOLDER = `loggers:
  knud:
    logger_template: serial_logger
    variables:
      port: /dev/ttyUSB0
      baud_rate: 4800
  ctd:
    logger_template: serial_logger
    variables:
      port: /dev/ttyUSB1
`

export const TemplateBuilderPage = (): JSX.Element => {
  const { authFetch } = useAuthFetch()

  const [templateYaml, setTemplateYaml] = useState(
    () => localStorage.getItem("templateBuilder.templateYaml") ?? "",
  )
  const [configYaml, setConfigYaml] = useState(
    () => localStorage.getItem("templateBuilder.configYaml") ?? "",
  )
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RenderResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [templateCopied, setTemplateCopied] = useState(false)
  const [configCopied, setConfigCopied] = useState(false)
  const [outputCopied, setOutputCopied] = useState(false)
  const guideRef = useRef<HTMLDialogElement>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (result) outputRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [result])

  const handleRender = async () => {
    if (!templateYaml.trim() || !configYaml.trim()) return
    setLoading(true)
    setResult(null)
    setError(null)

    try {
      const res = await authFetch("/configuration/render-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template_yaml: templateYaml, config_yaml: configYaml }),
      })
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { detail?: string }
        setError(d.detail ?? "Render failed")
      } else {
        setResult((await res.json()) as RenderResult)
      }
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  const outputYaml =
    result?.result && Object.keys(result.result).length > 0
      ? yaml.dump(result.result, { indent: 2, lineWidth: -1 })
      : null

  const canSubmit = templateYaml.trim() !== "" && configYaml.trim() !== ""

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6 w-full">
      <h1 className="text-xl font-bold">Template Builder</h1>

      <div className="card bg-base-200 shadow-sm border border-base-300">
        <div className="card-body py-4 px-5 space-y-4">
          <div className="form-control">
            <div className="flex items-center justify-between mb-1">
              <span className="label-text font-medium">Template definition</span>
              <div className="flex items-center gap-2">
                <span className="opacity-50 text-xs">logger_templates, config_templates, variables</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-square"
                  title="Copy template definition"
                  disabled={!templateYaml}
                  onClick={() => {
                    void navigator.clipboard.writeText(templateYaml).then(() => {
                      setTemplateCopied(true)
                      setTimeout(() => { setTemplateCopied(false) }, 2000)
                    })
                  }}
                >
                  <FontAwesomeIcon icon={templateCopied ? faCheck : faCopy} className={templateCopied ? "text-success" : ""} />
                </button>
              </div>
            </div>
            <textarea
              className="textarea textarea-bordered font-mono text-sm resize-y w-full"
              rows={10}
              placeholder={TEMPLATE_PLACEHOLDER}
              value={templateYaml}
              onChange={e => {
                setTemplateYaml(e.target.value)
                localStorage.setItem("templateBuilder.templateYaml", e.target.value)
              }}
            />
          </div>

          <div className="form-control">
            <div className="flex items-center justify-between mb-1">
              <span className="label-text font-medium">Logger config</span>
              <div className="flex items-center gap-2">
                <span className="opacity-50 text-xs">loggers referencing the templates above</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-square"
                  title="Copy logger config"
                  disabled={!configYaml}
                  onClick={() => {
                    void navigator.clipboard.writeText(configYaml).then(() => {
                      setConfigCopied(true)
                      setTimeout(() => { setConfigCopied(false) }, 2000)
                    })
                  }}
                >
                  <FontAwesomeIcon icon={configCopied ? faCheck : faCopy} className={configCopied ? "text-success" : ""} />
                </button>
              </div>
            </div>
            <textarea
              className="textarea textarea-bordered font-mono text-sm resize-y w-full"
              rows={10}
              placeholder={CONFIG_PLACEHOLDER}
              value={configYaml}
              onChange={e => {
                setConfigYaml(e.target.value)
                localStorage.setItem("templateBuilder.configYaml", e.target.value)
                setResult(null)
                setError(null)
              }}
            />
          </div>

          <div className="flex items-center">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!canSubmit || loading}
              onClick={() => void handleRender()}
            >
              {loading && <span className="loading loading-spinner loading-xs" />}
              Render
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm opacity-60 hover:opacity-100 px-0 ml-auto"
              onClick={() => { guideRef.current?.showModal() }}
            >
              Template syntax reference →
            </button>
          </div>
        </div>
      </div>

      {/* Template syntax reference modal */}
      <dialog ref={guideRef} className="modal">
        <div className="modal-box max-w-2xl space-y-5">
          <h3 className="font-bold text-lg">Template syntax reference</h3>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-50 mb-2">
              Variable substitution
            </p>
            <p className="text-xs opacity-70 mb-2">
              Inside a template, use <code className="font-mono">{"<<variable>>"}</code> to
              reference a variable. Optionally supply a default with{" "}
              <code className="font-mono">{"<<variable|default>>"}</code>.
            </p>
            <div className="overflow-x-auto">
              <table className="table table-xs font-mono w-full">
                <thead>
                  <tr>
                    <th>Syntax</th>
                    <th>Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{"<<port>>"}</td>
                    <td>Required — error if not provided</td>
                  </tr>
                  <tr>
                    <td>{"<<baud_rate|9600>>"}</td>
                    <td>Optional — defaults to 9600</td>
                  </tr>
                  <tr>
                    <td>{"<<logger>>"}</td>
                    <td>Auto-set to the logger name</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-50 mb-2">
              Logger template structure
            </p>
            <pre className="bg-base-300 rounded p-3 text-xs font-mono whitespace-pre overflow-x-auto">
              {`logger_templates:
  my_template:
    configs:
      "<<logger>>->off": null
      "<<logger>>->on":
        readers:
        - class: SerialReader
          kwargs:
            port: "<<port>>"
            baudrate: <<baud_rate|9600>>
        transforms:
        - class: TimestampTransform
        - class: PrefixTransform
          kwargs:
            prefix: <<logger>>
        writers:
        - class: UDPWriter
          kwargs:
            port: <<udp_port>>
            destination: <<udp_destination>>

variables:          # global defaults, apply to all loggers
  baud_rate: 9600
  udp_destination: 255.255.255.255

loggers:
  sensor1:
    logger_template: my_template
    variables:      # per-logger overrides
      port: /dev/ttyUSB0
      udp_port: 6224
  sensor2:
    logger_template: my_template
    variables:
      port: /dev/ttyUSB1
      baud_rate: 4800  # overrides global default
      udp_port: 6225`}
            </pre>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-50 mb-2">
              Config template structure
            </p>
            <pre className="bg-base-300 rounded p-3 text-xs font-mono whitespace-pre overflow-x-auto">
              {`config_templates:
  file_writer:
    class: LoggerManager
    kwargs:
      writers:
        - class: TextFileWriter
          kwargs:
            filename: /var/log/<<logger>>.log

loggers:
  sensor1:
    configs:
      sensor1->off: null
      sensor1->on:
        config_template: file_writer`}
            </pre>
          </div>

          <div className="modal-action">
            <form method="dialog">
              <button className="btn btn-sm">Close</button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop"><button>close</button></form>
      </dialog>

      {error && (
        <div role="alert" className="alert alert-error text-sm py-2">
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div ref={outputRef} className="space-y-4">
          {result.errors.length > 0 && (
            <div role="alert" className="alert alert-error text-sm py-2">
              <ul className="list-disc list-inside space-y-0.5">
                {result.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}
          {result.warnings.length > 0 && (
            <div role="alert" className="alert alert-warning text-sm py-2">
              <ul className="list-disc list-inside space-y-0.5">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          {outputYaml && (
            <div className="card bg-base-200 shadow-sm border border-base-300">
              <div className="card-body py-4 px-5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">Rendered output</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-square"
                    title="Copy output"
                    onClick={() => {
                      void navigator.clipboard.writeText(outputYaml).then(() => {
                        setOutputCopied(true)
                        setTimeout(() => {
                          setOutputCopied(false)
                        }, 2000)
                      })
                    }}
                  >
                    <FontAwesomeIcon
                      icon={outputCopied ? faCheck : faCopy}
                      className={outputCopied ? "text-success" : ""}
                    />
                  </button>
                </div>
                <pre className="bg-base-300 rounded p-3 text-xs font-mono whitespace-pre-wrap break-words overflow-x-auto">
                  {outputYaml}
                </pre>
              </div>
            </div>
          )}
          {result.errors.length === 0 && !outputYaml && (
            <div role="alert" className="alert alert-info text-sm py-2">
              <span>No output — the merged config produced an empty result.</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

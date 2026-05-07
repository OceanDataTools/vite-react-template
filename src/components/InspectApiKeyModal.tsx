import { useEffect, useRef } from "react"
import type { ApiKey } from "../features/apikeys/apikeyThunks"

type Props = {
  isOpen: boolean
  apiKey: ApiKey | null
  onClose: () => void
}

const InspectApiKeyModal = ({ isOpen, apiKey, onClose }: Props) => {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (isOpen) dialogRef.current?.showModal()
  }, [isOpen])

  if (!isOpen || !apiKey) return null

  const expiresAt = apiKey.expires_at ? new Date(apiKey.expires_at) : null
  const expired = expiresAt ? new Date() > expiresAt : false
  const status = expired ? "expired" : apiKey.revoked ? "revoked" : "active"
  const createdAt = new Date(apiKey.created_at)

  const dateFormat: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }

  return (
    <dialog ref={dialogRef} className="modal" onClose={onClose}>
      <div className="modal-box">
        <h3 className="font-bold text-xl mb-4">{apiKey.name}</h3>

        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between items-center">
            <span className="text-base-content/60">Status</span>
            {status === "active"  && <span className="badge badge-success badge-sm">Active</span>}
            {status === "revoked" && <span className="badge badge-warning badge-sm">Revoked</span>}
            {status === "expired" && <span className="badge badge-error badge-sm">Expired</span>}
          </div>
          <div className="flex justify-between">
            <span className="text-base-content/60">Created</span>
            <span>{createdAt.toLocaleString(undefined, dateFormat)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-base-content/60">Expires</span>
            <span>{expiresAt ? expiresAt.toLocaleString(undefined, dateFormat) : "Never"}</span>
          </div>
        </div>

        <div className="divider my-2" />

        <p className="text-sm font-medium mb-2">Permissions</p>
        {(apiKey.permissions ?? []).length === 0 ? (
          <p className="text-sm text-base-content/50">No permissions assigned.</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {(apiKey.permissions ?? []).map(p => (
              <div key={`${p.method}-${p.route}`} className="flex items-center gap-2 text-sm">
                <span className="badge badge-neutral badge-sm font-mono">{p.method}</span>
                <span className="font-mono text-xs">{p.route}</span>
              </div>
            ))}
          </div>
        )}

        <div className="modal-action">
          <button className="btn btn-sm" onClick={onClose}>Close</button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop"><button>close</button></form>
    </dialog>
  )
}

export default InspectApiKeyModal

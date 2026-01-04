import type React from "react"
import { useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCopy } from "@fortawesome/free-solid-svg-icons"

type RevealApiKeyModalProps = {
  isOpen: boolean
  keyValue: string
  onClose: () => void
}

const RevealApiKeyModal: React.FC<RevealApiKeyModalProps> = ({ isOpen, keyValue, onClose }) => {
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  return (
    <dialog className="modal" open>
      <div className="modal-box">
        <h3 className="font-bold text-xl">API Key Created</h3>
        <p className="text-sm mb-4 text-gray-500">
          Copy and store this key securely. You won’t see it again.
        </p>
        <div className="flex items-center bg-base-300 p-3 rounded text-sm font-mono mb-4">
          <span className="flex-1 break-all">{keyValue}</span>
          <button
            type="button"
            className="ml-2 btn btn-ghost btn-xs"
            onClick={() => {
              navigator.clipboard.writeText(keyValue)
              setCopied(true)
            }}
          >
            <FontAwesomeIcon icon={faCopy} />
          </button>
        </div>
        <div className="modal-action flex justify-between items-center w-full">
          <p className="text-xs text-success">{copied && "Copied to clipboard!"}</p>
          <button className="btn btn-primary btn-sm" onClick={() => {
              setCopied(false)
              onClose()
            }}
          >
            Close
          </button>
        </div>
      </div>
    </dialog>
  )
}

export default RevealApiKeyModal

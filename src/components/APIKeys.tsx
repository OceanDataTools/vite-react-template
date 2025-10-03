import { useEffect, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCopy } from "@fortawesome/free-solid-svg-icons"
import { useAppDispatch, useAppSelector } from "../app/hooks"
import {
  fetchApiKeysThunk,
  fetchRoutesThunk,
  createApiKeyThunk,
  revokeApiKeyThunk,
  deleteApiKeyThunk,
} from "../features/apikeys/apikeyThunks"
import { clearRevealedKey } from "../features/apikeys/apikeySlice"
import type { RootState } from "../app/store"
import { getDialog } from "../utils/modals"
import DeleteConfirmModal from "./DeleteConfirmModal"
import CreateApiKeyModal from "./CreateApiKeyModal"

type Permission = {
  route: string
  method: string
}

type CreateKeyFormValues = {
  keyName: string
  permissions: Permission[]
}

const ApiKeys = () => {
  const dispatch = useAppDispatch()
  const { keys, routes, revealedKey } = useAppSelector(
    (state: RootState) => state.apikeys,
  )

  const [formError, setFormError] = useState<string | undefined>()
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    void dispatch(fetchApiKeysThunk())
    void dispatch(fetchRoutesThunk())
  }, [dispatch])

  const handleCreateKey = async (
    data: CreateKeyFormValues,
  ): Promise<boolean> => {
    const trimmedName = data.keyName.trim()
    setFormError(undefined)

    if (keys.some(key => key.name === trimmedName)) {
      setFormError("A key with that name already exists.")
      return false
    }

    await dispatch(
      createApiKeyThunk({ name: trimmedName, permissions: data.permissions }),
    )

    const revealModal = getDialog("reveal_apikey_modal")
    revealModal?.showModal()

    return true
  }

  const handleDeleteClick = (id: string) => {
    setKeyToDelete(id)
    setDeleteModalOpen(true)
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(revealedKey)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
      }, 2000) // reset after 2s
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const confirmDelete = async () => {
    if (!keyToDelete) return
    await dispatch(deleteApiKeyThunk(keyToDelete))
    setKeyToDelete(null)
    setDeleteModalOpen(false)
  }

  const cancelDelete = () => {
    setDeleteModalOpen(false)
  }

  return (
    <div className="mt-4">
      {keys.length > 0 && (
        <table className="table table-md able-zebra border border-base-content/8 w-full mb-4">
          <thead>
            <tr>
              <th>Name</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map(key => (
              <tr key={key.id}>
                <td>{key.name ?? "(No name)"}</td>
                <td>{new Date(key.created_at).toISOString()}</td>
                <td className="space-x-2">
                  <button
                    className="btn btn-xs btn-ghost"
                    onClick={() => void dispatch(revokeApiKeyThunk(key.id))}
                  >
                    {key.revoked ? "Invoke" : "Revoke"}
                  </button>
                  <button
                    className="btn text-error btn-xs btn-ghost"
                    onClick={() => {
                      handleDeleteClick(key.id)
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button
        className="btn btn-primary btn-sm mt-2"
        onClick={() => {
          ;(
            document.getElementById("create_apikey_modal") as HTMLDialogElement
          ).showModal()
        }}
      >
        Create API Key
      </button>

      {/* Create Modal */}
      <CreateApiKeyModal
        routes={routes}
        onCreate={handleCreateKey}
        formError={formError}
      />

      {/* Reveal Key Modal */}
      <dialog id="reveal_apikey_modal" className="modal">
        <div className="modal-box">
          <h3 className="font-bold text-xl">API Key Created</h3>
          <p className="text-sm mb-4 text-gray-500">
            Copy and store this key securely. You won't see it again.
          </p>
          <div className="flex items-center bg-base-300 p-3 rounded text-sm font-mono mb-4">
            <span className="flex-1 break-all">{revealedKey}</span>
            <button
              type="button"
              className="ml-2 btn btn-ghost btn-xs"
              onClick={handleCopy}
            >
              <FontAwesomeIcon icon={faCopy} />
            </button>
          </div>
          <div className="modal-action flex justify-between items-center w-full">
            <p className="text-xs text-success">
              {copied && "Copied to clipboard!"}
            </p>
            <form method="dialog">
              <button
                className="btn btn-primary btn-sm"
                onClick={() => void dispatch(clearRevealedKey())}
              >
                Close
              </button>
            </form>
          </div>
        </div>
      </dialog>

      {/* Delete Key Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        itemName="API Key"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  )
}

export default ApiKeys

import { useEffect, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faMagnifyingGlass, faCopy, faBan, faCircleCheck, faRotateRight, faTrash } from "@fortawesome/free-solid-svg-icons"
import { useAppDispatch, useAppSelector } from "../app/hooks"
import {
  fetchApiKeysThunk,
  fetchRoutesThunk,
  fetchApiKeyRoutesThunk,
  createApiKeyThunk,
  revokeApiKeyThunk,
  deleteApiKeyThunk,
  reissueApiKeyThunk,
} from "../features/apikeys/apikeyThunks"
import type { RootState } from "../app/store"
import type { ApiKey, ApiRoute, Permission } from "../features/apikeys/apikeyThunks"
import DeleteConfirmModal from "./DeleteConfirmModal"
import InspectApiKeyModal from "./InspectApiKeyModal"
import RevealApiKeyModal from "./RevealApiKeyModal"
import ApiKeyModal from "./ApiKeyModal"
import { useToast } from "../hooks/useToast"
import Toast from "./Toast"

type CreateKeyFormValues = {
  id?: string
  keyName: string
  permissions: Permission[]
  expiresAt: string | null
  neverExpires: boolean
}

const ApiKeys = () => {
  const dispatch = useAppDispatch()
  const { keys, routes: allRoutes } = useAppSelector((state: RootState) => state.apikeys)

  const { toast, setToast } = useToast()
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null)
  const [activeModal, setActiveModal] = useState<"create" | "reissue" | null>(null)
  const [selectedKey, setSelectedKey] = useState<CreateKeyFormValues | null>(null)
  const [modalRoutes, setModalRoutes] = useState<ApiRoute[]>([])
  const [revealedKey, setRevealedKey] = useState<string | null>(null)
  const [inspectKey, setInspectKey] = useState<ApiKey | null>(null)

  const handleInspect = async (key: ApiKey) => {
    try {
      const permissions = await dispatch(fetchApiKeyRoutesThunk(key.id)).unwrap()
      setInspectKey({ ...key, permissions })
    } catch {
      setInspectKey({ ...key, permissions: [] })
    }
  }

  // -------------------------
  // Fetch initial data
  // -------------------------
  useEffect(() => {
    void dispatch(fetchApiKeysThunk())
    void dispatch(fetchRoutesThunk())
  }, [dispatch])

  // -------------------------
  // Create Key
  // -------------------------
  const handleCreateKey = async (data: CreateKeyFormValues): Promise<boolean> => {
    const trimmedName = data.keyName.trim()
    if (keys.some(key => key.name === trimmedName)) {
      setToast({ message: "A key with that name already exists.", type: "error" })
      return false
    }

    try {
      const newKey = await dispatch(
        createApiKeyThunk({
          name: trimmedName,
          permissions: data.permissions,
          expires_at: data.expiresAt ?? null,
        })
      ).unwrap()

      setRevealedKey(newKey.unhashed_key ?? null)
      return true
    } catch {
      setToast({ message: "Failed to create API key.", type: "error" })
      return false
    }
  }

  // -------------------------
  // Re-Issue Key
  // -------------------------
  const handleReissueKey = async (data: CreateKeyFormValues): Promise<boolean> => {
    if (!data.id) return false

    try {
      const newKey = await dispatch(
        reissueApiKeyThunk({ id: data.id, expiresAt: data.expiresAt ?? null })
      ).unwrap()

      setRevealedKey(newKey.unhashed_key ?? null)
      await dispatch(fetchApiKeysThunk())
      return true
    } catch (err) {
      console.error(err)
      setToast({ message: "Failed to reissue API key.", type: "error" })
      return false
    }
  }

  // -------------------------
  // Open Re-Issue Modal
  // -------------------------
  const reissueApiKey = async (key: ApiKey) => {
    const keyPermissions = await dispatch(fetchApiKeyRoutesThunk(key.id)).unwrap()

    const formattedRoutes: ApiRoute[] = keyPermissions.map((p: Permission) => ({
      route: p.route,
      methods: [p.method],
      name: `${p.method} ${p.route}`,
    }))

  // Determine if expiresAt is in the past
    let expiresAt: string | null = null
    if (key.expires_at) {
      const dt = new Date(key.expires_at)
      expiresAt = dt > new Date() ? dt.toISOString() : null
    }

    setSelectedKey({
      id: key.id,
      keyName: key.name,
      permissions: keyPermissions.map((p: Permission) => ({ route: p.route, method: p.method })),
      expiresAt,
      neverExpires: !expiresAt,
    })

    setModalRoutes(formattedRoutes)
    setActiveModal("reissue")
  }

  // -------------------------
  // Copy Key
  // -------------------------
  const handleCopyKey = async (key: ApiKey) => {
    const keyPermissions = await dispatch(fetchApiKeyRoutesThunk(key.id)).unwrap()
    setSelectedKey({
      keyName: `${key.name} - copy`,
      permissions: keyPermissions,
      expiresAt: null,
      neverExpires: false,
    })
    setActiveModal("create")
  }

  // -------------------------
  // Delete handlers
  // -------------------------
  const handleDeleteClick = (id: string) => { setKeyToDelete(id); }
  const confirmDelete = async () => {
    if (!keyToDelete) return
    await dispatch(deleteApiKeyThunk(keyToDelete))
    setKeyToDelete(null)
  }
  const cancelDelete = () => { setKeyToDelete(null); }

  // -------------------------
  // Render
  // -------------------------
  return (
    <div>
      {keys.length === 0 ? (
        <p className="text-sm text-base-content/50 my-3">No API keys yet.</p>
      ) : (
        <table className="table table-zebra w-full my-3">
          <thead>
            <tr>
              <th>Name</th>
              <th>Expires</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map(key => {
              const expiresAt = key.expires_at ? new Date(key.expires_at) : null
              const expired = expiresAt ? new Date() > expiresAt : false
              const status = expired ? "expired" : key.revoked ? "revoked" : "active"

              return (
                <tr key={key.id}>
                  <td>{key.name}</td>
                  <td>
                    {expiresAt
                      ? expiresAt.toLocaleString(undefined, {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })
                      : "never"}
                  </td>
                  <td>
                    {status === "active"  && <span className="badge badge-success badge-sm">Active</span>}
                    {status === "revoked" && <span className="badge badge-warning badge-sm">Revoked</span>}
                    {status === "expired" && <span className="badge badge-error badge-sm">Expired</span>}
                  </td>
                  <td className="space-x-1">
                    <button aria-label="Inspect" className="btn btn-xs btn-ghost tooltip" data-tip="Inspect" onClick={() => void handleInspect(key)}>
                      <FontAwesomeIcon icon={faMagnifyingGlass} />
                    </button>
                    <button aria-label="Copy" className="btn btn-xs btn-ghost tooltip" data-tip="Copy" onClick={() => void handleCopyKey(key)}>
                      <FontAwesomeIcon icon={faCopy} />
                    </button>
                    <button
                      aria-label={expired ? "Reissue" : key.revoked ? "Enable" : "Revoke"}
                      className="btn btn-xs btn-ghost tooltip"
                      data-tip={expired ? "Reissue" : key.revoked ? "Enable" : "Revoke"}
                      onClick={() => expired ? void reissueApiKey(key) : void dispatch(revokeApiKeyThunk(key.id))}
                    >
                      <FontAwesomeIcon icon={expired ? faRotateRight : key.revoked ? faCircleCheck : faBan} />
                    </button>
                    <button aria-label="Delete" className="btn btn-xs btn-ghost text-error tooltip" data-tip="Delete" onClick={() => { handleDeleteClick(key.id); }}>
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <button className="btn btn-primary btn-sm" onClick={() => { setActiveModal("create"); }}>
        Create API Key
      </button>

      {/* ------------------------- */}
      {/* Create Modal */}
      {activeModal === "create" && (
        <ApiKeyModal
          isOpen
          mode="create"
          routes={allRoutes}
          initialValues={selectedKey ?? undefined}
          onSubmitForm={handleCreateKey}
          onClose={() => { setSelectedKey(null); setActiveModal(null) }}
        />
      )}

      {/* ------------------------- */}
      {/* Reissue Modal */}
      {activeModal === "reissue" && selectedKey && (
        <ApiKeyModal
          isOpen
          mode="reissue"
          routes={modalRoutes}
          initialValues={selectedKey}
          onSubmitForm={handleReissueKey}
          onClose={() => {
            setSelectedKey(null)
            setActiveModal(null)
            setModalRoutes([])
          }}
        />
      )}

      {/* ------------------------- */}
      {/* Inspect Modal */}
      <InspectApiKeyModal
        isOpen={!!inspectKey}
        apiKey={inspectKey}
        onClose={() => { setInspectKey(null); }}
      />

      {/* ------------------------- */}
      {/* Reveal Modal */}
      <RevealApiKeyModal
        isOpen={!!revealedKey}
        keyValue={revealedKey ?? ""}
        onClose={() => { setRevealedKey(null); }}
      />

      {/* ------------------------- */}
      {/* Delete Modal */}
      <DeleteConfirmModal
        isOpen={!!keyToDelete}
        itemName="API Key"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      <Toast toast={toast} />
    </div>
  )
}

export default ApiKeys

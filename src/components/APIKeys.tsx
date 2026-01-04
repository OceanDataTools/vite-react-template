import { useEffect, useState } from "react"
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
import DeleteConfirmModal from "./DeleteConfirmModal"
import RevealApiKeyModal from "./RevealApiKeyModal"
import ApiKeyModal from "./ApiKeyModal"

type Permission = { route: string; method: string }

type CreateKeyFormValues = {
  id?: string
  keyName: string
  permissions: Permission[]
  expiresAt?: string | null
  neverExpires?: boolean
}

const ApiKeys = () => {
  const dispatch = useAppDispatch()
  const { keys, routes: allRoutes } = useAppSelector((state: RootState) => state.apikeys)

  const [formError, setFormError] = useState<string>()
  const [keyToDelete, setKeyToDelete] = useState<string | null>(null)
  const [activeModal, setActiveModal] = useState<"create" | "reissue" | null>(null)
  const [selectedKey, setSelectedKey] = useState<CreateKeyFormValues | null>(null)
  const [modalRoutes, setModalRoutes] = useState<any[]>([]) // routes shown in modal
  const [revealedKey, setRevealedKey] = useState<string | null>(null)

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
    setFormError(undefined)
    const trimmedName = data.keyName.trim()
    if (keys.some(key => key.name === trimmedName)) {
      setFormError("A key with that name already exists.")
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

      setRevealedKey(newKey.unhashed_key)
      setActiveModal("reveal")
      return true
    } catch {
      setFormError("Failed to create API key")
      return false
    }
  }

  // -------------------------
  // Re-Issue Key
  // -------------------------
  const handleReissueKey = async (data: CreateKeyFormValues): Promise<boolean> => {
    console.log(data);

    if (!data.id) return false
    setFormError(undefined)

    try {
      const newKey = await dispatch(
        reissueApiKeyThunk({ id: data.id, expiresAt: data.expiresAt ?? null })
      ).unwrap()

      setRevealedKey(newKey.unhashed_key)
      await dispatch(fetchApiKeysThunk())
      return true
    } catch (err) {
      console.error(err)
      setFormError("Failed to reissue API key")
      return false
    }
  }

  // -------------------------
  // Open Re-Issue Modal
  // -------------------------
  const reissueApiKey = async (key: any) => {
    // Fetch routes specific to this key
    const keyPermissions = await dispatch(fetchApiKeyRoutesThunk(key.id)).unwrap()

    // Transform routes for modal display
    const formattedRoutes = keyPermissions.map((p: any) => ({
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
      permissions: keyPermissions.map((p: any) => ({ route: p.route, method: p.method })),
      expiresAt,
      neverExpires: !expiresAt,
    })

    setModalRoutes(formattedRoutes)
    setActiveModal("reissue")
  }

  // -------------------------
  // Delete handlers
  // -------------------------
  const handleDeleteClick = (id: string) => setKeyToDelete(id)
  const confirmDelete = async () => {
    if (!keyToDelete) return
    await dispatch(deleteApiKeyThunk(keyToDelete))
    setKeyToDelete(null)
  }
  const cancelDelete = () => setKeyToDelete(null)

  // -------------------------
  // Render
  // -------------------------
  return (
    <div className="mt-4">
      {keys.length > 0 && (
        <table className="table table-md table-zebra border border-base-content/8 w-full mb-2">
          <thead>
            <tr>
              <th>Name</th>
              <th>Expires</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {keys.map(key => {
              const expiresAt = key.expires_at ? new Date(key.expires_at) : null
              const expired = expiresAt ? new Date() > expiresAt : false

              return (
                <tr key={key.id}>
                  <td className={expired ? "text-error" : ""}>{key.name ?? "(No name)"}</td>
                  <td className={expired ? "text-error" : ""}>
                    {expiresAt
                      ? expiresAt.toLocaleString(undefined, {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit"
                        })
                      : "never"}
                  </td>
                  <td className="space-x-2">
                    <button
                      className="btn btn-xs btn-ghost"
                      onClick={() =>
                        expired ? void reissueApiKey(key) : void dispatch(revokeApiKeyThunk(key.id))
                      }
                    >
                      {expired ? "Reissue" : key.revoked ? "Enable" : "Revoke"}
                    </button>
                    <button
                      className="btn text-error btn-xs btn-ghost"
                      onClick={() => handleDeleteClick(key.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <button className="btn btn-primary btn-sm mt-2" onClick={() => setActiveModal("create")}>
        Create API Key
      </button>

      {/* ------------------------- */}
      {/* Create Modal */}
      {activeModal === "create" && (
        <ApiKeyModal
          isOpen
          mode="create"
          routes={allRoutes}
          onSubmitForm={handleCreateKey}
          formError={formError}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* ------------------------- */}
      {/* Reissue Modal */}
      {activeModal === "reissue" && selectedKey && (
        <ApiKeyModal
          isOpen
          mode="reissue"
          routes={modalRoutes} // only key's routes
          initialValues={selectedKey}
          onSubmitForm={handleReissueKey}
          formError={formError}
          onClose={() => {
            setSelectedKey(null)
            setActiveModal(null)
            setModalRoutes([])
          }}
        />
      )}

      {/* ------------------------- */}
      {/* Reveal Modal */}
      <RevealApiKeyModal
        isOpen={!!revealedKey}
        keyValue={revealedKey}
        onClose={() => setRevealedKey(null)}
      />

      {/* ------------------------- */}
      {/* Delete Modal */}
      <DeleteConfirmModal
        isOpen={!!keyToDelete}
        itemName="API Key"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  )
}

export default ApiKeys

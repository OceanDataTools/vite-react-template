import type React from "react"
import { useEffect, useRef } from "react"

type DeleteConfirmModalProps = {
  isOpen: boolean
  itemName?: string
  onConfirm: () => void
  onCancel: () => void
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  itemName,
  onConfirm,
  onCancel,
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (isOpen) dialogRef.current?.showModal()
  }, [isOpen])

  if (!isOpen) return null

  return (
    <dialog ref={dialogRef} className="modal" onClose={onCancel}>
      <div className="modal-box">
        <h3 className="font-bold text-lg">Confirm Delete</h3>
        <p className="py-4">
          Are you sure you want to delete{" "}
          <span className="font-semibold">{itemName ?? "this item"}</span>? This
          action cannot be undone.
        </p>
        <div className="modal-action">
          <button className="btn btn-outline btn-sm" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-error btn-sm" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop"><button>close</button></form>
    </dialog>
  )
}

export default DeleteConfirmModal

import type React from "react"

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
  if (!isOpen) return null

  return (
    <dialog className="modal modal-open">
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
    </dialog>
  )
}

export default DeleteConfirmModal

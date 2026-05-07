import type { ToastState } from "../hooks/useToast"

type Props = { toast: ToastState }

const Toast = ({ toast }: Props) => {
  if (!toast) return null
  return (
    <div className="toast toast-end toast-top z-50">
      <div className={`alert ${toast.type === "success" ? "alert-success" : "alert-error"} text-sm`}>
        <span>{toast.message}</span>
      </div>
    </div>
  )
}

export default Toast

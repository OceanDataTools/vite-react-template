import { useState, useEffect } from "react"

export type ToastState = { message: string; type: "success" | "error" } | null

export const useToast = (duration = 5000) => {
  const [toast, setToast] = useState<ToastState>(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => { setToast(null); }, duration)
    return () => { clearTimeout(timer); }
  }, [toast, duration])

  return { toast, setToast }
}

import type { JSX } from "react"
import { useEffect } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { apiUrl } from "../utils/api"
import { useToast } from "../hooks/useToast"
import Toast from "../components/Toast"

const resetPasswordSchema = z
  .object({
    new_password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string(),
  })
  .refine(data => data.confirm_password && data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  })

type ResetFormData = z.infer<typeof resetPasswordSchema>

export const ResetPasswordForm = (): JSX.Element => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get("token")
  const { toast, setToast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onChange",
  })

  useEffect(() => {
    if (!token) {
      setToast({ message: "Reset token is missing.", type: "error" })
      setTimeout(() => void navigate("/login"), 2000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onSubmit = async (data: ResetFormData) => {
    try {
      const res = await fetch(apiUrl("/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: data.new_password }),
      })

      if (res.ok) {
        setToast({ message: "Password updated! Redirecting to login…", type: "success" })
        setTimeout(() => void navigate("/login"), 2000)
      } else {
        const error = await res.json()
        setToast({ message: error?.detail ?? "Password reset failed.", type: "error" })
      }
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Something went wrong. Try again.", type: "error" })
    }
  }

  return (
    <>
    <div className="max-w-sm mx-auto mt-10">
      <div className="card bg-base-200 shadow-sm border border-base-300">
      <div className="card-body py-4 px-5">
      <h2 className="card-title text-base font-semibold mb-2">Reset Your Password</h2>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">New Password</legend>
          <input type="password" {...register("new_password")} className={`input w-full ${errors.new_password ? "input-error" : ""}`} />
          {errors.new_password && <p className="text-error text-sm mt-1">{errors.new_password.message}</p>}
        </fieldset>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Confirm Password</legend>
          <input type="password" {...register("confirm_password")} className={`input w-full ${errors.confirm_password ? "input-error" : ""}`} />
          {errors.confirm_password && <p className="text-error text-sm mt-1">{errors.confirm_password.message}</p>}
        </fieldset>
        <button type="submit" className="btn btn-primary w-full mt-4" disabled={isSubmitting || !isValid}>
          {isSubmitting ? "Resetting..." : "Reset Password"}
        </button>
      </form>
      </div>
      </div>
    </div>
    <Toast toast={toast} />
    </>
  )
}

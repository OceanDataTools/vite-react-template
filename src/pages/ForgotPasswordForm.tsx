import type { JSX } from "react"
import { useForm } from "react-hook-form"
import { useNavigate, Link } from "react-router-dom"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { apiUrl } from "../utils/api"
import { useToast } from "../hooks/useToast"
import Toast from "../components/Toast"

const forgotPasswordSchema = z.object({
  email: z.email("Invalid email address"),
})

type ForgotFormValues = z.infer<typeof forgotPasswordSchema>

export const ForgotPasswordForm = (): JSX.Element => {
  const navigate = useNavigate()
  const { toast, setToast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onChange",
  })

  const onSubmit = async (data: ForgotFormValues) => {
    try {
      const res = await fetch(apiUrl("/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body?.detail ?? "Something went wrong")
      }

      setToast({ message: "If that email exists, a reset link has been sent.", type: "success" })
      setTimeout(() => void navigate("/login"), 2000)
    } catch (err) {
      setToast({ message: (err as Error).message, type: "error" })
    }
  }

  return (
    <>
    <div className="max-w-sm mx-auto mt-10">
      <div className="card bg-base-200 shadow-sm border border-base-300">
      <div className="card-body py-4 px-5">
      <h2 className="card-title text-base font-semibold mb-2">Forgot Your Password?</h2>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Email Address</legend>
          <input
            type="email"
            {...register("email")}
            className={`input w-full ${errors.email ? "input-error" : ""}`}
            disabled={isSubmitting}
          />
          {errors.email && <p className="text-error text-sm mt-1">{errors.email.message}</p>}
        </fieldset>
        <button type="submit" className="btn btn-primary w-full mt-4" disabled={isSubmitting || !isValid}>
          {isSubmitting ? "Sending..." : "Send Reset Link"}
        </button>
        <Link to="/login" className="block mt-4 text-center text-sm hover:text-primary">
          Back to login
        </Link>
      </form>
      </div>
      </div>
    </div>
    <Toast toast={toast} />
    </>
  )
}

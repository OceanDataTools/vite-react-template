import type { JSX } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import type { RootState } from "../app/store"
import { useAppDispatch, useAppSelector } from "../app/hooks"
import { useNavigate, Link } from "react-router-dom"
import { registerUserThunk } from "../features/auth/authThunks"
import { apiUrl } from "../utils/api"
import { debounce } from "../utils/debounce"
import { useToast } from "../hooks/useToast"
import Toast from "../components/Toast"

const checkUsernameAvailability = debounce(async (username: string): Promise<{ available: boolean }> => {
  const res = await fetch(apiUrl(`/users/available?username=${encodeURIComponent(username)}`))
  if (!res.ok) throw new Error("SERVER_ERROR")
  return res.json() as Promise<{ available: boolean }>
}, 400)

const checkEmailAvailability = debounce(async (email: string): Promise<{ available: boolean }> => {
  const res = await fetch(apiUrl(`/users/available?email=${encodeURIComponent(email)}`))
  if (!res.ok) throw new Error("SERVER_ERROR")
  return res.json() as Promise<{ available: boolean }>
}, 400)

const registerSchema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    full_name: z.string().optional().or(z.literal("")),
    email: z.email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .superRefine(async (data, ctx) => {
    if (data.username) {
      try {
        const json = await checkUsernameAvailability(data.username)
        if (!json.available) ctx.addIssue({ code: "custom", path: ["username"], message: "Username is already taken" })
      } catch {
        ctx.addIssue({ code: "custom", path: ["username"], message: "Could not validate username" })
      }
    }

    if (data.email) {
      try {
        const json = await checkEmailAvailability(data.email)
        if (!json.available) ctx.addIssue({ code: "custom", path: ["email"], message: "Email is already taken" })
      } catch {
        ctx.addIssue({ code: "custom", path: ["email"], message: "Could not validate email" })
      }
    }

    if (data.password !== data.confirmPassword) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match" })
    }
  })

type RegisterFormValues = z.infer<typeof registerSchema>

export const RegisterForm = (): JSX.Element => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { loading } = useAppSelector((state: RootState) => state.auth)
  const { toast, setToast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
  })

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      const result = await dispatch(registerUserThunk({ ...data, full_name: data.full_name ?? "" }))
      if (registerUserThunk.fulfilled.match(result)) {
        setToast({ message: "Registration successful! Redirecting…", type: "success" })
        setTimeout(() => void navigate("/login"), 2000)
      } else {
        setToast({ message: "Registration failed. Please try again.", type: "error" })
      }
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Registration failed.", type: "error" })
    }
  }

  return (
    <>
    <div className="max-w-sm mx-auto mt-10">
      <div className="card bg-base-200 shadow-sm border border-base-300">
      <div className="card-body py-4 px-5">
      <h2 className="card-title text-base font-semibold mb-2">Register</h2>
      <form onSubmit={handleSubmit(onSubmit)}>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Username</legend>
          <input type="text" {...register("username")} className={`input w-full ${errors.username ? "input-error" : ""}`} />
          {errors.username && <p className="text-error text-sm mt-1">{errors.username.message}</p>}
        </fieldset>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Full Name</legend>
          <input type="text" {...register("full_name")} className="input w-full" />
        </fieldset>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Email</legend>
          <input type="email" {...register("email")} className={`input w-full ${errors.email ? "input-error" : ""}`} />
          {errors.email && <p className="text-error text-sm mt-1">{errors.email.message}</p>}
        </fieldset>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Password</legend>
          <input type="password" {...register("password")} className={`input w-full ${errors.password ? "input-error" : ""}`} />
          {errors.password && <p className="text-error text-sm mt-1">{errors.password.message}</p>}
        </fieldset>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Confirm Password</legend>
          <input type="password" {...register("confirmPassword")} className={`input w-full ${errors.confirmPassword ? "input-error" : ""}`} />
          {errors.confirmPassword && <p className="text-error text-sm mt-1">{errors.confirmPassword.message}</p>}
        </fieldset>
        <button type="submit" className="btn btn-primary w-full mt-4" disabled={loading || isSubmitting || !isValid}>
          {isSubmitting || loading ? "Registering..." : "Register"}
        </button>
        <Link to="/login" className="block mt-4 text-center text-sm hover:text-primary">
          Already have an account?
        </Link>
      </form>
      </div>
      </div>
    </div>
    <Toast toast={toast} />
    </>
  )
}

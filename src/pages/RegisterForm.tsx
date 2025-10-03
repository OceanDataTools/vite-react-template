// src/pages/RegisterForm.tsx
import type { JSX } from "react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import type { RootState } from "../app/store"
import { useAppDispatch, useAppSelector } from "../app/hooks"
import { useNavigate, Link } from "react-router-dom"
import { registerUserThunk } from "../features/auth/authThunks"
import { apiUrl } from "../utils/api" // Helper to prefix API URLs

// form validation schema
const registerSchema = z
  .object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    full_name: z.string().optional().or(z.literal("")),
    email: z.email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string(),
  })
  .superRefine(async (data, ctx) => {
    // Username availability check
    if (data.username) {
      try {
        const res = await fetch(
          apiUrl(
            `/users/available?username=${encodeURIComponent(data.username)}`,
          ),
        )
        if (!res.ok) throw new Error("SERVER_ERROR")
        const json = await res.json()
        if (!json.available) {
          ctx.addIssue({
            code: "custom",
            path: ["username"],
            message: "Username is already taken",
          })
        }
      } catch {
        ctx.addIssue({
          code: "custom",
          path: ["username"],
          message: "Could not validate username",
        })
      }
    }

    // Email availability check
    if (data.email) {
      try {
        const res = await fetch(
          apiUrl(`/users/available?email=${encodeURIComponent(data.email)}`),
        )
        if (!res.ok) throw new Error("SERVER_ERROR")
        const json = await res.json()
        if (!json.available) {
          ctx.addIssue({
            code: "custom",
            path: ["email"],
            message: "Email is already taken",
          })
        }
      } catch {
        ctx.addIssue({
          code: "custom",
          path: ["email"],
          message: "Could not validate email",
        })
      }
    }

    // Password confirmation check
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match",
      })
    }
  })

type RegisterFormValues = z.infer<typeof registerSchema>

export const RegisterForm = (): JSX.Element => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [resMessage, setResMessage] = useState()
  const { loading, error } = useAppSelector((state: RootState) => state.auth) // eslint-disable-line @typescript-eslint/no-unused-vars

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
  })

  const onSubmit = async (data: RegisterFormValues) => {
    const result = await dispatch(registerUserThunk(data))
    if (registerUserThunk.fulfilled.match(result)) {
      setResMessage("User registration successful!")
      setTimeout(() => navigate("/login"), 2000)
    }
  }

  return typeof resMessage === "string" ? (
    <div className="max-w-sm mx-auto p-4 border rounded shadow mt-20">
      <h2 className="text-2xl font-bold mb-4 text-center">Register</h2>
      <p className="text-success text-center mt-1">{resMessage}</p>
    </div>
  ) : (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="max-w-sm mx-auto p-4 border rounded shadow mt-20"
    >
      <h2 className="text-xl font-bold mb-4">Register</h2>
      <input
        type="text"
        {...register("username")}
        placeholder="Username"
        className={`border p-2 w-full rounded ${
          errors.username ? "mt-0 border-error" : "mb-3"
        }`}
      />
      {errors.username && (
        <p className="text-error text-sm mb-3">{errors.username.message}</p>
      )}
      <input
        type="text"
        {...register("full_name")}
        placeholder="Full Name"
        className={`border p-2 w-full rounded ${
          errors.full_name ? "mt-0 border-error" : "mb-3"
        }`}
      />
      {errors.full_name && (
        <p className="text-error text-sm mb-3">{errors.full_name.message}</p>
      )}
      <input
        type="email"
        {...register("email")}
        placeholder="Email"
        className={`border p-2 w-full rounded ${
          errors.email ? "mt-0 border-error" : "mb-3"
        }`}
      />
      {errors.email && (
        <p className="text-error text-sm mb-3">{errors.email.message}</p>
      )}
      <input
        type="password"
        {...register("password")}
        placeholder="Password"
        className={`border p-2 w-full rounded ${
          errors.password ? "mt-0 border-error" : "mb-3"
        }`}
      />
      {errors.password && (
        <p className="text-error text-sm mb-3">{errors.password.message}</p>
      )}
      <input
        type="password"
        {...register("confirmPassword")}
        placeholder="Confirm Password"
        className={`border p-2 w-full rounded ${
          errors.confirmPassword ? "mt-0 border-error" : "mb-3"
        }`}
      />
      {errors.confirmPassword && (
        <p className="text-error text-sm mb-3">
          {errors.confirmPassword.message}
        </p>
      )}

      <button
        type="submit"
        className="btn btn-primary w-full mt-4"
        disabled={loading || isSubmitting || !isValid}
      >
        {isSubmitting || loading ? "Registering..." : "Register"}
      </button>
      <Link
        to="/login"
        className="block mt-4 text-center text-sm hover:text-primary"
      >
        Already have an account?
      </Link>
    </form>
  )
}

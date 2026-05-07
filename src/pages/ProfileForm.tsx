// src/pages/ProfileForm.tsx
import type { JSX } from "react"
import { useEffect, useMemo, useRef } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useAppSelector, useAppDispatch } from "../app/hooks"
import type { RootState } from "../app/store"
import { apiUrl } from "../utils/api"
import { debounce } from "../utils/debounce"
import {
  updateUserProfileThunk,
  updateUserProfilePasswordThunk,
} from "../features/auth/authThunks"
import { useToast } from "../hooks/useToast"
import Toast from "../components/Toast"

const checkEmailAvailability = debounce(async (email: string): Promise<{ available: boolean }> => {
  const res = await fetch(apiUrl(`/users/available?email=${encodeURIComponent(email)}`))
  if (!res.ok) throw new Error("SERVER_ERROR")
  return res.json() as Promise<{ available: boolean }>
}, 400)

const ProfileForm = (): JSX.Element => {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state: RootState) => state.auth.user)
  const loading = useAppSelector((state: RootState) => state.auth.loading)
  const { toast, setToast } = useToast()

  // Ref to store original email
  const originalEmail = useRef(user?.email ?? "")

  const defaultValues = useMemo(
    () => ({
      username: user?.username ?? "",
      full_name: user?.full_name ?? "",
      email: user?.email ?? "",
      current_password: "",
      new_password: "",
      confirm_password: "",
    }),
    [user],
  )

  // form validation schema
  // Define schema *inside component* to access ref
  const profileSchema = z
    .object({
      username: z.string().min(1, "Username is required"),
      email: z
        .email("Valid email address is required")
        .superRefine(async (val, ctx) => {
          if (val === originalEmail.current) return

          try {
            const json = await checkEmailAvailability(val)
            if (!json.available) {
              ctx.addIssue({ code: "custom", message: "Email is already taken" })
            }
          } catch {
            ctx.addIssue({ code: "custom", message: "Could not check email" })
          }
        }),
      full_name: z.string().optional(),
      current_password: z.string().optional(),
      new_password: z.string().optional(),
      confirm_password: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      const changingPassword = data.new_password ?? data.confirm_password

      if (changingPassword && !data.current_password) {
        ctx.addIssue({
          code: "custom",
          path: ["current_password"],
          message: "Current password is required to change password",
        })
      }

      if (changingPassword && !data.new_password) {
        ctx.addIssue({
          code: "custom",
          path: ["new_password"],
          message: "New password is required",
        })
      }

      if (
        changingPassword &&
        data.new_password &&
        data.new_password.length < 8
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["new_password"],
          message: "New password must be at least 8 characters",
        })
      }

      if (changingPassword && data.new_password !== data.confirm_password) {
        ctx.addIssue({
          code: "custom",
          path: ["confirm_password"],
          message: "Passwords do not match",
        })
      }
    })

  type ProfileFormValues = z.infer<typeof profileSchema>

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty, isValid },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
    mode: "onChange",
  })

  // Update form when user changes, and store new originalEmail
  useEffect(() => {
     
    if (user) {
      originalEmail.current = user.email
      reset(
        {
          username: user.username,
          full_name: user.full_name,
          email: user.email,
        },
        {
          keepErrors: true,
          keepDirty: false,
          keepValues: false,
        },
      )
    }
  }, [user, reset])

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return

    const trimmedUsername = data.username.trim()
    const trimmedEmail = data.email.trim()
    const trimmedFullName = data.full_name?.trim() ?? ""

    let profileUpdated = false
    let passwordUpdated = false

    // Only call if email or full_name changed
    if (trimmedEmail !== user.email || trimmedFullName !== user.full_name) {
      const profileResult = await dispatch(
        updateUserProfileThunk({
          email: trimmedEmail,
          full_name: trimmedFullName,
        }),
      )

      if (updateUserProfileThunk.fulfilled.match(profileResult)) {
        profileUpdated = true
      } else {
        setToast({ message: "Profile update failed.", type: "error" })
      }
    }

    if (data.current_password && data.new_password) {
      const passwordResult = await dispatch(
        updateUserProfilePasswordThunk({
          current_password: data.current_password,
          new_password: data.new_password,
        }),
      )

      if (updateUserProfilePasswordThunk.fulfilled.match(passwordResult)) {
        passwordUpdated = true
      } else if (
        updateUserProfilePasswordThunk.rejected.match(passwordResult)
      ) {
        setToast({ message: passwordResult.payload ?? "Password update failed.", type: "error" })
      } else {
        setToast({ message: "Password update failed.", type: "error" })
      }
    }

    // Consolidate success toast
    if (profileUpdated && passwordUpdated) {
      setToast({ message: "Profile and password updated!", type: "success" })
    } else if (profileUpdated) {
      setToast({ message: "Profile updated!", type: "success" })
    } else if (passwordUpdated) {
      setToast({ message: "Password updated!", type: "success" })
    }

    // Optionally clear password fields
    if (profileUpdated || passwordUpdated) {
      reset(
        {
          username: trimmedUsername,
          full_name: trimmedFullName,
          email: trimmedEmail,
          current_password: "",
          new_password: "",
          confirm_password: "",
        },
        {
          keepErrors: true,
          keepDirty: false,
          keepValues: false,
        },
      )
    }
  }

  const onReset = () => {
    reset(defaultValues, {
      keepErrors: false,
      keepDirty: false,
      keepTouched: false,
    })
    setToast(null)
  }

  return (
    <>
    <div className="max-w-sm mx-auto mt-10">
      <div className="card bg-base-200 shadow-sm border border-base-300">
      <div className="card-body py-4 px-5">
      <h2 className="card-title text-base font-semibold">Edit Profile</h2>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Username</legend>
          <input
            type="text"
            {...register("username")}
            className={"w-full border p-2 rounded"}
            disabled
          />
        </fieldset>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Full Name</legend>
          <input
            type="text"
            {...register("full_name")}
            className={`w-full border p-2 rounded ${
              errors.full_name ? "border-error" : ""
            }`}
            disabled={loading || isSubmitting}
          />
          {errors.full_name && (
            <p className="text-error text-sm mt-1">
              {errors.full_name.message}
            </p>
          )}
        </fieldset>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Email</legend>
          <input
            type="text"
            {...register("email")}
            className={`w-full border p-2 rounded ${
              errors.email ? "border-error" : ""
            }`}
            disabled={loading || isSubmitting}
          />
          {errors.email && (
            <p className="text-error text-sm mt-1">{errors.email.message}</p>
          )}
        </fieldset>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Current Password</legend>
          <input
            type="password"
            {...register("current_password")}
            className={`w-full border p-2 rounded ${errors.current_password ? "border-error" : ""}`}
            disabled={loading || isSubmitting}
          />
          {errors.current_password && (
            <p className="text-error text-sm mt-1">
              {errors.current_password.message}
            </p>
          )}
        </fieldset>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">New Password</legend>
          <input
            type="password"
            {...register("new_password")}
            className={`w-full border p-2 rounded ${errors.new_password ? "border-error" : ""}`}
            disabled={loading || isSubmitting}
          />
          {errors.new_password && (
            <p className="text-error text-sm mt-1">
              {errors.new_password.message}
            </p>
          )}
        </fieldset>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Confirm New Password</legend>
          <input
            type="password"
            {...register("confirm_password")}
            className={`w-full border p-2 rounded ${errors.confirm_password ? "border-error" : ""}`}
            disabled={loading || isSubmitting}
          />
          {errors.confirm_password && (
            <p className="text-error text-sm mt-1">
              {errors.confirm_password.message}
            </p>
          )}
        </fieldset>
        <button
          type="submit"
          className="btn btn-primary btn-sm mt-4"
          disabled={loading || isSubmitting || !isDirty || !isValid}
        >
          {loading || isSubmitting ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm ml-2 mt-4"
          disabled={loading || isSubmitting || !isDirty}
          onClick={onReset}
        >
          Reset
        </button>
      </form>
      </div>
      </div>
    </div>
    <Toast toast={toast} />
    </>
  )
}

export default ProfileForm

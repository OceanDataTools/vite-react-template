import type { JSX } from "react"
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiUrl } from "../utils/api";

// form validation schema
const resetPasswordSchema = z
  .object({
    new_password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string(),
  })
  .refine((data) => data.confirm_password && data.new_password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

type ResetFormData = z.infer<typeof resetPasswordSchema>;

export const ResetPasswordForm = (): JSX.Element => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState();

  const { register, handleSubmit, formState: { errors, isSubmitting, isValid } } = useForm<ResetFormData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onChange",
  });

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Reset token is missing.");
      setTimeout(() => navigate("/login"), 2000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (data: ResetFormData) => {
    try {
      const res = await fetch(apiUrl("/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          new_password: data.new_password,
        }),
      });

      if (res.ok) {
        setStatus("success");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        const error = await res.json();
        setStatus("error");
        setErrorMessage(error?.detail ?? "Password reset failed.");
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(err.message ?? "Something went wrong. Try again.");
    }
  };

  return (
    <div className="max-w-sm mx-auto p-4 border rounded shadow mt-20">
      <h2 className="text-2xl font-bold mb-4">Reset Your Password</h2>

      {status === "success" ? (
        <p className="text-success">Password updated! Redirecting to login…</p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <input
            type="password"
            {...register("new_password")}
            placeholder="New Password"
            className={`border p-2 w-full rounded ${
              errors.new_password ? "mt-0 border-error" : "mb-3"
            }`}
          />
          {errors.new_password && (
            <p className="text-error text-sm mb-3">{errors.new_password.message}</p>
          )}
          <input
            type="password"
            {...register("confirm_password")}
            placeholder="Confirm Password"
            className={`border p-2 w-full rounded ${
              errors.confirm_password ? "mt-0 border-error" : "mb-3"
            }`}
          />
          {errors.confirm_password && (
            <p className="text-error text-sm mb-3">{errors.confirm_password.message}</p>
          )}

          {status === "error" && (
            <p className="text-error mb-2">{errorMessage}</p>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isSubmitting || !isValid}
          >
            {isSubmitting ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      )}
    </div>
  );
}

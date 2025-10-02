import type { JSX } from "react"
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiUrl } from "../utils/api";

// form validation schema
const forgotPasswordSchema = z.object({
  email: z.email("Invalid email address"),
});

type ForgotFormValues = z.infer<typeof forgotPasswordSchema>;

export const ForgotPasswordForm = (): JSX.Element => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const { register, handleSubmit, formState: { errors, isSubmitting, isValid } } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: ForgotFormValues) => {
    setError("");
    try {
      const res = await fetch(apiUrl("/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body?.detail ?? "Something went wrong");
      }

      setSubmitted(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="max-w-sm mx-auto p-4 border rounded shadow mt-20">
      <h2 className="text-xl font-bold mb-4">Forgot Your Password?</h2>

      {submitted ? (
        <p className="text-success">
          If that email exists in our system, a reset link has been sent.
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="mb-4">
            <input
              type="email"
              placeholder="Email Address"
              {...register("email")}
              className={`w-full p-2 border rounded ${
                errors.email ? "border-error" : ""
              }`}
              disabled={isSubmitting}
            />
            {errors.email && (
              <p className="text-error text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          {error && (
            <p className="text-error text-sm mb-2">{error}</p>
          )}

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={isSubmitting || !isValid}
          >
            {isSubmitting ? "Sending..." : "Send Reset Link"}
          </button>
          <Link
            to="/login"
            className="block mt-4 text-center text-sm hover:text-primary"
          >
            Back to login
          </Link>
        </form>
      )}
    </div>
  );
}

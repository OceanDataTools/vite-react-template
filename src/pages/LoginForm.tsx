import type { JSX } from "react"
import type React from "react";
import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "../app/hooks"
import { AppConfig } from "../config"
import { loginThunk } from "../features/auth/authThunks"

export const LoginForm = (): JSX.Element => {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { loading } = useAppSelector(state => state.auth)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!username || !password) return
    setError(null)
    try {
      await dispatch(loginThunk({ username, password })).unwrap()
      await navigate("/")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.")
    }
  }

  return (
    <div className="max-w-sm mx-auto mt-10">
      <div className="card bg-base-200 shadow-sm border border-base-300">
      <div className="card-body py-4 px-5">
      <h2 className="card-title text-base font-semibold mb-2">Login</h2>
      <form onSubmit={handleSubmit}>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Username</legend>
          <input
            type="text"
            value={username}
            onChange={e => { setUsername(e.target.value); }}
            className="input w-full"
            disabled={loading}
          />
        </fieldset>
        <fieldset className="fieldset">
          <legend className="fieldset-legend">Password</legend>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); }}
            className="input w-full"
            disabled={loading}
          />
        </fieldset>
        {error && <p className="text-error text-sm mt-3">{error}</p>}
<button
          type="submit"
          className="btn btn-primary w-full mt-3"
          disabled={loading || !username || !password}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
        <div className="flex flex-col items-center gap-1 mt-4">
          {AppConfig.allowSelfRegister && (
            <Link to="/register" className="text-sm hover:text-primary">
              Register
            </Link>
          )}
          <Link to="/forgot-password" className="text-sm hover:text-primary">
            Forgot Password
          </Link>
        </div>
      </form>
      </div>
      </div>
    </div>
  )
}

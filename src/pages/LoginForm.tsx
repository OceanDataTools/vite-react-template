import type { JSX } from "react"
import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAppDispatch, useAppSelector } from "../app/hooks"
import { AppConfig } from "../config"
import { loginThunk } from "../features/auth/authThunks" // adjust path as needed

export const LoginForm = (): JSX.Element => {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const { loading, error, token } = useAppSelector(state => state.auth) // eslint-disable-line @typescript-eslint/no-unused-vars

  const handleSubmit = async e => {
    e.preventDefault()
    if (!username || !password) return

    try {
      await dispatch(loginThunk({ username, password })).unwrap()
      await navigate("/")
    } catch (err) {
      console.error("Login failed:", err)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="max-w-sm mx-auto p-4 border rounded shadow mt-20"
    >
      <h2 className="text-xl font-bold mb-4">Login</h2>
      {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
      {error && <p className="text-error mb-2">{error}</p>}
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={e => {
          setUsername(e.target.value)
        }}
        className="border p-2 mb-3 w-full rounded"
        disabled={loading}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => {
          setPassword(e.target.value)
        }}
        className="border p-2 mb-4 w-full rounded"
        disabled={loading}
      />
      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={loading}
      >
        {loading ? "Logging in..." : "Login"}
      </button>
      {AppConfig.allowSelfRegister ? (
        <Link
          to="/register"
          className="block mt-4 text-center text-sm hover:text-primary"
        >
          Register
        </Link>
      ) : null}
      <Link
        to="/forgot-password"
        className="block mt-4 text-center text-sm hover:text-primary"
      >
        Forgot Password
      </Link>
    </form>
  )
}

// login
// border p-2 mb-3 w-full rounded

// register
// border p-2 mb-3 w-full rounded

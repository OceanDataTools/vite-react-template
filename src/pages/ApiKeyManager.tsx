import type { JSX } from "react"
import APIKeys from "../components/APIKeys"

const ApiKeyManager = (): JSX.Element => {
  return (
    <div className="max-w-lg mx-auto mt-10">
      <div className="card bg-base-200 shadow-sm border border-base-300">
        <div className="card-body py-4 px-5">
          <h3 className="card-title text-base font-semibold">Manage API Keys</h3>
          <APIKeys />
        </div>
      </div>
    </div>
  )
}

export default ApiKeyManager

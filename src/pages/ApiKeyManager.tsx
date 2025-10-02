import type { JSX } from "react";
import APIKeys from "../components/APIKeys";

const ApiKeyManager = (): JSX.Element => {
  return (
  	<div className="max-w-lg mx-auto mt-10 p-4 border rounded shadow">
      <h3 className="text-xl font-semibold">Manage API Keys</h3>
	  	<APIKeys />
	  </div>
  )
}

export default ApiKeyManager;
/// <reference types="vite/client" />

type ImportMetaEnv = {
  readonly VITE_OPENRVDAS_VERSION: string
}

type ImportMeta = {
  readonly env: ImportMetaEnv
}

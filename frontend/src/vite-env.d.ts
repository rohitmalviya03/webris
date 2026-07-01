/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ORTHANC_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** APIのルートパス（デフォルト: /obslog） */
  readonly VITE_ROOT_PATH: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

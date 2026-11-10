/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Gemini API-nyckel från .env i projektroten. */
  readonly VITE_GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

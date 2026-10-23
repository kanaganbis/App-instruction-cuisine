/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Google Cloud API key allowed to call the Drive API. */
  readonly VITE_GOOGLE_API_KEY?: string;
  /** Share link (or id) of the Google Drive folder holding the recipes. */
  readonly VITE_DRIVE_FOLDER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADMIN_URL?: string;
  readonly VITE_JITSI_URL?: string;
  readonly VITE_CHAT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

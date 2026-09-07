/// <reference types="vite-plus/client" />

interface ImportMetaEnv {
  /** Absolute origin of the api Worker. Empty in local dev, where Vite proxies /trpc. */
  readonly VITE_API_URL?: string;
}

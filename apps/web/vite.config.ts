import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite-plus";
import { pwaPlugins } from "./pwa";

// Local dev and preview proxy /trpc and /api/auth to `wrangler dev` (port 8787),
// so no CORS or VITE_API_URL is needed when the api is served on the same origin.
export default defineConfig({
  plugins: [react(), tailwindcss(), ...pwaPlugins()],
  server: {
    port: 5173,
    proxy: {
      "/trpc": { target: "http://localhost:8787", changeOrigin: true },
      "/api/auth": { target: "http://localhost:8787", changeOrigin: true },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      "/trpc": { target: "http://localhost:8787", changeOrigin: true },
      "/api/auth": { target: "http://localhost:8787", changeOrigin: true },
    },
  },
});

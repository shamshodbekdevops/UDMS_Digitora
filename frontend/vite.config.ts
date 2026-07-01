import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const apiProxyTarget = process.env.VITE_DEV_API_PROXY_TARGET ?? "http://localhost:8000";
const wsProxyTarget = process.env.VITE_DEV_WS_PROXY_TARGET ?? "ws://localhost:8000";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true,
      },
      "/ws": {
        target: wsProxyTarget,
        ws: true,
      },
    },
  },
});

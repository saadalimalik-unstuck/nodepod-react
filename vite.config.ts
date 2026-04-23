import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import nodepod from "@scelar/nodepod/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), nodepod()],
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  optimizeDeps: {
    exclude: ["@tailwindcss/oxide", "lightningcss"], // Optional: avoids issues with pre-bundling threaded WASI
  },
  preview: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});

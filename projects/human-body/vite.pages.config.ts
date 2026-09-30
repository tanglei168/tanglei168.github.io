import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

const base = process.env.PAGES_BASE_PATH ?? "/k1-k12/human-body/";
export default defineConfig({
  root: resolve(import.meta.dirname, "pages"),
  publicDir: resolve(import.meta.dirname, "public"),
  base,
  plugins: [react()],
  define: { "process.env.NEXT_PUBLIC_BASE_PATH": JSON.stringify(base.replace(/\/$/, "")) },
  build: { outDir: resolve(import.meta.dirname, "dist-pages"), emptyOutDir: true },
  preview: { host: "127.0.0.1", port: 4320 },
});

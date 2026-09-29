import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  root: resolve(__dirname, "src/renderer"),
  build: {
    sourcemap: true,
    outDir: resolve(__dirname, "dist/renderer"),
    emptyOutDir: true
  },
  esbuild: {
    jsx: "automatic"
  }
});

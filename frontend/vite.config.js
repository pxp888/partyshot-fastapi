import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "../backend/static", // still outside, but okay
    emptyOutDir: true, // clear old files on each build
    sourcemap: false,
  },
});

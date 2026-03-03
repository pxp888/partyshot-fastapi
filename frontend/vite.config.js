import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 1. Proxy standard API calls
      // Example: fetch('/api/users') -> http://localhost:5000/api/users
      "/api": {
        target: "http://localhost:8000", // Change this to your backend port
        changeOrigin: true,
        secure: false,
      },
      // 2. Proxy WebSocket connections (important for your react-use-websocket hook)
      "/ws": {
        target: "ws://localhost:8000",
        ws: true,
      },
    },
  },
  build: {
    outDir: "../backend/static",
    emptyOutDir: true,
    sourcemap: false,
  },
});

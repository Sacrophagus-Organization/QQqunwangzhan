import path from "path"
import fs from "fs"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'generate-version',
      closeBundle() {
        const version = {
          version: new Date().toISOString(),
          buildTime: Date.now(),
        };
        fs.writeFileSync(
          path.resolve(__dirname, 'dist', 'version.json'),
          JSON.stringify(version)
        );
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});

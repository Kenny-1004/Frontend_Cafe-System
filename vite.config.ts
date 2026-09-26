import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The backend's port comes from Backend_Cafe-System/.env (PORT=5006).
// Override with: API_URL=http://localhost:4000 npm run dev
const API_URL = process.env.API_URL ?? 'http://localhost:5006'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    port: 5173,
    // Same-origin /api calls in development, so the backend needs no CORS setup
    // xfwd forwards the real client IP, so rate limits apply per kiosk, not per proxy
    proxy: { '/api': { target: API_URL, changeOrigin: true, xfwd: true } },
  },
  preview: {
    proxy: { '/api': { target: API_URL, changeOrigin: true, xfwd: true } },
  },
})

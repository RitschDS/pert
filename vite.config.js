import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Serve index.html for all routes in dev (SPA fallback for /share/:token)
  appType: 'spa',
})

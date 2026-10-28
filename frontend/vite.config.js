import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // lokalnie /api idzie do backendu, w klastrze robi to ALB
  server: { proxy: { '/api': 'http://localhost:3000' } },
})

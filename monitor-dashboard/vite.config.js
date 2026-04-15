import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3001,
    cors: {
      origin: ['http://localhost:3000', 'http://localhost:3001']
    }
  },
  preview: {
    port: 3001
  }
})

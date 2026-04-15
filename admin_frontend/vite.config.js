import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',  // Bind to localhost only for security
    port: 3000,
    strictPort: true,
    cors: {
      origin: ['http://localhost:3000'],
      credentials: true
    }
  },
  preview: {
    host: '127.0.0.1',
    port: 3000,
    strictPort: true
  },
  build: {
    outDir: 'build',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          utils: ['axios', 'jwt-decode']
        }
      }
    }
  },
  define: {
    'process.env': process.env
  }
})

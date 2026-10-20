/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  build: {
    chunkSizeWarningLimit: 600,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
  plugins: [
    react(),
  ],
  server: {
    proxy: {
      '/api': {
        // Override with VITE_DEV_API_TARGET when port 8080 is taken by another
        // project on this machine, for example:
        //   VITE_DEV_API_TARGET=http://localhost:8081 npm run dev
        // The API reads its own listen port from PORT.
        target: process.env.VITE_DEV_API_TARGET || 'http://localhost:8080',
      },
    },
  },
})

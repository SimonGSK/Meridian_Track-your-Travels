/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      include: ['src/**'],
      // Data files are generated and checked by their own tests
      exclude: ['src/**/*.test.*', 'src/test/**', 'src/main.tsx', 'src/**/*.json'],
    },
  },
})

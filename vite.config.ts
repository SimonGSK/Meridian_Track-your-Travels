/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig, mergeConfig } from 'vite'
import { offline } from './vite.offline.ts'

/** What the app and the screensaver (vite.screensaver.config.ts) are built with */
export const shared = defineConfig({
  // Relative, so the app works from any folder it's served from
  base: './',
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

// https://vite.dev/config/
// The app also works offline; the screensaver is a single file opened from disk, which can't
export default mergeConfig(shared, defineConfig({ plugins: [offline()] }))

import { defineConfig, devices } from '@playwright/test'

const CI = !!process.env.CI
// Locally the dev server, which may be running already. CI tests the production build:
// it loads faster, and the dev server reloads the page when it first bundles a dependency.
const PORT = CI ? 4173 : 5173

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  // Headless Chrome draws the globe in software, copying every frame back from its GPU
  // process, so each browser keeps the cores busy: GitHub's four cores fit just one
  workers: CI ? 1 : 3,
  timeout: CI ? 90_000 : 60_000,
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Recording a trace costs time too, so CI only records the retry
    trace: CI ? 'on-first-retry' : 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
      grepInvert: /@touch/,
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'] },
      grep: /@touch/,
    },
  ],
  webServer: {
    command: CI
      ? `npx vite build && npx vite preview --port ${PORT} --strictPort`
      : `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !CI,
    timeout: 180_000,
  },
})

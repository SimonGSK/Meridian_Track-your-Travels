import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Bundled, so the app never asks a third party for fonts
import '@fontsource-variable/inter'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/jetbrains-mono'
import './index.css'
import App from './App.tsx'
import { isScreensaver, unpackPlaces } from './screensaver'
import { registerServiceWorker } from './pwa/register'
import { listenForInstall } from './pwa/install'

// The sample data, with `npm run dev:demo` only: it's left out of the build
if (import.meta.env.MODE === 'demo') {
  const { seedDemo } = await import('./demo')
  seedDemo()
  // Reset once, not on every reload
  if (new URLSearchParams(window.location.search).has('reset')) window.history.replaceState(null, '', window.location.pathname)
}
// As a screensaver, show the places the address brings (it has its own storage)
if (isScreensaver()) unpackPlaces(window.location.hash)
// Installable, and kept for offline use
listenForInstall()
registerServiceWorker()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

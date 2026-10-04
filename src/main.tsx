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

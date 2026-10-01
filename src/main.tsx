import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Bundled, so the app never asks a third party for fonts
import '@fontsource-variable/inter'
import '@fontsource-variable/fraunces'
import '@fontsource-variable/jetbrains-mono'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

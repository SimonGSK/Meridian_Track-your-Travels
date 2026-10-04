import { useSyncExternalStore } from 'react'

/** Chrome and Edge's offer to install the app, which can be shown later from a button */
type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let offer: InstallPrompt | null = null
let justInstalled = false
const listeners = new Set<() => void>()
const changed = () => listeners.forEach((listener) => listener())

/** Listens for the browser's offer to install, before anything is shown, as it comes only once */
export function listenForInstall(target: EventTarget = window) {
  target.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    offer = event as InstallPrompt
    changed()
  })
  target.addEventListener('appinstalled', () => {
    offer = null
    justInstalled = true
    changed()
  })
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Running as the installed app, in its own window */
export const isStandalone = () =>
  !!window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

/** iPhone and iPad, where apps are added from Safari's share menu */
export const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/** Whether the app can be installed with a button, is installed, and a way to install it */
export function useInstall() {
  const canInstall = useSyncExternalStore(subscribe, () => offer !== null)
  const installed = useSyncExternalStore(subscribe, () => justInstalled) || isStandalone()
  const install = async () => {
    if (!offer) return
    const shown = offer
    offer = null
    await shown.prompt()
    await shown.userChoice
    changed()
  }
  return { canInstall, installed, install }
}

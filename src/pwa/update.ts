/**
 * A new version of the app, downloaded while it's open: the service worker
 * installs it in the background and it waits there, so the page can say so
 * and switch to it when asked, rather than only the next time it's opened.
 */

/** Fired on the window when a new version is ready, with its service worker as the detail */
export const UPDATE_READY = 'meridian:update-ready'

/** How often to look for a new version while the app stays open */
export const UPDATE_CHECK_MS = 60 * 60 * 1000

/** The new version waiting, once there is one: for a page that starts listening after it arrived */
let waiting: ServiceWorker | null = null
export const waitingUpdate = () => waiting

function ready(worker: ServiceWorker) {
  waiting = worker
  window.dispatchEvent(new CustomEvent(UPDATE_READY, { detail: worker }))
}

/** Says when a new version is ready, and keeps looking for one while the app is open */
export function watchForUpdates(registration: ServiceWorkerRegistration, container: ServiceWorkerContainer = navigator.serviceWorker) {
  // Downloaded on an earlier visit and still waiting
  if (registration.waiting && container.controller) ready(registration.waiting)
  registration.addEventListener('updatefound', () => {
    const worker = registration.installing
    worker?.addEventListener('statechange', () => {
      // Installed while this page runs on a version already: an update, not the first copy kept
      if (worker.state === 'installed' && container.controller) ready(worker)
    })
  })
  const check = () => {
    registration.update().catch(() => {
      // Offline: look again later
    })
  }
  const timer = setInterval(check, UPDATE_CHECK_MS)
  const onVisible = () => {
    if (document.visibilityState === 'visible') check()
  }
  document.addEventListener('visibilitychange', onVisible)
  return () => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisible)
  }
}

/** Switches to the new version: it takes over from the one running, and the page reloads with it */
export function applyUpdate(
  worker: ServiceWorker,
  container: ServiceWorkerContainer = navigator.serviceWorker,
  reload = () => window.location.reload(),
) {
  container.addEventListener('controllerchange', () => reload(), { once: true })
  worker.postMessage('skip-waiting')
}

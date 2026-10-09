import { isScreensaver } from '../screensaver'
import { watchForUpdates } from './update'

/**
 * Starts the service worker that keeps the app for offline use: in the
 * built app served over the web, not in development (where files change
 * all the time) nor as the screensaver opened from disk. It then says when
 * a new version is ready (see update.ts).
 */
export function registerServiceWorker({
  production = import.meta.env.PROD,
  location = window.location as Pick<Location, 'search' | 'protocol'>,
} = {}) {
  if (!production || !('serviceWorker' in navigator) || isScreensaver(location.search) || location.protocol === 'file:') return false
  const register = () =>
    navigator.serviceWorker
      .register('./sw.js')
      .then((registration) => watchForUpdates(registration))
      .catch(() => {
        // Not kept for offline this time; the app works as it is
      })
  // After the page has loaded, so keeping a copy doesn't slow down the first visit
  if (document.readyState === 'complete') void register()
  else window.addEventListener('load', () => void register(), { once: true })
  return true
}

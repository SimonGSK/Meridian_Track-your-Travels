/**
 * The service worker that lets Meridian work offline, written out by the
 * build (vite.offline.ts) with every file of the app and a version that
 * changes with them.
 *
 * It keeps a copy of everything when installed, so after the first visit
 * the globe, your places and the games all work without a connection. The
 * page itself comes from the network when there is one, so updates arrive;
 * everything else, named by its contents, comes from the copy. A new
 * version takes over the next time the app is opened, or at once when the
 * page asks (its "Reload"), and clears the old copy.
 */
export function serviceWorkerSource(files: readonly string[], version: string) {
  return `// Written by the build: see src/pwa/serviceWorker.ts
const VERSION = ${JSON.stringify(version)}
const FILES = ${JSON.stringify(['./', ...files])}
const CACHE = 'meridian-' + VERSION

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)))
})

self.addEventListener('message', (event) => {
  // The page's "Reload": take over now, rather than the next time the app is opened
  if (event.data === 'skip-waiting') self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key.startsWith('meridian-') && key !== CACHE).map((key) => caches.delete(key))),
    ),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return
  if (request.mode === 'navigate') {
    // The page: the newest when online, the copy when not
    event.respondWith(
      fetch(request).catch(() =>
        caches.open(CACHE).then((cache) => cache.match('./index.html').then((page) => page || cache.match('./'))),
      ),
    )
    return
  }
  // Ignoring Vary: the copy was fetched without the Origin header the app's scripts are asked for with
  event.respondWith(caches.match(request, { ignoreVary: true }).then((copy) => copy || fetch(request)))
})
`
}

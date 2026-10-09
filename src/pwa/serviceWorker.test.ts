import { describe, expect, it, vi } from 'vitest'
import { serviceWorkerSource } from './serviceWorker'

type FakeRequest = { url: string; method: string; mode: string }
type FakeEvent = {
  request?: FakeRequest
  data?: unknown
  respondWith: (answer: Promise<unknown>) => void
  waitUntil: (work: Promise<unknown>) => void
}

const ORIGIN = 'https://meridian.test'

/** Runs the worker against a fake browser: caches as maps of address to text, and a network */
function runWorker({ files = ['./index.html', './assets/index-1a2b.js'], version = 'v2', online = true } = {}) {
  const handlers = new Map<string, (event: FakeEvent) => void>()
  const self = {
    location: new URL(`${ORIGIN}/`),
    addEventListener: (type: string, handler: (event: FakeEvent) => void) => handlers.set(type, handler),
    skipWaiting: vi.fn(),
  }
  const stores = new Map<string, Map<string, string>>()
  const addressOf = (key: string | FakeRequest) => new URL(typeof key === 'string' ? key : key.url, `${ORIGIN}/`).href
  const cacheOf = (store: Map<string, string>) => ({
    addAll: async (urls: string[]) => urls.forEach((url) => store.set(addressOf(url), `copy of ${addressOf(url)}`)),
    match: async (key: string | FakeRequest) => store.get(addressOf(key)),
  })
  const matchOptions: unknown[] = []
  const caches = {
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map())
      return cacheOf(stores.get(name)!)
    },
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    match: async (request: FakeRequest, options?: unknown) => {
      matchOptions.push(options)
      for (const store of stores.values()) if (store.has(addressOf(request))) return store.get(addressOf(request))
      return undefined
    },
  }
  const fetch = vi.fn(async (request: FakeRequest) => {
    if (!online) throw new TypeError('Failed to fetch')
    return `network ${request.url}`
  })
  new Function('self', 'caches', 'fetch', serviceWorkerSource(files, version))(self, caches, fetch)

  /** Sends the worker an event, and what it answered or waited for */
  async function send(type: string, request?: FakeRequest) {
    let answer: Promise<unknown> | undefined
    let work: Promise<unknown> | undefined
    handlers.get(type)!({ request, respondWith: (a) => (answer = a), waitUntil: (w) => (work = w) })
    await work
    return { answered: answer !== undefined, answer: await answer }
  }
  const get = (path: string, mode = 'cors'): FakeRequest => ({ url: new URL(path, `${ORIGIN}/`).href, method: 'GET', mode })
  /** The page sends the worker a message */
  const message = (data: unknown) => handlers.get('message')!({ data, respondWith: () => {}, waitUntil: () => {} })
  return { self, stores, send, get, message, fetch, matchOptions }
}

describe('the service worker', () => {
  it('keeps the page and every file of the app when installed, under its version', async () => {
    const worker = runWorker()
    await worker.send('install')
    expect([...worker.stores.keys()]).toEqual(['meridian-v2'])
    expect([...worker.stores.get('meridian-v2')!.keys()]).toEqual([
      `${ORIGIN}/`,
      `${ORIGIN}/index.html`,
      `${ORIGIN}/assets/index-1a2b.js`,
    ])
  })

  it('takes over at once when the page asks (its "Reload"), and not otherwise', () => {
    const worker = runWorker()
    worker.message('hello')
    expect(worker.self.skipWaiting).not.toHaveBeenCalled()
    worker.message('skip-waiting')
    expect(worker.self.skipWaiting).toHaveBeenCalledOnce()
  })

  it('clears the copies of older versions when it takes over, and nothing else', async () => {
    const worker = runWorker()
    worker.stores.set('meridian-v1', new Map())
    worker.stores.set('another-app', new Map())
    await worker.send('install')
    await worker.send('activate')
    expect([...worker.stores.keys()].sort()).toEqual(['another-app', 'meridian-v2'])
  })

  it('answers files from the copy, whatever headers they were asked with', async () => {
    const worker = runWorker({ online: false })
    await worker.send('install')
    const { answer } = await worker.send('fetch', worker.get('/assets/index-1a2b.js'))
    expect(answer).toBe(`copy of ${ORIGIN}/assets/index-1a2b.js`)
    // The app's scripts are asked for with an Origin header the copy wasn't kept with
    expect(worker.matchOptions).toEqual([{ ignoreVary: true }])
  })

  it('fetches what it has no copy of', async () => {
    const worker = runWorker()
    await worker.send('install')
    const { answer } = await worker.send('fetch', worker.get('/new.json'))
    expect(answer).toBe(`network ${ORIGIN}/new.json`)
  })

  it('brings the newest page when online, and the copy when not', async () => {
    const online = runWorker()
    await online.send('install')
    expect((await online.send('fetch', online.get('/', 'navigate'))).answer).toBe(`network ${ORIGIN}/`)

    const offline = runWorker({ online: false })
    await offline.send('install')
    expect((await offline.send('fetch', offline.get('/', 'navigate'))).answer).toBe(`copy of ${ORIGIN}/index.html`)
    expect((await offline.send('fetch', offline.get('/?screensaver', 'navigate'))).answer).toBe(`copy of ${ORIGIN}/index.html`)
  })

  it('leaves other sites and anything but reading alone', async () => {
    const worker = runWorker()
    await worker.send('install')
    expect((await worker.send('fetch', { url: 'https://tiles.example/1.png', method: 'GET', mode: 'cors' })).answered).toBe(false)
    expect((await worker.send('fetch', { ...worker.get('/index.html'), method: 'POST' })).answered).toBe(false)
    expect(worker.fetch).not.toHaveBeenCalled()
  })
})

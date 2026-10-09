import { afterEach, describe, expect, it, vi } from 'vitest'
import { UPDATE_CHECK_MS, UPDATE_READY, applyUpdate, waitingUpdate, watchForUpdates } from './update'

/** A stand-in service worker, with its state */
class FakeWorker extends EventTarget {
  state = 'installing'
  postMessage = vi.fn()
  become(state: string) {
    this.state = state
    this.dispatchEvent(new Event('statechange'))
  }
}

/** A stand-in registration: what's installing, waiting, and update() */
class FakeRegistration extends EventTarget {
  installing: FakeWorker | null = null
  waiting: FakeWorker | null = null
  update = vi.fn(() => Promise.resolve())
  found(worker: FakeWorker) {
    this.installing = worker
    this.dispatchEvent(new Event('updatefound'))
  }
}

const container = (controlled: boolean) => Object.assign(new EventTarget(), { controller: controlled ? {} : null })
const watch = (registration: FakeRegistration, controlled = true) =>
  watchForUpdates(registration as unknown as ServiceWorkerRegistration, container(controlled) as unknown as ServiceWorkerContainer)

describe('watchForUpdates', () => {
  const stops: (() => void)[] = []
  afterEach(() => {
    stops.splice(0).forEach((stop) => stop())
    vi.useRealTimers()
  })

  it('says when a new version is installed while a version runs the page', () => {
    const ready = vi.fn()
    window.addEventListener(UPDATE_READY, ready)
    const registration = new FakeRegistration()
    stops.push(watch(registration))
    const worker = new FakeWorker()
    registration.found(worker)
    expect(ready).not.toHaveBeenCalled()
    worker.become('installed')
    expect((ready.mock.calls[0][0] as CustomEvent).detail).toBe(worker)
    expect(waitingUpdate()).toBe(worker)
    window.removeEventListener(UPDATE_READY, ready)
  })

  it('says so of one still waiting from an earlier visit, but not of the first copy kept', () => {
    const ready = vi.fn()
    window.addEventListener(UPDATE_READY, ready)
    const earlier = new FakeRegistration()
    earlier.waiting = new FakeWorker()
    stops.push(watch(earlier))
    expect(ready).toHaveBeenCalledOnce()

    const first = new FakeRegistration()
    stops.push(watch(first, false))
    const worker = new FakeWorker()
    first.found(worker)
    worker.become('installed')
    expect(ready).toHaveBeenCalledOnce()
    window.removeEventListener(UPDATE_READY, ready)
  })

  it('looks for a new version every hour, and on coming back to the app', () => {
    vi.useFakeTimers()
    const registration = new FakeRegistration()
    stops.push(watch(registration))
    vi.advanceTimersByTime(UPDATE_CHECK_MS)
    expect(registration.update).toHaveBeenCalledOnce()
    document.dispatchEvent(new Event('visibilitychange'))
    expect(registration.update).toHaveBeenCalledTimes(2)
  })
})

describe('applyUpdate', () => {
  it('asks the new version to take over, and reloads once it has', () => {
    const worker = new FakeWorker()
    const pages = container(true)
    const reload = vi.fn()
    applyUpdate(worker as unknown as ServiceWorker, pages as unknown as ServiceWorkerContainer, reload)
    expect(worker.postMessage).toHaveBeenCalledWith('skip-waiting')
    expect(reload).not.toHaveBeenCalled()
    pages.dispatchEvent(new Event('controllerchange'))
    expect(reload).toHaveBeenCalledOnce()
  })
})

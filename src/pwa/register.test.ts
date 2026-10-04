import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { registerServiceWorker } from './register'

const web = { search: '', protocol: 'https:' }

describe('registerServiceWorker', () => {
  let register: ReturnType<typeof vi.fn>
  beforeEach(() => {
    register = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'serviceWorker', { value: { register }, configurable: true })
  })
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'serviceWorker')
    vi.restoreAllMocks()
  })

  it('keeps the built app for offline use', () => {
    expect(registerServiceWorker({ production: true, location: web })).toBe(true)
    expect(register).toHaveBeenCalledWith('./sw.js')
  })

  it('waits for the page to load first', () => {
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading')
    expect(registerServiceWorker({ production: true, location: web })).toBe(true)
    expect(register).not.toHaveBeenCalled()
    window.dispatchEvent(new Event('load'))
    expect(register).toHaveBeenCalledWith('./sw.js')
  })

  it('does nothing in development, as the screensaver, opened from disk, or where it isn’t supported', () => {
    expect(registerServiceWorker({ production: false, location: web })).toBe(false)
    expect(registerServiceWorker({ production: true, location: { search: '?screensaver', protocol: 'https:' } })).toBe(false)
    expect(registerServiceWorker({ production: true, location: { search: '', protocol: 'file:' } })).toBe(false)
    expect(register).not.toHaveBeenCalled()
    Reflect.deleteProperty(navigator, 'serviceWorker')
    expect(registerServiceWorker({ production: true, location: web })).toBe(false)
  })
})

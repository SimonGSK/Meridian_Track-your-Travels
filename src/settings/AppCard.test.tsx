import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

/** The card, with the install offer state fresh for each test */
async function load() {
  vi.resetModules()
  const { listenForInstall } = await import('../pwa/install')
  const { default: AppCard } = await import('./AppCard')
  const browser = new EventTarget()
  listenForInstall(browser)
  return { AppCard, browser }
}

function installOffer(outcome: 'accepted' | 'dismissed') {
  return Object.assign(new Event('beforeinstallprompt', { cancelable: true }), {
    prompt: vi.fn(() => Promise.resolve()),
    userChoice: Promise.resolve({ outcome }),
  })
}

describe('AppCard', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn(() => ({ matches: false }) as MediaQueryList)
  })
  afterEach(() => {
    Reflect.deleteProperty(window, 'matchMedia')
    vi.restoreAllMocks()
  })

  it("says how to install from the browser's menu when there's no button for it", async () => {
    const { AppCard } = await load()
    render(<AppCard />)
    expect(screen.getByRole('region', { name: 'App' })).toHaveTextContent('works without internet too')
    expect(screen.getByText(/In Chrome or Edge, click the install icon/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Install Meridian' })).not.toBeInTheDocument()
  })

  it('says how to add it to the home screen on an iPhone', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue('Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X)')
    const { AppCard } = await load()
    render(<AppCard />)
    expect(screen.getByText('On iPhone or iPad: in Safari, tap Share, then Add to Home Screen.')).toBeInTheDocument()
  })

  it("installs with a button when the browser offers to, and then says it's installed", async () => {
    const { AppCard, browser } = await load()
    render(<AppCard />)
    const offer = installOffer('accepted')
    act(() => void browser.dispatchEvent(offer))
    expect(offer.defaultPrevented).toBe(true) // the browser's own bar isn't shown: the button is

    await userEvent.click(screen.getByRole('button', { name: 'Install Meridian' }))
    expect(offer.prompt).toHaveBeenCalled()
    act(() => void browser.dispatchEvent(new Event('appinstalled')))
    expect(screen.getByText("You're using the app.")).toBeInTheDocument()
  })

  it('goes back to the instructions when the install is turned down, as the browser offers only once', async () => {
    const { AppCard, browser } = await load()
    render(<AppCard />)
    act(() => void browser.dispatchEvent(installOffer('dismissed')))
    await userEvent.click(screen.getByRole('button', { name: 'Install Meridian' }))
    expect(screen.queryByRole('button', { name: 'Install Meridian' })).not.toBeInTheDocument()
    expect(screen.getByText(/In Chrome or Edge/)).toBeInTheDocument()
  })

  it('says so when opened as the app', async () => {
    window.matchMedia = vi.fn((query: string) => ({ matches: query === '(display-mode: standalone)' }) as MediaQueryList)
    const { AppCard } = await load()
    render(<AppCard />)
    expect(screen.getByText("You're using the app.")).toBeInTheDocument()
  })
})

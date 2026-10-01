import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ScreensaverCard from './ScreensaverCard'
import { unpackPlaces } from '../screensaver'

describe('ScreensaverCard', () => {
  it('explains the steps', () => {
    render(<ScreensaverCard />)
    expect(screen.getByText('npm run build:screensaver')).toBeInTheDocument()
    expect(screen.getByText('brew install --cask webviewscreensaver')).toBeInTheDocument()
  })

  it('gives an address for the shared folder that carries your places', () => {
    localStorage.setItem('countries-app.visited', JSON.stringify(['Fiji']))
    render(<ScreensaverCard />)
    const address = (screen.getByRole('textbox', { name: 'Screensaver address' }) as HTMLInputElement).value
    expect(address).toMatch(/^file:\/\/\/Users\/Shared\/Meridian\/index\.html\?screensaver#places=[\w-]+$/)

    localStorage.clear()
    unpackPlaces(address.slice(address.indexOf('#')))
    expect(localStorage.getItem('countries-app.visited')).toBe('["Fiji"]')
  })

  it('copies the address', async () => {
    const user = userEvent.setup()
    render(<ScreensaverCard />)
    await user.click(screen.getByRole('button', { name: 'Copy address' }))
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
    expect(await navigator.clipboard.readText()).toBe(
      (screen.getByRole('textbox', { name: 'Screensaver address' }) as HTMLInputElement).value,
    )
  })

  it('previews the screensaver in a new tab', () => {
    render(<ScreensaverCard />)
    const preview = screen.getByRole('link', { name: 'Preview' })
    expect(preview).toHaveAttribute('href', expect.stringMatching(/^\?screensaver#places=/))
    expect(preview).toHaveAttribute('target', '_blank')
  })
})

import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ScreensaverCard from './ScreensaverCard'
import { unpackPlaces } from '../screensaver'

describe('ScreensaverCard', () => {
  it('explains the steps', () => {
    render(<ScreensaverCard onPreview={vi.fn()} />)
    expect(screen.getByText('npm run build:screensaver')).toBeInTheDocument()
    expect(screen.getByText('brew install --cask webviewscreensaver')).toBeInTheDocument()
  })

  it('gives an address for the shared folder that carries your places', () => {
    localStorage.setItem('countries-app.visited', JSON.stringify(['Fiji']))
    render(<ScreensaverCard onPreview={vi.fn()} />)
    const address = (screen.getByRole('textbox', { name: 'Screensaver address' }) as HTMLInputElement).value
    expect(address).toMatch(/^file:\/\/\/Users\/Shared\/Meridian\/index\.html\?screensaver#places=[\w-]+$/)

    localStorage.clear()
    unpackPlaces(address.slice(address.indexOf('#')))
    expect(localStorage.getItem('countries-app.visited')).toBe('["Fiji"]')
  })

  it('copies the address', async () => {
    const user = userEvent.setup()
    render(<ScreensaverCard onPreview={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Copy address' }))
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
    expect(await navigator.clipboard.readText()).toBe(
      (screen.getByRole('textbox', { name: 'Screensaver address' }) as HTMLInputElement).value,
    )
  })

  it('leaves the address in the box to copy by hand when there is no clipboard', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('denied'))
    render(<ScreensaverCard onPreview={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Copy address' }))
    expect(screen.getByRole('button', { name: 'Copy address' })).toBeInTheDocument()
    expect((screen.getByRole('textbox', { name: 'Screensaver address' }) as HTMLInputElement).value).toMatch(/^file:/)
  })

  it('selects the whole address when you click into it, to copy by hand', async () => {
    render(<ScreensaverCard onPreview={vi.fn()} />)
    const box = screen.getByRole('textbox', { name: 'Screensaver address' }) as HTMLInputElement
    await userEvent.click(box)
    expect([box.selectionStart, box.selectionEnd]).toEqual([0, box.value.length])
  })

  it('previews the screensaver in the app', async () => {
    const onPreview = vi.fn()
    render(<ScreensaverCard onPreview={onPreview} />)
    await userEvent.click(screen.getByRole('button', { name: 'Preview' }))
    expect(onPreview).toHaveBeenCalled()
  })
})

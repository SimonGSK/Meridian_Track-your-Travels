import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import SettingsPanel, { type SettingId } from './SettingsPanel'

/** The panel, keeping which setting is open as the app does */
function Panel({ onPreview = vi.fn() }: { onPreview?: () => void }) {
  const [open, setOpen] = useState<SettingId | null>(null)
  return <SettingsPanel open={open} onOpen={setOpen} onPreview={onPreview} />
}

describe('SettingsPanel', () => {
  beforeEach(() => {
    window.matchMedia = vi.fn(() => ({ matches: false }) as MediaQueryList)
  })
  afterEach(() => Reflect.deleteProperty(window, 'matchMedia'))

  it('shows each setting as a small card, named, with a line on what it is', () => {
    render(<Panel />)
    const cards = screen.getAllByRole('listitem')
    expect(cards).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Backup' })).toHaveAccessibleDescription('Keep your places safe in a file')
    expect(screen.getByRole('button', { name: 'App' })).toHaveAccessibleDescription('Install Meridian, and use it offline')
    expect(screen.getByRole('button', { name: 'Screensaver' })).toHaveAccessibleDescription('The globe as a Mac screensaver')
    // Only the cards, not what's in them
    expect(screen.queryByRole('button', { name: 'Download backup' })).not.toBeInTheDocument()
  })

  it('opens a card to all of it, and goes back to the others', async () => {
    render(<Panel />)
    await userEvent.click(screen.getByRole('button', { name: 'Backup' }))
    expect(screen.getByRole('region', { name: 'Backup' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download backup' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'App' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: '← All settings' }))
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    await userEvent.click(screen.getByRole('button', { name: 'App' }))
    expect(screen.getByRole('region', { name: 'App' })).toHaveTextContent('works without internet too')
  })

  it('previews the screensaver from its card', async () => {
    const onPreview = vi.fn()
    render(<Panel onPreview={onPreview} />)
    await userEvent.click(screen.getByRole('button', { name: 'Screensaver' }))
    await userEvent.click(screen.getByRole('button', { name: 'Preview' }))
    expect(onPreview).toHaveBeenCalledOnce()
  })

  it("says when it's installed already", () => {
    window.matchMedia = vi.fn(() => ({ matches: true }) as MediaQueryList)
    render(<Panel />)
    expect(screen.getByRole('button', { name: 'App' })).toHaveAccessibleDescription('Installed, and works offline')
  })
})

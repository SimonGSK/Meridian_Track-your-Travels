import { describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LayerList from './LayerList'
import { DEFAULT_SETTINGS, type Settings } from './useSettings'

function setup({ settings = DEFAULT_SETTINGS }: { settings?: Settings } = {}) {
  const props = { settings, onChange: vi.fn() }
  render(<LayerList {...props} />)
  return props
}

describe('LayerList', () => {
  it('has a switch for each layer, showing its state', () => {
    setup({ settings: { ...DEFAULT_SETTINGS, showMarkers: false } })
    expect(screen.getByRole('switch', { name: /Visited countries/ })).toBeChecked()
    expect(screen.getByRole('switch', { name: /Visited states/ })).toBeChecked()
    expect(screen.getByRole('switch', { name: /City pins/ })).toBeChecked()
    expect(screen.getByRole('switch', { name: /Small islands/ })).not.toBeChecked()
  })

  it('offers city lights only while day and night is on, under it', async () => {
    setup({ settings: { ...DEFAULT_SETTINGS, showDayNight: false } })
    expect(screen.queryByRole('switch', { name: /City lights/ })).not.toBeInTheDocument()
    cleanup()
    const { onChange } = setup({ settings: { ...DEFAULT_SETTINGS, showDayNight: true } })
    const lights = screen.getByRole('switch', { name: /City lights/ })
    expect(lights).toBeChecked()
    expect(lights.closest('li')).toHaveClass('sublayer')
    await userEvent.click(lights)
    expect(onChange).toHaveBeenCalledWith({ showCityLights: false })
  })

  it('turns layers on and off', async () => {
    const { onChange } = setup({ settings: { ...DEFAULT_SETTINGS, showMarkers: false } })
    await userEvent.click(screen.getByRole('switch', { name: /City pins/ }))
    expect(onChange).toHaveBeenCalledWith({ showCities: false })
    await userEvent.click(screen.getByRole('switch', { name: /Small islands/ }))
    expect(onChange).toHaveBeenCalledWith({ showMarkers: true })
  })
})

import { describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExplorePanel from './ExplorePanel'
import { DEFAULT_SETTINGS, type Settings } from './useSettings'
import { MIDNIGHT, THEMES } from '../globe/themes'
import { loadCities } from '../data/cities'

const cities = await loadCities()

function setup({ settings = DEFAULT_SETTINGS, compact = true }: { settings?: Settings; compact?: boolean } = {}) {
  const props = {
    settings,
    onChange: vi.fn(),
    theme: MIDNIGHT,
    onThemeChange: vi.fn(),
    onFind: vi.fn(),
    cities,
    compact,
  }
  render(<ExplorePanel {...props} />)
  return props
}

const magnifier = () => screen.getByRole('button', { name: 'Search the atlas' })
const gear = () => screen.getByRole('button', { name: 'Design and layers' })
const search = () => screen.getByRole('searchbox', { name: 'Search the atlas' })
const found = () => within(screen.getByRole('list', { name: 'Places found' })).getAllByRole('button')

describe('ExplorePanel', () => {
  describe('buttons', () => {
    it('starts as just a magnifying glass and a gear', () => {
      setup()
      expect(magnifier()).toHaveAttribute('aria-expanded', 'false')
      expect(gear()).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
      expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    })

    it('opens the search with the magnifying glass, ready to type', async () => {
      setup()
      await userEvent.click(magnifier())
      expect(magnifier()).toHaveAttribute('aria-expanded', 'true')
      expect(search()).toHaveFocus()
      await userEvent.click(magnifier())
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    })

    it('opens the design and layers with the gear', async () => {
      setup()
      await userEvent.click(gear())
      expect(gear()).toHaveAttribute('aria-expanded', 'true')
      expect(screen.getByRole('region', { name: /Design & layers/ })).toBeInTheDocument()
      await userEvent.click(gear())
      expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    })

    it('opens one at a time', async () => {
      setup()
      await userEvent.click(magnifier())
      await userEvent.click(gear())
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
      expect(screen.getAllByRole('switch').length).toBeGreaterThan(0)
      await userEvent.click(magnifier())
      expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    })

    it('closes with Escape', async () => {
      setup()
      await userEvent.click(gear())
      await userEvent.keyboard('{Escape}')
      expect(screen.queryByRole('switch')).not.toBeInTheDocument()
      expect(gear()).toHaveAttribute('aria-expanded', 'false')
    })

    it('puts an empty search away when you click elsewhere, but not one with something typed', async () => {
      setup()
      await userEvent.click(magnifier())
      await userEvent.click(document.body)
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
      await userEvent.click(magnifier())
      await userEvent.type(search(), 'den')
      await userEvent.click(document.body)
      expect(search()).toHaveValue('den')
    })

    it('shows both open on phones, in their sheet', () => {
      setup({ compact: false })
      expect(screen.queryByRole('button', { name: 'Design and layers' })).not.toBeInTheDocument()
      expect(search()).toBeInTheDocument()
      expect(screen.getByRole('region', { name: /Design & layers/ })).toBeInTheDocument()
    })
  })

  describe('design and layers', () => {
    it('offers every design as a swatch, marking the current one', async () => {
      const { onThemeChange } = setup()
      await userEvent.click(gear())
      const designs = screen.getByRole('group', { name: 'Design' })
      expect(within(designs).getAllByRole('button')).toHaveLength(THEMES.length)
      expect(within(designs).getByRole('button', { name: 'Midnight' })).toHaveAttribute('aria-pressed', 'true')
      await userEvent.click(within(designs).getByRole('button', { name: 'Vintage' }))
      expect(onThemeChange).toHaveBeenCalledWith('vintage')
    })

    it('has a switch for each layer, showing its state', async () => {
      setup({ settings: { ...DEFAULT_SETTINGS, showMarkers: false } })
      await userEvent.click(gear())
      expect(screen.getByRole('switch', { name: /Visited countries/ })).toBeChecked()
      expect(screen.getByRole('switch', { name: /Visited states/ })).toBeChecked()
      expect(screen.getByRole('switch', { name: /City pins/ })).toBeChecked()
      expect(screen.getByRole('switch', { name: /Small islands/ })).not.toBeChecked()
    })

    it('offers city lights only while day and night is on, under it', async () => {
      setup({ settings: { ...DEFAULT_SETTINGS, showDayNight: false } })
      await userEvent.click(gear())
      expect(screen.queryByRole('switch', { name: /City lights/ })).not.toBeInTheDocument()
      cleanup()
      const { onChange } = setup({ settings: { ...DEFAULT_SETTINGS, showDayNight: true } })
      await userEvent.click(gear())
      const lights = screen.getByRole('switch', { name: /City lights/ })
      expect(lights).toBeChecked()
      expect(lights.closest('li')).toHaveClass('sublayer')
      await userEvent.click(lights)
      expect(onChange).toHaveBeenCalledWith({ showCityLights: false })
    })

    it('turns layers on and off', async () => {
      const { onChange } = setup({ settings: { ...DEFAULT_SETTINGS, showMarkers: false } })
      await userEvent.click(gear())
      await userEvent.click(screen.getByRole('switch', { name: /City pins/ }))
      expect(onChange).toHaveBeenCalledWith({ showCities: false })
      await userEvent.click(screen.getByRole('switch', { name: /Small islands/ }))
      expect(onChange).toHaveBeenCalledWith({ showMarkers: true })
    })
  })

  describe('search', () => {
    it('finds countries by any of their names, and shows the one picked', async () => {
      const { onFind } = setup({ compact: false })
      await userEvent.type(search(), 'swazi')
      expect(found()[0]).toHaveTextContent(/^Eswatini/)
      await userEvent.click(found()[0])
      expect(onFind).toHaveBeenCalledWith(expect.objectContaining({ properties: expect.objectContaining({ name: 'Eswatini' }) }))
      expect(search()).toHaveValue('')
    })

    it('puts itself away after finding a place', async () => {
      const { onFind } = setup()
      await userEvent.click(magnifier())
      await userEvent.keyboard('denmark{Enter}')
      expect(onFind).toHaveBeenCalledWith(expect.objectContaining({ properties: expect.objectContaining({ name: 'Denmark' }) }))
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    })

    it('finds cities, showing their country', async () => {
      const { onFind } = setup({ compact: false })
      await userEvent.type(search(), 'aarhu{Enter}')
      expect(onFind).toHaveBeenCalledWith(expect.objectContaining({ properties: expect.objectContaining({ name: 'Denmark' }) }))
    })

    it('finds cities by any word of their name', async () => {
      const { onFind } = setup({ compact: false })
      await userEvent.type(search(), 'nelspruit{Enter}')
      expect(onFind).toHaveBeenCalledWith(expect.objectContaining({ properties: expect.objectContaining({ name: 'South Africa' }) }))
    })

    it('says when nothing matches', async () => {
      setup({ compact: false })
      await userEvent.type(search(), 'xyzzy')
      expect(screen.getByText(/Nothing called/)).toBeInTheDocument()
    })
  })
})

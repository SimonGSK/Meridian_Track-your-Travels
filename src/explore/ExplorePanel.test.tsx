import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExplorePanel from './ExplorePanel'
import { DEFAULT_SETTINGS } from './useSettings'
import { MIDNIGHT, THEMES } from '../globe/themes'
import { loadCities } from '../data/cities'

const cities = await loadCities()

function setup() {
  const props = {
    settings: DEFAULT_SETTINGS,
    onChange: vi.fn(),
    theme: MIDNIGHT,
    onThemeChange: vi.fn(),
    onFind: vi.fn(),
    cities,
  }
  render(<ExplorePanel {...props} />)
  return props
}

const magnifier = () => screen.getByRole('button', { name: 'Search the atlas' })
const layers = () => screen.getByRole('button', { name: 'Style and layers' })
const search = () => screen.getByRole('searchbox', { name: 'Search the atlas' })
const found = () => within(screen.getByRole('list', { name: 'Places found' })).getAllByRole('button')

describe('ExplorePanel', () => {
  describe('buttons', () => {
    it('starts as just a magnifying glass and a layers button', () => {
      setup()
      expect(screen.getByRole('region', { name: 'Explore' })).toBeInTheDocument()
      expect(magnifier()).toHaveAttribute('aria-expanded', 'false')
      expect(layers()).toHaveAttribute('aria-expanded', 'false')
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

    it('opens the designs and the layers with the layers button', async () => {
      const { onThemeChange, onChange } = setup()
      await userEvent.click(layers())
      expect(layers()).toHaveAttribute('aria-expanded', 'true')
      const designs = screen.getByRole('group', { name: 'Design' })
      expect(within(designs).getAllByRole('button')).toHaveLength(THEMES.length)
      await userEvent.click(within(designs).getByRole('button', { name: 'Night' }))
      expect(onThemeChange).toHaveBeenCalledWith('night')
      await userEvent.click(screen.getByRole('switch', { name: /City pins/ }))
      expect(onChange).toHaveBeenCalledWith({ showCities: false })
      await userEvent.click(layers())
      expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    })

    it('opens one at a time', async () => {
      setup()
      await userEvent.click(magnifier())
      await userEvent.click(layers())
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
      expect(screen.getAllByRole('switch').length).toBeGreaterThan(0)
      await userEvent.click(magnifier())
      expect(screen.queryByRole('switch')).not.toBeInTheDocument()
    })

    it('closes with Escape', async () => {
      setup()
      await userEvent.click(layers())
      await userEvent.keyboard('{Escape}')
      expect(screen.queryByRole('switch')).not.toBeInTheDocument()
      expect(layers()).toHaveAttribute('aria-expanded', 'false')
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
  })

  describe('search', () => {
    it('finds countries by any of their names, and shows the one picked', async () => {
      const { onFind } = setup()
      await userEvent.click(magnifier())
      await userEvent.type(search(), 'swazi')
      expect(found()[0]).toHaveTextContent(/^Eswatini/)
      await userEvent.click(found()[0])
      expect(onFind).toHaveBeenCalledWith(expect.objectContaining({ properties: expect.objectContaining({ name: 'Eswatini' }) }))
      // Put away, and empty when opened again
      await userEvent.click(magnifier())
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
      const { onFind } = setup()
      await userEvent.click(magnifier())
      await userEvent.type(search(), 'aarhu{Enter}')
      expect(onFind).toHaveBeenCalledWith(expect.objectContaining({ properties: expect.objectContaining({ name: 'Denmark' }) }))
    })

    it('finds cities by any word of their name', async () => {
      const { onFind } = setup()
      await userEvent.click(magnifier())
      await userEvent.type(search(), 'nelspruit{Enter}')
      expect(onFind).toHaveBeenCalledWith(expect.objectContaining({ properties: expect.objectContaining({ name: 'South Africa' }) }))
    })

    it('says when nothing matches', async () => {
      setup()
      await userEvent.click(magnifier())
      await userEvent.type(search(), 'xyzzy')
      expect(screen.getByText(/Nothing called/)).toBeInTheDocument()
    })
  })
})

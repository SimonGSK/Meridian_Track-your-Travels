import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExplorePanel from './ExplorePanel'
import { gameSummary } from './gameSummary'
import { DEFAULT_SETTINGS, type Settings } from './useSettings'
import { MIDNIGHT, THEMES } from '../globe/themes'
import { loadCities } from '../data/cities'

const cities = await loadCities()

function setup({ settings = DEFAULT_SETTINGS, best = {} }: { settings?: Settings; best?: Record<string, number> } = {}) {
  const props = {
    settings,
    onChange: vi.fn(),
    theme: MIDNIGHT,
    onThemeChange: vi.fn(),
    best,
    onOpenGame: vi.fn(),
    onFind: vi.fn(),
    cities,
  }
  render(<ExplorePanel {...props} />)
  return props
}

describe('ExplorePanel', () => {
  describe('games', () => {
    it('lists every game, opening the one clicked', async () => {
      const { onOpenGame } = setup()
      const games = screen.getByRole('region', { name: /Games/ })
      expect(within(games).getAllByRole('button')).toHaveLength(6)
      await userEvent.click(within(games).getByRole('button', { name: /^Flag quiz/ }))
      expect(onOpenGame).toHaveBeenCalledWith('flags')
    })

    it('shows your best next to a game, or what it is about', () => {
      setup({ best: { 'flags:easy': 8, 'flags:hard': 5 } })
      expect(screen.getByRole('button', { name: /^Flag quiz/ })).toHaveTextContent('Best 80%')
      expect(screen.getByRole('button', { name: /^Find the country/ })).toHaveTextContent('Point it out')
    })
  })

  describe('design and layers', () => {
    it('offers every design as a swatch, marking the current one', async () => {
      const { onThemeChange } = setup()
      const designs = screen.getByRole('group', { name: 'Design' })
      expect(within(designs).getAllByRole('button')).toHaveLength(THEMES.length)
      expect(within(designs).getByRole('button', { name: 'Midnight' })).toHaveAttribute('aria-pressed', 'true')
      await userEvent.click(within(designs).getByRole('button', { name: 'Vintage' }))
      expect(onThemeChange).toHaveBeenCalledWith('vintage')
    })

    it('has a switch for each layer, showing its state', () => {
      setup({ settings: { ...DEFAULT_SETTINGS, showMarkers: false } })
      expect(screen.getByRole('switch', { name: /Visited countries/ })).toBeChecked()
      expect(screen.getByRole('switch', { name: /Visited states/ })).toBeChecked()
      expect(screen.getByRole('switch', { name: /City pins/ })).toBeChecked()
      expect(screen.getByRole('switch', { name: /Small islands/ })).not.toBeChecked()
    })

    it('turns layers on and off', async () => {
      const { onChange } = setup({ settings: { ...DEFAULT_SETTINGS, showMarkers: false } })
      await userEvent.click(screen.getByRole('switch', { name: /City pins/ }))
      expect(onChange).toHaveBeenCalledWith({ showCities: false })
      await userEvent.click(screen.getByRole('switch', { name: /Small islands/ }))
      expect(onChange).toHaveBeenCalledWith({ showMarkers: true })
    })
  })

  describe('search', () => {
    const search = () => screen.getByRole('searchbox', { name: 'Search the atlas' })
    const found = () => within(screen.getByRole('list', { name: 'Places found' })).getAllByRole('button')

    it('finds countries by any of their names, and shows the one picked', async () => {
      const { onFind } = setup()
      await userEvent.type(search(), 'swazi')
      expect(found()[0]).toHaveTextContent(/^Eswatini/)
      await userEvent.click(found()[0])
      expect(onFind).toHaveBeenCalledWith(expect.objectContaining({ properties: expect.objectContaining({ name: 'Eswatini' }) }))
      expect(search()).toHaveValue('')
    })

    it('finds cities, showing their country', async () => {
      const { onFind } = setup()
      await userEvent.type(search(), 'aarhu{Enter}')
      expect(onFind).toHaveBeenCalledWith(expect.objectContaining({ properties: expect.objectContaining({ name: 'Denmark' }) }))
    })

    it('says when nothing matches', async () => {
      setup()
      await userEvent.type(search(), 'xyzzy')
      expect(screen.getByText(/Nothing called/)).toBeInTheDocument()
    })
  })
})

describe('gameSummary', () => {
  it('shows the best share over all difficulties', () => {
    expect(gameSummary('shape', { 'shape:easy': 5, 'shape:medium': 9 })).toBe('Best 90%')
  })

  it('counts countries named, and letters completed', () => {
    expect(gameSummary('all', { 'all:world': 120 })).toBe('120 / 197')
    expect(gameSummary('letter', { 'letter:Z': 2, 'letter:K': 1 })).toMatch(/^1 \/ \d+ letters$/) // Zambia and Zimbabwe; not all the K's
  })

  it('says what a game is about before it has been played', () => {
    expect(gameSummary('all', {})).toBe('From memory')
    expect(gameSummary('letter', {})).toBe('A to Z')
  })
})

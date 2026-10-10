import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ExplorePanel from './ExplorePanel'
import { loadCities } from '../data/cities'

const cities = await loadCities()

function setup({ compact = true }: { compact?: boolean } = {}) {
  const props = { onFind: vi.fn(), cities, compact }
  render(<ExplorePanel {...props} />)
  return props
}

const magnifier = () => screen.getByRole('button', { name: 'Search the atlas' })
const search = () => screen.getByRole('searchbox', { name: 'Search the atlas' })
const found = () => within(screen.getByRole('list', { name: 'Places found' })).getAllByRole('button')

describe('ExplorePanel', () => {
  describe('buttons', () => {
    it('starts as just a magnifying glass', () => {
      setup()
      expect(magnifier()).toHaveAttribute('aria-expanded', 'false')
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
      expect(screen.queryByRole('switch')).not.toBeInTheDocument()
      expect(screen.queryByRole('group', { name: 'Design' })).not.toBeInTheDocument()
    })

    it('opens the search with the magnifying glass, ready to type', async () => {
      setup()
      await userEvent.click(magnifier())
      expect(magnifier()).toHaveAttribute('aria-expanded', 'true')
      expect(search()).toHaveFocus()
      await userEvent.click(magnifier())
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    })

    it('closes with Escape', async () => {
      setup()
      await userEvent.click(magnifier())
      await userEvent.keyboard('{Escape}')
      expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
      expect(magnifier()).toHaveAttribute('aria-expanded', 'false')
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

    it('shows the search open on phones, in their sheet', () => {
      setup({ compact: false })
      expect(screen.queryByRole('button', { name: 'Search the atlas' })).not.toBeInTheDocument()
      expect(search()).toBeInTheDocument()
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

import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VisitedPanel from './VisitedPanel'
import { percentLabel } from './percentLabel'
import { countries } from '../countries'

function setup(visited: string[] = []) {
  const props = { visited: new Set(visited), onAdd: vi.fn(), onRemove: vi.fn(), onShow: vi.fn() }
  render(<VisitedPanel {...props} />)
  return props
}

const search = () => screen.getByRole('searchbox', { name: 'Add a country' })
const results = () => screen.queryByRole('list', { name: 'Search results' })

describe('VisitedPanel', () => {
  it('shows how much of the world has been visited', () => {
    setup(['Denmark', 'Japan'])
    expect(screen.getByText(`of ${countries.length} countries and territories`)).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Share of the world visited' })).toHaveAttribute(
      'aria-valuenow',
      '2',
    )
  })

  it('invites you to add countries when none are visited', () => {
    setup()
    expect(screen.getByText(/None yet/)).toBeInTheDocument()
  })

  it('lists visited countries alphabetically', () => {
    setup(['Japan', 'Denmark', 'Brazil'])
    const list = screen.getByRole('list', { name: 'Visited countries' })
    const names = within(list)
      .getAllByRole('button', { name: /^(?!Remove)/ })
      .map((b) => b.textContent)
    expect(names).toEqual(['Brazil', 'Denmark', 'Japan'])
  })

  it('searches countries that are not visited yet', async () => {
    setup(['Denmark'])
    await userEvent.type(search(), 'den')
    const names = within(results()!).getAllByRole('button').map((b) => b.textContent)
    expect(names).toEqual(['SwedenAdd'])
  })

  it('says when nothing matches', async () => {
    setup()
    await userEvent.type(search(), 'atlantis')
    expect(results()).not.toBeInTheDocument()
    expect(screen.getByText('No matching countries.')).toBeInTheDocument()
  })

  it('adds a country by clicking a result, then clears the search', async () => {
    const { onAdd } = setup()
    await userEvent.type(search(), 'japa')
    await userEvent.click(within(results()!).getByRole('button', { name: /Japan/ }))
    expect(onAdd).toHaveBeenCalledWith('Japan')
    expect(search()).toHaveValue('')
  })

  it('adds the first result when pressing Enter', async () => {
    const { onAdd } = setup()
    await userEvent.type(search(), 'denm{Enter}')
    expect(onAdd).toHaveBeenCalledWith('Denmark')
  })

  it('removes a country', async () => {
    const { onRemove } = setup(['Denmark'])
    await userEvent.click(screen.getByRole('button', { name: 'Remove Denmark' }))
    expect(onRemove).toHaveBeenCalledWith('Denmark')
  })

  it('shows a country on the globe when clicked', async () => {
    const { onShow } = setup(['Denmark'])
    await userEvent.click(screen.getByRole('button', { name: 'Denmark' }))
    expect(onShow).toHaveBeenCalledWith(countries.find((c) => c.properties.name === 'Denmark'))
  })
})

describe('percentLabel', () => {
  it('rounds to whole percents', () => {
    expect(percentLabel(0, 240)).toBe('0%')
    expect(percentLabel(12, 240)).toBe('5%')
    expect(percentLabel(240, 240)).toBe('100%')
  })

  it('shows <1% rather than 0% once something is visited', () => {
    expect(percentLabel(1, 240)).toBe('<1%')
  })
})

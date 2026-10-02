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
/** A figure in the stats box */
const stat = (label: string) => screen.getByText(label, { selector: 'dt' }).nextElementSibling
const results = () => screen.queryByRole('list', { name: 'Search results' })

describe('VisitedPanel', () => {
  it("shows how many of the world's countries have been visited", () => {
    setup(['Denmark', 'Japan'])
    expect(stat('Countries')).toHaveTextContent('2 / 197')
    expect(screen.getByRole('progressbar', { name: "Share of the world's countries visited" })).toHaveAttribute(
      'aria-valuenow',
      '2',
    )
  })

  it('counts the cities visited', () => {
    render(<VisitedPanel visited={new Set(['Denmark'])} onAdd={() => {}} onRemove={() => {}} onShow={() => {}} cityCount={3} />)
    expect(stat('Cities')).toHaveTextContent('3')
  })

  it('counts territories separately', () => {
    setup(['Denmark', 'Greenland', 'Faroe Islands'])
    expect(screen.getByRole('progressbar', { name: "Share of the world's countries visited" })).toHaveAttribute(
      'aria-valuenow',
      '1',
    )
    expect(stat('Territories')).toHaveTextContent(/^2 \/ \d+$/)
  })

  it('invites you to add countries when none are visited', () => {
    setup()
    expect(screen.getByText(/None yet/)).toBeInTheDocument()
  })

  it('groups visited countries by continent, alphabetically', () => {
    setup(['Japan', 'Denmark', 'Brazil', 'Sweden', 'Argentina'])
    const groups = within(screen.getByRole('list', { name: 'Visited countries' }))
    const names = (continent: string) =>
      within(groups.getByRole('list', { name: new RegExp(continent) }))
        .getAllByRole('button', { name: /^(?!Remove)/ })
        .map((b) => b.textContent)
    expect(screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent)).toEqual([
      'Asia 1',
      'Europe 2',
      'South America 2',
    ])
    expect(names('Europe')).toEqual(['Denmark', 'Sweden'])
    expect(names('South America')).toEqual(['Argentina', 'Brazil'])
  })

  it('notes how many states and cities of a country are visited', () => {
    render(
      <VisitedPanel
        visited={new Set(['United States', 'Denmark'])}
        onAdd={() => {}}
        onRemove={() => {}}
        onShow={() => {}}
        note={(c) => (c.properties.name === 'United States' ? '3 of 51 states' : null)}
      />,
    )
    expect(screen.getByRole('button', { name: /^United States/ })).toHaveTextContent('3 of 51 states')
    expect(screen.getByRole('button', { name: /^Denmark/ })).toHaveTextContent(/^Denmark$/)
  })

  it('marks territories in the list', () => {
    setup(['Denmark', 'Greenland'])
    const northAmerica = screen.getByRole('list', { name: /North America/ })
    expect(within(northAmerica).getByRole('button', { name: /^Greenland/ })).toHaveTextContent('Territory')
  })

  it('shows how much of each continent has been visited', () => {
    setup(['Denmark', 'Sweden', 'Norway', 'Japan', 'Greenland'])
    const europe = screen.getByRole('progressbar', { name: 'Europe: 3 of 46 countries' })
    expect(europe).toHaveAttribute('aria-valuenow', '3')
    expect(europe).toHaveAttribute('aria-valuetext', '7%')
    expect(screen.getByRole('progressbar', { name: 'Asia: 1 of 48 countries' })).toBeInTheDocument()
    // Greenland is a territory, so North America stays at 0
    expect(screen.getByRole('progressbar', { name: 'North America: 0 of 23 countries' })).toBeInTheDocument()
  })

  it('shows every inhabited continent, even with nothing visited', () => {
    setup()
    const stats = screen.getByRole('list', { name: 'Countries visited by continent' })
    expect(within(stats).getAllByRole('listitem').map((li) => li.querySelector('.continent-name')!.textContent)).toEqual([
      'Africa',
      'Asia',
      'Europe',
      'North America',
      'Oceania',
      'South America',
    ])
  })

  it('searches countries that are not visited yet', async () => {
    setup(['Denmark'])
    await userEvent.type(search(), 'de')
    const names = within(results()!).getAllByRole('button').map((b) => b.textContent)
    expect(names).not.toContain('DenmarkAdd')
    expect(names).toContain('Democratic Republic of the CongoAdd')
  })

  it('finds countries by their former names', async () => {
    const { onAdd } = setup()
    await userEvent.type(search(), 'Swaziland')
    expect(within(results()!).getByRole('button')).toHaveTextContent('Eswatini (Swaziland)')
    await userEvent.keyboard('{Enter}')
    expect(onAdd).toHaveBeenCalledWith('Eswatini')
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

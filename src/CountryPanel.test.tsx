import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CountryPanel from './CountryPanel'
import { countries } from './countries'

const byName = (name: string) => countries.find((c) => c.properties.name === name)!

describe('CountryPanel', () => {
  const show = (name: string) =>
    render(<CountryPanel country={byName(name)} visited={false} onToggleVisited={() => {}} onClose={() => {}} />)
  const fact = (term: string) => screen.getByText(term, { selector: 'dt' }).nextElementSibling

  it('shows the name, its ISO code, whether it is a country or a territory, and where', () => {
    show('Denmark')
    expect(screen.getByRole('heading', { name: 'Denmark' })).toBeInTheDocument()
    expect(screen.getByText('(A) Selected country')).toBeInTheDocument()
    expect(screen.getByText('ISO 208')).toBeInTheDocument()
    expect(screen.getByText('Europe')).toBeInTheDocument()
  })

  it('counts the states of countries that have them', () => {
    render(
      <CountryPanel
        country={byName('United States')}
        visited={false}
        onToggleVisited={() => {}}
        onClose={() => {}}
        regions={{ regions: [], label: 'States', visited: new Set(), onToggle: () => {} }}
      />,
    )
    expect(screen.getByText('North America · 0 states')).toBeInTheDocument()
  })

  it('shows the capital, inhabitants and area, with the source', () => {
    show('Denmark')
    expect(fact('Capital')).toHaveTextContent('Copenhagen')
    expect(fact('Inhabitants')).toHaveTextContent(/^\d\.\d+M$/)
    expect(fact('Inhabitants')).toHaveAttribute('title', expect.stringMatching(/^\d\.\d+ million$/))
    expect(fact('Area')).toHaveTextContent('42,920 km²')
    expect(screen.getByText(/^Source: World Bank \(CC BY 4\.0\) · 20\d\d$/)).toBeInTheDocument()
  })

  it('shortens the biggest areas', () => {
    show('Argentina')
    expect(fact('Area')).toHaveTextContent('2.78M km²')
  })

  it('marks estimates and territories, and notes places without people', () => {
    show('Antarctica')
    expect(screen.getByText('(A) Selected territory')).toBeInTheDocument()
    expect(fact('Capital')).toHaveTextContent('None')
    expect(fact('Inhabitants')).toHaveTextContent('None')
    expect(screen.getByText(/No permanent population/)).toBeInTheDocument()
    expect(screen.getByText('Estimate')).toBeInTheDocument()
  })

  it('falls back to the size on the map when no area is known', () => {
    show('Siachen Glacier')
    expect(fact('Area')).toHaveTextContent(/^≈ [\d,]+ km²$/)
  })

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn()
    render(<CountryPanel country={byName('Denmark')} visited={false} onToggleVisited={() => {}} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('adds a country to the visited atlas', async () => {
    const onToggleVisited = vi.fn()
    render(<CountryPanel country={byName('Denmark')} visited={false} onToggleVisited={onToggleVisited} onClose={() => {}} />)
    const button = screen.getByRole('button', { name: 'Add to visited atlas' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(button)
    expect(onToggleVisited).toHaveBeenCalledOnce()
  })

  it('shows when a country is in the visited atlas', () => {
    render(<CountryPanel country={byName('Denmark')} visited onToggleVisited={() => {}} onClose={() => {}} />)
    expect(screen.getByRole('button', { name: 'In visited atlas' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('adds a place not visited yet to the wishlist, and shows when it is on it', async () => {
    const onToggleWish = vi.fn()
    const { rerender } = render(
      <CountryPanel country={byName('Peru')} visited={false} onToggleVisited={() => {}} onToggleWish={onToggleWish} onClose={() => {}} />,
    )
    const button = screen.getByRole('button', { name: 'Add to wishlist' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(button)
    expect(onToggleWish).toHaveBeenCalledOnce()

    rerender(<CountryPanel country={byName('Peru')} visited={false} wished onToggleVisited={() => {}} onToggleWish={onToggleWish} onClose={() => {}} />)
    expect(screen.getByRole('button', { name: 'On your wishlist' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('has no wishlist button once visited', () => {
    render(<CountryPanel country={byName('Peru')} visited onToggleVisited={() => {}} onToggleWish={() => {}} onClose={() => {}} />)
    expect(screen.queryByRole('button', { name: /wishlist/ })).not.toBeInTheDocument()
  })

  it('lists the visited cities, when given cities', () => {
    const cities = [{ id: 1, name: 'Copenhagen', place: 'DK', lat: 55.68, lng: 12.57, population: 1153615, capital: true as const }]
    const { rerender } = render(
      <CountryPanel country={byName('Denmark')} visited onToggleVisited={() => {}} onClose={() => {}} />,
    )
    expect(screen.queryByRole('region', { name: 'Visited cities' })).not.toBeInTheDocument()
    rerender(
      <CountryPanel
        country={byName('Denmark')}
        visited
        onToggleVisited={() => {}}
        onClose={() => {}}
        cities={{ cities, visited: new Set([1]), onToggle: () => {} }}
      />,
    )
    expect(screen.getByRole('region', { name: 'Visited cities' })).toHaveTextContent('Copenhagen')
  })
})

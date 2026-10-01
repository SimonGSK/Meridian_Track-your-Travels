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

  it('shows the name, and whether it is a country or a territory, and where', () => {
    show('Denmark')
    expect(screen.getByRole('heading', { name: 'Denmark' })).toBeInTheDocument()
    expect(screen.getByText('Country in Europe')).toBeInTheDocument()
  })

  it('shows the capital, population and area, with the source', () => {
    show('Denmark')
    expect(fact('Capital')).toHaveTextContent('Copenhagen')
    expect(fact('Population')).toHaveTextContent(/^\d\.\d+ million \(20\d\d\)$/)
    expect(fact('Area')).toHaveTextContent('42,920 km²')
    expect(screen.getByText('Source: World Bank (CC BY 4.0)')).toBeInTheDocument()
  })

  it('marks estimates, and notes places without people', () => {
    show('Antarctica')
    expect(screen.getByText('Territory in Antarctica')).toBeInTheDocument()
    expect(screen.queryByText('Capital')).not.toBeInTheDocument()
    expect(fact('Population')).toHaveTextContent('None')
    expect(screen.getByText(/No permanent population/)).toBeInTheDocument()
    expect(screen.getByText('Estimate')).toBeInTheDocument()
  })

  it('falls back to the size on the map when no area is known', () => {
    show('Siachen Glacier')
    expect(fact('Area')).toHaveTextContent(/^about [\d,]+ km²$/)
  })

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn()
    render(<CountryPanel country={byName('Denmark')} visited={false} onToggleVisited={() => {}} onClose={onClose} />)
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('marks a country as visited', async () => {
    const onToggleVisited = vi.fn()
    render(<CountryPanel country={byName('Denmark')} visited={false} onToggleVisited={onToggleVisited} onClose={() => {}} />)
    const button = screen.getByRole('button', { name: 'Mark as visited' })
    expect(button).toHaveAttribute('aria-pressed', 'false')
    await userEvent.click(button)
    expect(onToggleVisited).toHaveBeenCalledOnce()
  })

  it('shows when a country is visited', () => {
    render(<CountryPanel country={byName('Denmark')} visited onToggleVisited={() => {}} onClose={() => {}} />)
    expect(screen.getByRole('button', { name: 'Visited' })).toHaveAttribute('aria-pressed', 'true')
  })
})

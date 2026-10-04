import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VisitedTab from './VisitedTab'

describe('VisitedTab', () => {
  const show = (view: 'countries' | 'flights' | 'achievements', onViewChange = vi.fn()) =>
    render(
      <VisitedTab
        view={view}
        onViewChange={onViewChange}
        places={5}
        flights={1}
        earned={3}
        achievementCount={50}
        countries={<p>the countries</p>}
        flightsPanel={<p>the flights</p>}
        achievements={<p>the achievements</p>}
      />,
    )

  it('shows your countries, counting your places', () => {
    show('countries')
    expect(screen.getByRole('tab', { name: 'Countries' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('the countries')
    expect(screen.getByText('5 places')).toBeInTheDocument()
  })

  it('shows your flights, counting them', () => {
    show('flights')
    expect(screen.getByRole('tabpanel', { name: 'Flights' })).toHaveTextContent('the flights')
    expect(screen.getByText('1 flight')).toBeInTheDocument()
  })

  it('shows your achievements, counting those earned', () => {
    show('achievements')
    expect(screen.getByRole('tabpanel', { name: 'Achievements' })).toHaveTextContent('the achievements')
    expect(screen.getByText('3 / 50')).toBeInTheDocument()
  })

  it('switches between them', async () => {
    const onViewChange = vi.fn()
    show('countries', onViewChange)
    await userEvent.click(screen.getByRole('tab', { name: 'Flights' }))
    expect(onViewChange).toHaveBeenCalledWith('flights')
  })
})

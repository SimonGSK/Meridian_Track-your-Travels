import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VisitedTab, { type VisitedView } from './VisitedTab'

describe('VisitedTab', () => {
  const show = (view: VisitedView, onViewChange = vi.fn()) =>
    render(
      <VisitedTab
        view={view}
        onViewChange={onViewChange}
        places={5}
        flights={1}
        years={4}
        earned={3}
        achievementCount={50}
        countries={<p>the countries</p>}
        flightsPanel={<p>the flights</p>}
        yearsPanel={<p>the years</p>}
        friend="Anna"
        compare={<p>the comparison</p>}
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

  it('shows your years, counting those with dates', () => {
    show('years')
    expect(screen.getByRole('tabpanel', { name: 'Years' })).toHaveTextContent('the years')
    expect(screen.getByText('4 years')).toBeInTheDocument()
  })

  it('shows how you compare with a friend, named', () => {
    show('compare')
    expect(screen.getByRole('tabpanel', { name: 'Compare with a friend' })).toHaveTextContent('the comparison')
    expect(screen.getByRole('region', { name: 'Compare' })).toHaveTextContent('with Anna')
  })

  it('switches with symbols, each named when pointed at and read out', () => {
    show('countries')
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.getAttribute('aria-label'))).toEqual([
      'Countries',
      'Flights',
      'Years',
      'Achievements',
      'Compare with a friend',
    ])
    for (const tab of tabs) {
      expect(tab).toHaveAttribute('title', tab.getAttribute('aria-label'))
      expect(tab.querySelector('svg')).toBeInTheDocument()
      expect(tab).toHaveTextContent('')
    }
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

describe('VisitedTab, switched from elsewhere', () => {
  it('brings the switch back into view, but not when first shown', () => {
    const scrolled = vi.fn()
    HTMLElement.prototype.scrollIntoView = scrolled
    const props = {
      onViewChange: vi.fn(),
      places: 5,
      flights: 1,
      years: 4,
      earned: 3,
      achievementCount: 50,
      countries: null,
      flightsPanel: null,
      yearsPanel: null,
      achievements: null,
      friend: null,
      compare: null,
    }
    const { rerender } = render(<VisitedTab view="countries" {...props} />)
    expect(scrolled).not.toHaveBeenCalled()
    rerender(<VisitedTab view="achievements" {...props} />)
    expect(scrolled).toHaveBeenCalledWith({ block: 'nearest' })
  })
})

import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import StatsBox from './StatsBox'

describe('StatsBox', () => {
  it('shows each figure under its label', () => {
    render(<StatsBox label="Your flights" stats={[{ label: 'Flights', value: 12 }, { label: 'Distance', value: '84.3K km', title: 'In all' }]} />)
    const box = screen.getByLabelText('Your flights')
    expect([...box.querySelectorAll('dt')].map((dt) => dt.textContent)).toEqual(['Flights', 'Distance'])
    expect(within(box).getByText('84.3K km')).toHaveAttribute('title', 'In all')
  })

  it('shows what a figure is out of, smaller, after it', () => {
    render(<StatsBox label="Your atlas" stats={[{ label: 'Countries', value: 12, of: 197 }, { label: 'Cities', value: 0 }]} />)
    const [countries, cities] = screen.getByLabelText('Your atlas').querySelectorAll('dd')
    expect(countries).toHaveTextContent('12 / 197')
    expect(countries.querySelector('.stat-of')).toHaveTextContent('/ 197')
    expect(cities).toHaveTextContent(/^0$/)
  })
})

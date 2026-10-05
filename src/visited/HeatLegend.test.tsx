import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import HeatLegend from './HeatLegend'

describe('HeatLegend', () => {
  it('shows a shade for 1, 2, 3 and 4 or more visits', () => {
    render(<HeatLegend colors={['#111111', '#222222', '#333333', '#444444']} />)
    expect(screen.getByRole('figure', { name: 'Visits' })).toBeInTheDocument()
    const steps = within(screen.getByRole('list', { name: 'Visits, from one to many' })).getAllByRole('listitem')
    expect(steps.map((li) => li.textContent)).toEqual(['1', '2', '3', '4+'])
    expect(steps[3].querySelector('.heat-swatch')).toHaveStyle({ background: '#444444' })
  })
})

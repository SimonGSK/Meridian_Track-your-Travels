import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import GlobeKey from './GlobeKey'

describe('GlobeKey', () => {
  it('shows each color with what it means', () => {
    render(
      <GlobeKey
        title="Visits"
        items={[
          { label: '1', color: '#111111' },
          { label: '4+', color: '#444444' },
        ]}
      />,
    )
    expect(screen.getByRole('figure', { name: 'Visits' })).toBeInTheDocument()
    const items = within(screen.getByRole('list', { name: 'Visits: 1, 4+' })).getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual(['1', '4+'])
    expect(items[1].querySelector('.key-swatch')).toHaveStyle({ background: '#444444' })
  })
})

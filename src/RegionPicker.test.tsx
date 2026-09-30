import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import RegionPicker from './RegionPicker'
import { countries } from './countries'
import { loadRegions, regionsOf } from './data/regions'

const all = await loadRegions()
const us = regionsOf(all, countries.find((c) => c.properties.name === 'United States')!)
const australia = regionsOf(all, countries.find((c) => c.properties.name === 'Australia')!)

function setup(visited: string[] = [], regions = us) {
  const onToggle = vi.fn()
  render(<RegionPicker regions={regions} label="States" visited={new Set(visited)} onToggle={onToggle} />)
  return onToggle
}

describe('RegionPicker', () => {
  it('shows how many are visited', () => {
    setup(['US-CA', 'US-TX'])
    expect(screen.getByText('of 51 visited')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'States visited' })).toHaveAttribute('aria-valuenow', '2')
  })

  it('ticks off visited regions', () => {
    setup(['US-CA'])
    expect(screen.getByRole('checkbox', { name: 'California' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Texas' })).not.toBeChecked()
  })

  it('toggles a region', async () => {
    const onToggle = setup()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Texas' }))
    expect(onToggle).toHaveBeenCalledWith(us.find((r) => r.properties.name === 'Texas'))
  })

  it('filters long lists, ignoring accents', async () => {
    setup()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Filter states' }), 'new')
    expect(screen.getAllByRole('checkbox').map((c) => c.closest('label')!.textContent)).toEqual([
      'New Hampshire',
      'New Jersey',
      'New Mexico',
      'New York',
    ])
  })

  it('has no filter for short lists', () => {
    setup([], australia)
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  it('says when regions are still loading', () => {
    render(<RegionPicker regions={null} label="States" visited={new Set()} onToggle={() => {}} />)
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })
})

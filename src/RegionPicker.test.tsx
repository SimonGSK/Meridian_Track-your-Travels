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
const openList = () => userEvent.click(screen.getByRole('button', { name: /explored$/ }))

describe('RegionPicker', () => {
  it('says how many are explored, and which', () => {
    setup(['US-TX', 'US-CA'])
    expect(screen.getByRole('button', { name: '2 of 51 states explored' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText(/California, Texas/)).toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('opens the list, ticking off the visited ones', async () => {
    setup(['US-CA'])
    await openList()
    expect(screen.getByRole('checkbox', { name: 'California' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Texas' })).not.toBeChecked()
    expect(screen.getByRole('progressbar', { name: 'States visited' })).toHaveAttribute('aria-valuenow', '1')
  })

  it('toggles a region', async () => {
    const onToggle = setup()
    await openList()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Texas' }))
    expect(onToggle).toHaveBeenCalledWith(us.find((r) => r.properties.name === 'Texas'))
  })

  it('filters long lists, ignoring accents', async () => {
    setup()
    await openList()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Filter states' }), 'new')
    expect(screen.getAllByRole('checkbox').map((c) => c.closest('label')!.textContent)).toEqual([
      'New Hampshire',
      'New Jersey',
      'New Mexico',
      'New York',
    ])
  })

  it('has no filter for short lists', async () => {
    setup([], australia)
    await openList()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  it('says when regions are still loading', () => {
    render(<RegionPicker regions={null} label="States" visited={new Set()} onToggle={() => {}} />)
    expect(screen.getByText('Loading states…')).toBeInTheDocument()
  })
})
